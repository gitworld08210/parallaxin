import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const EMBED_MODEL = 'openai/text-embedding-3-small';
const CHAT_MODEL = 'openai/gpt-5.6-sol';

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

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { conversationId, messages, collectionId, documentIds } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUser) return new Response(JSON.stringify({ error: 'no user message' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // 1) Embed the query
    const embedResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: String(lastUser.content).slice(0, 4000) }),
    });
    if (!embedResp.ok) {
      const t = await embedResp.text();
      return new Response(JSON.stringify({ error: `Embedding error: ${t.slice(0,200)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const embedJson = await embedResp.json();
    const queryEmbedding = embedJson.data[0].embedding;

    // 2) Retrieve top chunks via RPC (uses user client so RLS applies)
    const { data: matches, error: matchErr } = await userClient.rpc('kip_match_chunks', {
      query_embedding: queryEmbedding,
      match_count: 8,
      filter_collection_ids: collectionId ? [collectionId] : null,
      filter_document_ids: documentIds?.length ? documentIds : null,
    });
    if (matchErr) {
      return new Response(JSON.stringify({ error: 'Retrieval failed: ' + matchErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const chunks = matches ?? [];

    // Fetch document titles for citations
    const docIds = [...new Set(chunks.map((c: any) => c.document_id))];
    const { data: docs } = docIds.length
      ? await userClient.from('kip_documents').select('id,title,current_version').in('id', docIds)
      : { data: [] as any[] };
    const docMap = new Map((docs ?? []).map((d: any) => [d.id, d]));

    const contextBlock = chunks.length
      ? chunks.map((c: any, i: number) => {
          const doc = docMap.get(c.document_id);
          return `[Source ${i + 1}] ${doc?.title ?? 'Untitled'} (v${doc?.current_version ?? 1})${c.section ? ' — ' + c.section : ''}\n${c.content}`;
        }).join('\n\n---\n\n')
      : '(No matching company knowledge found.)';

    const system = {
      role: 'system',
      content: `You are Aurelix KIP — the Knowledge Intelligence Platform assistant.

STRICT RULES:
- Answer ONLY using the provided company knowledge sources below.
- If the sources do not contain the answer, say "I could not find this in the available company knowledge." Do NOT invent facts.
- Always cite sources inline using [Source N] notation matching the numbered sources.
- Prefer concise, executive-grade summaries. Use bullets and short paragraphs.
- Never claim to have executed any action. You are advisory only.
- End every substantive answer with a "Confidence: low|medium|high" line.

COMPANY KNOWLEDGE SOURCES:
${contextBlock}`,
    };

    const safeMsgs = messages.slice(-20).filter((m: any) => m.role === 'user' || m.role === 'assistant').map((m: any) => ({
      role: m.role, content: String(m.content ?? '').slice(0, 6000),
    }));

    // 3) Stream chat completion
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: CHAT_MODEL, stream: true, reasoning_effort: 'none', messages: [system, ...safeMsgs] }),
    });
    if (resp.status === 429) return new Response(JSON.stringify({ error: 'Rate limit — try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!resp.ok || !resp.body) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: t.slice(0, 300) || 'AI error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4) Tee stream: forward to client, capture full text for persistence
    const [forward, capture] = resp.body.tee();
    (async () => {
      try {
        const reader = capture.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() ?? '';
          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) fullText += delta;
            } catch {}
          }
        }
        // Persist user message + assistant reply + citations
        if (conversationId) {
          await admin.from('kip_conversation_messages').insert({
            conversation_id: conversationId, role: 'user', content: lastUser.content,
          });
          const { data: asstMsg } = await admin.from('kip_conversation_messages').insert({
            conversation_id: conversationId, role: 'assistant', content: fullText,
            metadata: { source_count: chunks.length },
          }).select('id').single();
          if (asstMsg && chunks.length) {
            const citeRows = chunks.map((c: any) => {
              const doc = docMap.get(c.document_id);
              return {
                message_id: asstMsg.id,
                document_id: c.document_id,
                chunk_id: c.id,
                section: c.section,
                version_number: doc?.current_version ?? null,
                relevance: c.similarity,
                snippet: String(c.content).slice(0, 400),
              };
            });
            await admin.from('kip_citations').insert(citeRows);
          }
          await admin.from('kip_conversations').update({
            last_message_at: new Date().toISOString(),
          }).eq('id', conversationId);
          await admin.from('admin_audit_logs').insert({
            action: 'kip.chat.query', resource_type: 'kip_conversation', resource_id: conversationId,
            user_id: userData.user.id, details: { sources: chunks.length }, severity: 'info',
          } as any);
        }
      } catch (err) {
        console.error('KIP persist error', err);
      }
    })();

    // Send citation metadata as a custom header so the client can render source list
    const citationsHeader = JSON.stringify(chunks.map((c: any, i: number) => {
      const doc = docMap.get(c.document_id);
      return {
        index: i + 1,
        document_id: c.document_id,
        title: doc?.title ?? 'Untitled',
        version: doc?.current_version ?? 1,
        section: c.section,
        similarity: c.similarity,
        snippet: String(c.content).slice(0, 200),
      };
    }));

    return new Response(forward, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Kip-Citations': citationsHeader,
        'Access-Control-Expose-Headers': 'X-Kip-Citations',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
