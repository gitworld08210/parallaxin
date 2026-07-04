import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone, code } = await req.json();
    if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone) || !code || !/^\d{4,8}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid phone or code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Identify caller from JWT
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userRes.user.id;

    // Verify OTP with Twilio
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const token = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const svc = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!;
    const vres = await fetch(`https://verify.twilio.com/v2/Services/${svc}/VerificationCheck`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    });
    const vdata = await vres.json();
    if (!vres.ok || vdata.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure the new phone isn't already tied to another user
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const conflict = list.data?.users?.find((u: any) => u.phone === phone.replace(/^\+/, '') && u.id !== userId);
    if (conflict) {
      return new Response(JSON.stringify({ error: 'This phone is already in use by another account' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upd = await admin.auth.admin.updateUserById(userId, {
      phone,
      phone_confirm: true,
    } as any);
    if (upd.error) throw upd.error;

    return new Response(JSON.stringify({ ok: true, phone }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
