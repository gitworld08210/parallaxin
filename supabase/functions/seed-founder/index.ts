// Bootstrap seed for the initial Founder Office account.
// - Idempotent: refuses to run if any founder employee already exists.
// - Generates a cryptographically random temporary password.
// - Returns the temp password EXACTLY ONCE in the response body.
// - After the first founder exists, this function is sealed and returns 409.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FOUNDER_EMAIL = "adit08210@aurelix.com";
const FOUNDER_DEPT_KEY = "founder_office";
const FOUNDER_ROLE_KEY = "founder";
const FOUNDER_LEVEL = "L7";

function generateTempPassword(length = 20): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up department and role
    const { data: dept, error: deptErr } = await admin
      .from("admin_departments")
      .select("id")
      .eq("key", FOUNDER_DEPT_KEY)
      .maybeSingle();
    if (deptErr || !dept) {
      return new Response(
        JSON.stringify({ error: "Founder Office department not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: role, error: roleErr } = await admin
      .from("admin_roles")
      .select("id")
      .eq("key", FOUNDER_ROLE_KEY)
      .maybeSingle();
    if (roleErr || !role) {
      return new Response(
        JSON.stringify({ error: "Founder role not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Refuse if any active founder already exists (bootstrap is one-shot).
    const { count: existingFounders } = await admin
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("department_id", dept.id)
      .eq("employment_status", "active");

    if ((existingFounders ?? 0) > 0) {
      return new Response(
        JSON.stringify({
          error:
            "Founder Office already initialised. New Founder accounts must be created by an existing active Founder.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Also refuse if the target email already has an employee row
    const { data: existingEmp } = await admin
      .from("employees")
      .select("id")
      .eq("company_email", FOUNDER_EMAIL)
      .maybeSingle();
    if (existingEmp) {
      return new Response(
        JSON.stringify({ error: "Employee already exists for this email." }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tempPassword = generateTempPassword(20);

    // Create or fetch the auth user
    let userId: string | null = null;
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: FOUNDER_EMAIL,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: "Founder",
          requires_password_change: true,
        },
      });

    if (createErr) {
      // If the user already exists in auth, look them up and reset password
      const { data: list } = await admin.auth.admin.listUsers();
      const found = list?.users.find(
        (u) => u.email?.toLowerCase() === FOUNDER_EMAIL,
      );
      if (!found) {
        return new Response(
          JSON.stringify({ error: createErr.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      userId = found.id;
      await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
      });
    } else {
      userId = created.user.id;
    }

    // Insert employee row
    const employeeNumber = `AUR-FND-${Date.now().toString().slice(-6)}`;
    const { error: empErr } = await admin.from("employees").insert({
      user_id: userId,
      employee_number: employeeNumber,
      full_name: "Founder",
      company_email: FOUNDER_EMAIL,
      department_id: dept.id,
      role_id: role.id,
      user_type: "employee",
      level: FOUNDER_LEVEL,
      employment_status: "active",
      requires_password_change: true,
      requires_2fa_setup: true,
      joining_date: new Date().toISOString().slice(0, 10),
    });
    if (empErr) {
      return new Response(
        JSON.stringify({ error: `employees insert: ${empErr.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Grant admin app_role so RLS admin policies apply
    await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" })
      .select();

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          "Founder Office seed account created. Store this password securely — it will not be shown again. The Founder must change it on first login.",
        email: FOUNDER_EMAIL,
        temp_password: tempPassword,
        user_id: userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
