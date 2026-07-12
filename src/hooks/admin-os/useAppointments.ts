import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExecutiveSlot {
  key: string;
  label: string;
  department: string;
  description: string;
}

export const EXECUTIVE_SLOTS: ExecutiveSlot[] = [
  { key: "co_founder", label: "Co-Founder", department: "Founder Office", description: "Co-lead of Aurelix with full founder-level authority." },
  { key: "hr_head", label: "Head of People Operations", department: "People Operations", description: "Owns hiring, onboarding, People Operations policies, and employee lifecycle." },
  { key: "cto", label: "Chief Technology Officer", department: "Engineering & Product", description: "Leads engineering strategy, delivery, and platform reliability." },
  { key: "cfo", label: "Chief Financial Officer", department: "Finance & Legal", description: "Owns financial planning, treasury, and compliance." },
  { key: "coo", label: "Chief Operating Officer", department: "Founder Office", description: "Coordinates cross-department operations and KPIs." },
  { key: "cso", label: "Chief Security Officer", department: "Security", description: "Leads security operations, threats, IAM, and compliance." },
  { key: "cpo", label: "Chief Product Officer", department: "Engineering & Product", description: "Owns product vision, roadmap, and design leadership." },
  { key: "general_counsel", label: "General Counsel", department: "Finance & Legal", description: "Leads legal governance and contract oversight." },
  { key: "head_ts", label: "Head of Trust & Safety", department: "Trust & Safety", description: "Leads content moderation, appeals, and investigations." },
  { key: "head_verification", label: "Head of Verification", department: "Verification", description: "Owns identity verification and badge integrity." },
  { key: "head_support", label: "Head of Customer Support", department: "Support", description: "Leads support operations and SLA governance." },
];

export interface AppointmentRow {
  id: string;
  slot_key: string;
  slot_label: string;
  employee_id: string;
  personal_email: string;
  appointed_at: string;
  revoked_at: string | null;
  pdf_path: string | null;
  gmail_message_id: string | null;
  employee?: {
    id: string;
    full_name: string;
    employee_number: string;
    company_email: string;
    joining_date: string | null;
  };
}

export function useAppointments() {
  return useQuery<AppointmentRow[]>({
    queryKey: ["executive-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_appointments" as any)
        .select(`
          id, slot_key, slot_label, employee_id, personal_email, appointed_at,
          revoked_at, pdf_path, gmail_message_id,
          employee:employees!executive_appointments_employee_id_fkey(
            id, full_name, employee_number, company_email, joining_date
          )
        `)
        .order("appointed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export interface AppointInput {
  slot_key: string;
  full_name: string;
  personal_email: string;
  phone?: string;
  joining_date: string;
  notes?: string;
}

export interface AppointResult {
  success: true;
  employee_id: string;
  employee_number: string;
  company_email: string;
  temp_password: string;
  pdf_signed_url: string | null;
  pdf_path: string;
  email_sent: boolean;
  gmail_message_id: string | null;
  email_error: string | null;
}

export function useAppointExecutive() {
  const qc = useQueryClient();
  return useMutation<AppointResult, Error, AppointInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke("appoint-executive", {
        body: input,
      });
      if (error) {
        const msg = (data as any)?.error ?? error.message;
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as AppointResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executive-appointments"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export async function getSignedLetterUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("joining-letters")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export interface RevokeAppointmentInput {
  appointment_id: string;
  employee_id: string;
  slot_label: string;
  reason: string;
  suspend_employee: boolean;
}

export function useRevokeAppointment() {
  const qc = useQueryClient();
  return useMutation<void, Error, RevokeAppointmentInput>({
    mutationFn: async ({ appointment_id, employee_id, slot_label, reason, suspend_employee }) => {
      const { error: revErr } = await supabase
        .from("executive_appointments" as any)
        .update({ revoked_at: new Date().toISOString(), revoke_reason: reason })
        .eq("id", appointment_id);
      if (revErr) throw revErr;

      if (suspend_employee) {
        const { error: empErr } = await supabase
          .from("employees")
          .update({ employment_status: "suspended" as any })
          .eq("id", employee_id);
        if (empErr) throw empErr;
      }

      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: auth.user?.id ?? null,
        module: "founder_office",
        action: "executive.appointment_revoked",
        target_type: "executive_appointment",
        target_id: appointment_id,
        before: { slot: slot_label } as any,
        after: { reason, suspended: suspend_employee } as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executive-appointments"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employees"] });
      qc.invalidateQueries({ queryKey: ["admin-os", "employee-detail"] });
    },
  });
}

