import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2.9.7';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !data?.claims) return json({ error: 'Unauthorized' }, 401);

    const userId = data.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const { room, role, identity, name } = body as {
      room?: string; role?: 'host' | 'viewer'; identity?: string; name?: string;
    };
    if (!room || !role) return json({ error: 'room and role required' }, 400);

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const wsUrl = Deno.env.get('LIVEKIT_WS_URL');
    if (!apiKey || !apiSecret || !wsUrl) return json({ error: 'LiveKit not configured' }, 500);

    // Verify host ownership server-side; ignore client-supplied identity to prevent spoofing.
    if (role === 'host') {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: stream } = await admin
        .from('live_streams')
        .select('host_id')
        .eq('livekit_room', room)
        .maybeSingle();
      if (!stream || stream.host_id !== userId) {
        return json({ error: 'Forbidden: not the stream host' }, 403);
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: name || userId.slice(0, 8),
      ttl: '2h',
    });
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: role === 'host',
      canPublishData: true,
      canSubscribe: true,
    });
    const token = await at.toJwt();
    return json({ token, wsUrl, room });
  } catch (e) {
    console.error('livekit-token error', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
