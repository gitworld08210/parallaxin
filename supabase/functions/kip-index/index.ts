import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EMBED_MODEL = 'openai/text-embedding-3-small';
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    let slice = clean.slice(i, end);
    // Try to end on a paragraph or sentence boundary
    if (end < clean.length) {
      const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '));
      if (lastBreak > CHUNK_SIZE * 0.5) slice = slice.slice(0, lastBreak + 1);
    }
    chunks.push(slice.trim());
    i += slice.length - CHUNK_OVERLAP;
    if (slice.length <= CHUNK_OVERLAP) i = end;
  }
  return chunks.filter(Boolean);
}

async function extractText(buffer: ArrayBuffer, fileType: string): Promise<string> {
  const type = (fileType || '').toLowerCase();
  const bytes = new Uint8Array(buffer);
  const asText = () => new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (type.includes('text') || type.includes('markdown') || type.includes('json') || type.includes('csv')) {
    return asText();
  }
  // Fallback: return decoded bytes with binary chars stripped
  const raw = asText();
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { documentId } = await req.json();
    if (!documentId) return new Response(JSON.stringify({ error: 'documentId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Verify user can edit doc via user client (RLS)
    const { data: doc, error: docErr } = await userClient.from('kip_documents').select('*').eq('id', documentId).maybeSingle();
    if (docErr || !doc) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await admin.from('kip_documents').update({ status: 'indexing', indexing_error: null }).eq('id', documentId);

    let text = '';
    if (doc.file_path) {
      const dl = await admin.storage.from('kip-documents').download(doc.file_path);
      if (dl.error || !dl.data) throw new Error('Download failed: ' + (dl.error?.message ?? 'no data'));
      const buf = await dl.data.arrayBuffer();
      text = await extractText(buf, doc.file_type || '');
    } else if (doc.metadata?.raw_text) {
      text = String(doc.metadata.raw_text);
    }
    if (!text.trim()) {
      await admin.from('kip_documents').update({ status: 'failed', indexing_error: 'No extractable text' }).eq('id', documentId);
      return new Response(JSON.stringify({ error: 'No extractable text' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const chunks = chunkText(text);
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

    // Delete previous chunks
    await admin.from('kip_document_chunks').delete().eq('document_id', documentId);

    // Batch embeddings (max 96 per request to be safe)
    const BATCH = 64;
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: EMBED_MODEL, input: batch }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Embeddings failed (${resp.status}): ${t.slice(0, 200)}`);
      }
      const json = await resp.json();
      const rows = json.data.map((d: any, idx: number) => ({
        document_id: documentId,
        collection_id: doc.collection_id,
        chunk_index: i + idx,
        content: batch[idx],
        token_count: Math.round(batch[idx].length / 4),
        embedding: d.embedding,
      }));
      const { error: insErr } = await admin.from('kip_document_chunks').insert(rows);
      if (insErr) throw insErr;
      inserted += rows.length;
    }

    await admin.from('kip_documents').update({
      status: 'indexed',
      chunk_count: inserted,
      content_preview: text.slice(0, 500),
      indexed_at: new Date().toISOString(),
      indexing_error: null,
    }).eq('id', documentId);

    // Audit
    admin.from('admin_audit_logs').insert({
      action: 'kip.document.indexed', resource_type: 'kip_document', resource_id: documentId,
      user_id: userData.user.id, details: { chunks: inserted }, severity: 'info',
    } as any).then(() => {});

    return new Response(JSON.stringify({ ok: true, chunks: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const body = await req.clone().json().catch(() => ({}));
      if (body.documentId) {
        await admin.from('kip_documents').update({ status: 'failed', indexing_error: msg }).eq('id', body.documentId);
      }
    } catch {}
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
