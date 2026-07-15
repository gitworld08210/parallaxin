/**
 * Onboarding hooks — HR/Founder Office only (RLS-enforced).
 *
 * Every mutation writes an `admin_audit_logs` row so every onboarding
 * action is traceable end-to-end.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export type OnboardingStage =
  | "draft"
  | "hr_review"
  | "background_check"
  | "account_provisioning"
  | "credentials_generated"
  | "welcome_sent"
  | "awaiting_first_login"
  | "completed"
  | "cancelled";

export interface OnboardingSession {
  id: string;
  employee_id: string;
  stage: OnboardingStage;
  hr_owner_user_id: string | null;
  joining_date: string | null;
  background_check_required: boolean;
  background_check_cleared_at: string | null;
  hr_notes: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    full_name: string;
    company_email: string;
    employee_number: string;
    employment_status: string;
    joining_date: string | null;
    photo_url: string | null;
    department: { id: string; name: string } | null;
    role: { id: string; name: string } | null;
    reporting_manager: { id: string; full_name: string } | null;
  };
}

const AUDIT = async (params: {
  actorId: string | null;
  action: string;
  employeeId: string;
  before?: unknown;
  after?: unknown;
}) => {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: params.actorId,
    module: "people_ops",
    action: params.action,
    target_type: "employee",
    target_id: params.employeeId,
    before: (params.before as any) ?? null,
    after: (params.after as any) ?? null,
  });
};

// --------- List queue ---------
export const useOnboardingQueue = (stage?: OnboardingStage | "all") =>
  useQuery({
    queryKey: ["admin-os", "onboarding", "queue", stage ?? "all"],
    queryFn: async (): Promise<OnboardingSession[]> => {
      let q = supabase
        .from("onboarding_sessions")
        .select(
          `id, employee_id, stage, hr_owner_user_id, joining_date,
           background_check_required, background_check_cleared_at, hr_notes,
           activated_at, created_at, updated_at,
           employee:employees!onboarding_sessions_employee_id_fkey(
             id, full_name, company_email, employee_number,
             employment_status, joining_date, photo_url, reporting_manager_id,
             department:admin_departments!employees_department_id_fkey(id,name),
             role:admin_roles!employees_role_id_fkey(id,name)
           )`,
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (stage && stage !== "all") q = q.eq("stage", stage);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OnboardingSession[];
    },
  });

export const useOnboardingSession = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "onboarding", "session", employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<OnboardingSession | null> => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("onboarding_sessions")
        .select(
          `id, employee_id, stage, hr_owner_user_id, joining_date,
           background_check_required, background_check_cleared_at, hr_notes,
           activated_at, created_at, updated_at,
           employee:employees!onboarding_sessions_employee_id_fkey(
             id, full_name, company_email, employee_number,
             employment_status, joining_date, photo_url, reporting_manager_id,
             department:admin_departments!employees_department_id_fkey(id,name),
             role:admin_roles!employees_role_id_fkey(id,name)
           )`,
        )
        .eq("employee_id", employeeId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OnboardingSession | null;
    },
  });

// --------- Start onboarding (create employee + session + default checklist) ---------
export interface StartOnboardingInput {
  full_name: string;
  company_email: string;
  department_id: string;
  role_id: string;
  level?: string | null;
  joining_date?: string | null;
  reporting_manager_id?: string | null;
  background_check_required?: boolean;
}

const HR_CHECKLIST: { key: string; label: string; order: number }[] = [
  { key: "documents_verified", label: "Documents verified", order: 10 },
  { key: "department_assigned", label: "Department assigned", order: 20 },
  { key: "role_assigned", label: "Role assigned", order: 30 },
  { key: "manager_assigned", label: "Reporting manager assigned", order: 40 },
  { key: "passport_created", label: "Employee passport created", order: 50 },
  { key: "welcome_email_sent", label: "Welcome email sent", order: 60 },
  { key: "employee_activated", label: "Employee activated", order: 70 },
];

const EMP_CHECKLIST: { key: string; label: string; order: number }[] = [
  { key: "password_changed", label: "Change temporary password", order: 10 },
  { key: "twofa_enabled", label: "Enable two-factor authentication", order: 20 },
  { key: "profile_completed", label: "Complete profile", order: 30 },
  { key: "policies_accepted", label: "Accept company policies", order: 40 },
];

export const useStartOnboarding = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: StartOnboardingInput) => {
      // 1. Generate employee number
      const { data: numData, error: numErr } = await supabase.rpc(
        "generate_employee_number" as any,
      );
      if (numErr) throw numErr;
      const employee_number = numData as unknown as string;

      // 2. Create employee (pre_onboarding)
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .insert({
          full_name: input.full_name,
          company_email: input.company_email,
          employee_number,
          department_id: input.department_id,
          role_id: input.role_id,
          user_type: "employee",
          employment_status: "pre_onboarding",
          level: input.level || null,
          joining_date: input.joining_date || null,
          reporting_manager_id: input.reporting_manager_id || null,
          passport_id: `PASSPORT-${employee_number}`,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (empErr) throw empErr;

      // 3. Create onboarding session
      const { data: session, error: sessErr } = await supabase
        .from("onboarding_sessions")
        .insert({
          employee_id: emp.id,
          stage: "hr_review",
          hr_owner_user_id: user?.id ?? null,
          joining_date: input.joining_date || null,
          background_check_required: !!input.background_check_required,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (sessErr) throw sessErr;

      // 4. Seed checklists
      const items = [
        ...HR_CHECKLIST.map((c) => ({
          employee_id: emp.id,
          session_id: session.id,
          owner: "hr" as const,
          item_key: c.key,
          label: c.label,
          sort_order: c.order,
        })),
        ...EMP_CHECKLIST.map((c) => ({
          employee_id: emp.id,
          session_id: session.id,
          owner: "employee" as const,
          item_key: c.key,
          label: c.label,
          sort_order: c.order,
        })),
      ];
      const { error: chErr } = await supabase
        .from("employee_onboarding_checklist")
        .insert(items);
      if (chErr) throw chErr;

      // 5. Manager history seed
      if (input.reporting_manager_id) {
        await supabase.from("employee_manager_history").insert({
          employee_id: emp.id,
          previous_manager_id: null,
          new_manager_id: input.reporting_manager_id,
          reason: "initial assignment",
          changed_by: user?.id ?? null,
        });
      }

      await AUDIT({
        actorId: user?.id ?? null,
        action: "onboarding.started",
        employeeId: emp.id,
        after: { session_id: session.id, employee_number },
      });

      return { employee: emp, session };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-os", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employees"] });
    },
  });
};

// --------- Assign / update manager ---------
export const useAssignManager = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      previous_manager_id: string | null;
      new_manager_id: string | null;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("employees")
        .update({ reporting_manager_id: input.new_manager_id })
        .eq("id", input.employee_id);
      if (error) throw error;

      await supabase.from("employee_manager_history").insert({
        employee_id: input.employee_id,
        previous_manager_id: input.previous_manager_id,
        new_manager_id: input.new_manager_id,
        reason: input.reason ?? null,
        changed_by: user?.id ?? null,
      });

      await AUDIT({
        actorId: user?.id ?? null,
        action: "onboarding.manager_assigned",
        employeeId: input.employee_id,
        before: { manager_id: input.previous_manager_id },
        after: { manager_id: input.new_manager_id, reason: input.reason },
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-os", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employee-detail", v.employee_id] });
    },
  });
};

// --------- Update stage ---------
export const useUpdateStage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      employee_id: string;
      from: OnboardingStage;
      to: OnboardingStage;
    }) => {
      const { error } = await supabase
        .from("onboarding_sessions")
        .update({ stage: input.to })
        .eq("id", input.session_id);
      if (error) throw error;
      await AUDIT({
        actorId: user?.id ?? null,
        action: "onboarding.stage_changed",
        employeeId: input.employee_id,
        before: { stage: input.from },
        after: { stage: input.to },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "onboarding"] }),
  });
};

// --------- Checklist ---------
export interface ChecklistItem {
  id: string;
  employee_id: string;
  owner: "hr" | "employee";
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  note: string | null;
  sort_order: number;
}

export const useChecklist = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "onboarding", "checklist", employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<ChecklistItem[]> => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("employee_onboarding_checklist")
        .select("id, employee_id, owner, item_key, label, completed, completed_at, note, sort_order")
        .eq("employee_id", employeeId)
        .order("owner")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
  });

export const useToggleChecklistItem = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; employee_id: string; completed: boolean; item_key: string }) => {
      const { error } = await supabase
        .from("employee_onboarding_checklist")
        .update({
          completed: input.completed,
          completed_at: input.completed ? new Date().toISOString() : null,
          completed_by: input.completed ? user?.id ?? null : null,
        })
        .eq("id", input.id);
      if (error) throw error;
      await AUDIT({
        actorId: user?.id ?? null,
        action: `onboarding.checklist.${input.completed ? "checked" : "unchecked"}`,
        employeeId: input.employee_id,
        after: { item_key: input.item_key },
      });
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: ["admin-os", "onboarding", "checklist", v.employee_id] }),
  });
};

// --------- Temporary password ---------
export interface IssuedCredential {
  employee_id: string;
  employee_number: string;
  company_email: string;
  temporary_password: string;
  expires_at: string;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  const specials = "!@#$%&*";
  let out = "";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 14; i++) out += chars[arr[i] % chars.length];
  out += specials[Math.floor(Math.random() * specials.length)];
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useIssueTemporaryPassword = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      employee_number: string;
      company_email: string;
      session_id: string;
    }): Promise<IssuedCredential> => {
      const temp = generateTempPassword();
      const hash = await sha256Hex(temp);
      const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("employee_credential_issuances")
        .insert({
          employee_id: input.employee_id,
          password_hash: hash,
          expires_at: expires,
          issued_by: user?.id ?? null,
        });
      if (error) throw error;

      await supabase
        .from("onboarding_sessions")
        .update({ stage: "credentials_generated" })
        .eq("id", input.session_id);

      await AUDIT({
        actorId: user?.id ?? null,
        action: "onboarding.credentials_generated",
        employeeId: input.employee_id,
        after: { expires_at: expires },
      });

      return {
        employee_id: input.employee_id,
        employee_number: input.employee_number,
        company_email: input.company_email,
        temporary_password: temp,
        expires_at: expires,
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "onboarding"] }),
  });
};

// --------- Welcome email ---------
export const useSendWelcomeEmail = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      session_id: string;
      sent_to: string;
      subject: string;
      body: string;
      full_name?: string;
      company_email?: string;
      temp_password?: string;
      position?: string;
      department?: string;
      joining_date?: string;
    }) => {
      const { error } = await supabase.from("welcome_email_history").insert({
        employee_id: input.employee_id,
        session_id: input.session_id,
        sent_to: input.sent_to,
        subject: input.subject,
        body: input.body,
        sent_by: user?.id ?? null,
      });
      if (error) throw error;

      // Fire the actual branded welcome email via hr@parallaxai.in
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "hr-welcome",
            recipientEmail: input.sent_to,
            idempotencyKey: `hr-welcome-${input.session_id}`,
            templateData: {
              fullName: input.full_name,
              companyEmail: input.company_email ?? input.sent_to,
              tempPassword: input.temp_password,
              loginUrl: `${window.location.origin}/auth`,
              position: input.position,
              department: input.department,
              joiningDate: input.joining_date,
            },
          },
        });
      } catch (e) {
        console.error("Welcome email dispatch failed", e);
      }

      await supabase
        .from("onboarding_sessions")
        .update({ stage: "welcome_sent" })
        .eq("id", input.session_id);

      await supabase
        .from("employee_onboarding_checklist")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user?.id ?? null,
        })
        .eq("employee_id", input.employee_id)
        .eq("owner", "hr")
        .eq("item_key", "welcome_email_sent");

      await AUDIT({
        actorId: user?.id ?? null,
        action: "onboarding.welcome_email_sent",
        employeeId: input.employee_id,
        after: { to: input.sent_to },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-os", "onboarding"] }),
  });
};

// --------- Activate ---------
export const useActivateEmployee = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; session_id: string }) => {
      const { error: empErr } = await supabase
        .from("employees")
        .update({ employment_status: "active" })
        .eq("id", input.employee_id);
      if (empErr) throw empErr;

      const { error: sessErr } = await supabase
        .from("onboarding_sessions")
        .update({ stage: "completed", activated_at: new Date().toISOString() })
        .eq("id", input.session_id);
      if (sessErr) throw sessErr;

      await supabase
        .from("employee_onboarding_checklist")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user?.id ?? null,
        })
        .eq("employee_id", input.employee_id)
        .eq("owner", "hr")
        .eq("item_key", "employee_activated");

      await AUDIT({
        actorId: user?.id ?? null,
        action: "onboarding.employee_activated",
        employeeId: input.employee_id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-os", "onboarding"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employees"] });
    },
  });
};

// --------- History readers ---------
export const useWelcomeEmailHistory = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "onboarding", "welcome-history", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("welcome_email_history")
        .select("id, sent_to, subject, sent_at, sent_by")
        .eq("employee_id", employeeId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useManagerHistory = (employeeId: string | undefined) =>
  useQuery({
    queryKey: ["admin-os", "onboarding", "manager-history", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("employee_manager_history")
        .select(
          `id, previous_manager_id, new_manager_id, reason, changed_at,
           previous:employees!employee_manager_history_previous_manager_id_fkey(full_name),
           next:employees!employee_manager_history_new_manager_id_fkey(full_name)`,
        )
        .eq("employee_id", employeeId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
