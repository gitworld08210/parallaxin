import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, conversationId, model = 'google/gemini-2.5-flash', context } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages must be an array' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const MAX_MESSAGES = 40;
    const MAX_CONTENT_LEN = 8000;
    const safeMessages = messages
      .slice(-MAX_MESSAGES)
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m: any) => ({ role: m.role, content: String(m.content ?? '').slice(0, MAX_CONTENT_LEN) }));

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const system = {
      role: 'system',
      content: `You are Aurelix Executive AI — an advisory copilot for Founder Office of Aurelix Admin OS.

Your role:
- Analyze company data, identify trends, detect risks, generate insights.
- Answer executive questions clearly and concisely.
- Recommend actions with reasoning, supporting data, and confidence level.
- Generate summaries for reports, decisions, incidents and performance.

Governance rules (STRICT):
- You are advisory only. You NEVER approve, reject, execute or override executive decisions.
- You NEVER fabricate data. If you do not have data, say so and suggest where to look.
- You always distinguish forecasts from confirmed facts.
- Every recommendation must include reasoning, supporting data (or "no data provided"), and a confidence level (low / medium / high).
- You respect user permissions. If a question requires data the user has not authorized, say so.
- You never claim to have executed an operational action; only Founder Office can execute actions.

Response style:
- Concise, structured, executive-grade.
- Use short paragraphs, bullet points and clear headings when useful.
- Always finish recommendations with a "Confidence" line and a "Supporting data" line.

${context ? `\nCurrent context provided by the user:\n${String(context).slice(0, 4000)}` : ''}`,
    };

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [system, ...safeMessages],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit hit, try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in Settings.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!resp.ok || !resp.body) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: text || 'AI error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit log (fire & forget)
    supabase.from('admin_audit_logs').insert({
      action: 'ai.query', resource_type: 'executive_ai_conversation',
      resource_id: conversationId ?? null, user_id: userData.user.id,
      details: { model, message_count: safeMessages.length }, severity: 'info',
    } as any).then(() => {});

    return new Response(resp.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
