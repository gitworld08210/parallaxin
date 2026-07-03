import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const phoneToEmail = (p: string) => `phone_${p.replace(/^\+/, '')}@phone.aurelix.local`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { phone, code } = await req.json();
    if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone) || !code || !/^\d{4,8}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid phone or code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const syntheticEmail = phoneToEmail(phone);

    // Find existing user by synthetic email
    let userId: string | null = null;
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list.data?.users?.find((u: any) => u.email === syntheticEmail);
    if (existing) userId = existing.id;

    const tempPassword = crypto.randomUUID() + 'Aa1!';

    if (!userId) {
      const created = await admin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        password: tempPassword,
        user_metadata: { signup_method: 'phone', phone },
      });
      if (created.error) throw created.error;
      userId = created.data.user!.id;
    } else {
      const upd = await admin.auth.admin.updateUserById(userId, { password: tempPassword });
      if (upd.error) throw upd.error;
    }

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const signIn = await anon.auth.signInWithPassword({ email: syntheticEmail, password: tempPassword });
    // Rotate to a random unknown value so this password can't be reused
    await admin.auth.admin.updateUserById(userId!, { password: crypto.randomUUID() + crypto.randomUUID() });
    if (signIn.error) throw signIn.error;

    return new Response(JSON.stringify({ session: signIn.data.session, user: signIn.data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
