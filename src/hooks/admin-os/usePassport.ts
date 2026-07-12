/**
 * Employee Passport hooks.
 *
 * Reads and mutations for the complete Digital Employment File.
 * All writes create timeline events server-side (via triggers) and
 * every mutation writes an `admin_audit_logs` row for traceability.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

export type PassportEventType =
  Database["public"]["Enums"]["passport_event_type"];
export type PassportDocType =
  Database["public"]["Enums"]["passport_doc_type"];

const audit = async (params: {
  actorId: string | null;
  action: string;
  employeeId: string;
  after?: unknown;
}) => {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: params.actorId,
    module: "people_ops",
    action: params.action,
    target_type: "employee",
    target_id: params.employeeId,
    after: (params.after as any) ?? null,
  });
};

const pk = (employeeId: string) => ["admin-os", "passport", employeeId];

// -------- Passport core --------
export const usePassport = (employeeId?: string) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: pk(employeeId ?? ""),
    queryFn: async () => {
      const [passport, employee] = await Promise.all([
        supabase
          .from("employee_passports")
          .select("*")
          .eq("employee_id", employeeId!)
          .maybeSingle(),
        supabase
          .from("employees")
          .select(
            `id, full_name, company_email, employee_number, employment_status,
             joining_date, exit_date, photo_url, level,
             department:admin_departments!employees_department_id_fkey(id,name,slug),
             role:admin_roles!employees_role_id_fkey(id,name),
             reporting_manager:employees!employees_reporting_manager_id_fkey(id,full_name,employee_number)`,
          )
          .eq("id", employeeId!)
          .maybeSingle(),
      ]);
      if (passport.error) throw passport.error;
      if (employee.error) throw employee.error;
      return { passport: passport.data, employee: employee.data };
    },
  });

export const usePassportTimeline = (employeeId?: string) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: [...pk(employeeId ?? ""), "timeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passport_timeline")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

export const usePassportSection = <T extends
  | "passport_department_history"
  | "passport_team_history"
  | "passport_promotion_history"
  | "passport_skills"
  | "passport_certifications"
  | "passport_awards"
  | "passport_projects"
  | "passport_training"
  | "passport_documents",
>(
  table: T,
  employeeId?: string,
) =>
  useQuery({
    enabled: !!employeeId,
    queryKey: [...pk(employeeId ?? ""), table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

// -------- Mutations --------
export const useUpdatePassportContact = (employeeId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: {
      photo_url?: string | null;
      emergency_contact_name?: string | null;
      emergency_contact_phone?: string | null;
      emergency_contact_relation?: string | null;
      office_location?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("employee_passports")
        .update(patch)
        .eq("employee_id", employeeId)
        .select("*")
        .single();
      if (error) throw error;
      await audit({
        actorId: user?.id ?? null,
        action: "passport.contact_updated",
        employeeId,
        after: patch,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pk(employeeId) }),
  });
};

export const useAddPassportRecord = <T extends
  | "passport_promotion_history"
  | "passport_department_history"
  | "passport_team_history"
  | "passport_awards"
  | "passport_training"
  | "passport_projects"
  | "passport_certifications"
  | "passport_skills",
>(
  table: T,
  employeeId: string,
  auditAction: string,
) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ ...payload, employee_id: employeeId } as never)
        .select("*")
        .single();
      if (error) throw error;
      await audit({
        actorId: user?.id ?? null,
        action: auditAction,
        employeeId,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pk(employeeId) }),
  });
};

export const useVerifySkill = (employeeId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (skillId: string) => {
      const { data, error } = await supabase
        .from("passport_skills")
        .update({ status: "verified" })
        .eq("id", skillId)
        .select("*")
        .single();
      if (error) throw error;
      await audit({
        actorId: user?.id ?? null,
        action: "passport.skill_verified",
        employeeId,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pk(employeeId) }),
  });
};

export const useUploadPassportDocument = (employeeId: string) => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      doc_type: PassportDocType;
      title: string;
      description?: string;
    }) => {
      const path = `passport/${employeeId}/${Date.now()}_${input.file.name}`;
      const up = await supabase.storage
        .from("platform-documents")
        .upload(path, input.file, { upsert: false });
      if (up.error) throw up.error;
      const { data, error } = await supabase
        .from("passport_documents")
        .insert({
          employee_id: employeeId,
          doc_type: input.doc_type,
          title: input.title,
          description: input.description ?? null,
          storage_bucket: "platform-documents",
          storage_path: path,
          uploaded_by: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      await audit({
        actorId: user?.id ?? null,
        action: "passport.document_uploaded",
        employeeId,
        after: data,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pk(employeeId) }),
  });
};

export const passportDocumentUrl = async (
  bucket: string,
  path: string,
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 5);
  if (error) return null;
  return data?.signedUrl ?? null;
};
