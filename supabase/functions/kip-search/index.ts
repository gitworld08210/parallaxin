import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EMBED_MODEL = 'openai/text-embedding-3-small';

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
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { query, collectionIds, documentIds, limit } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const embedResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: query.slice(0, 4000) }),
    });
    if (!embedResp.ok) {
      const t = await embedResp.text();
      return new Response(JSON.stringify({ error: t.slice(0, 200) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const embedJson = await embedResp.json();
    const queryEmbedding = embedJson.data[0].embedding;

    const { data: matches, error } = await userClient.rpc('kip_match_chunks', {
      query_embedding: queryEmbedding,
      match_count: Math.min(Math.max(limit ?? 12, 1), 25),
      filter_collection_ids: collectionIds?.length ? collectionIds : null,
      filter_document_ids: documentIds?.length ? documentIds : null,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const docIds = [...new Set((matches ?? []).map((m: any) => m.document_id))];
    const { data: docs } = docIds.length
      ? await userClient.from('kip_documents').select('id,title,current_version,collection_id,document_type').in('id', docIds)
      : { data: [] as any[] };
    const docMap = new Map((docs ?? []).map((d: any) => [d.id, d]));
    const results = (matches ?? []).map((m: any) => ({ ...m, document: docMap.get(m.document_id) ?? null }));

    // Log search
    await userClient.from('kip_search_history').insert({
      user_id: userData.user.id, query, collection_id: collectionIds?.[0] ?? null, result_count: results.length,
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
