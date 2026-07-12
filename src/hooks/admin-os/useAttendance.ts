/**
 * Attendance, leave, shift & holiday hooks — Phase 2.9.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Shift = Tables["shifts"]["Row"];
export type EmployeeShift = Tables["employee_shifts"]["Row"];
export type Holiday = Tables["holidays"]["Row"];
export type AttendanceRecord = Tables["attendance_records"]["Row"];
export type AttendanceCorrection = Tables["attendance_corrections"]["Row"];
export type LeavePolicy = Tables["leave_policies"]["Row"];
export type LeaveBalance = Tables["leave_balances"]["Row"];
export type LeaveRequest = Tables["leave_requests"]["Row"];
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];
export type LeaveType = Database["public"]["Enums"]["leave_type"];
export type LeaveRequestStatus = Database["public"]["Enums"]["leave_request_status"];

const audit = async (a: {
  actor: string | null; action: string; targetType: string; targetId: string; after?: unknown;
}) => {
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: a.actor, module: "people_ops", action: a.action,
    target_type: a.targetType, target_id: a.targetId,
    after: (a.after as any) ?? null,
  });
};

const root = ["admin-os", "attendance"];

// -------- Shifts --------
export const useShifts = () =>
  useQuery({
    queryKey: [...root, "shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select(`*, department:admin_departments(id,name,key)`)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveShift = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Shift> & { name: string }) => {
      const { id, ...rest } = input;
      const q = id
        ? supabase.from("shifts").update(rest).eq("id", id).select().single()
        : supabase.from("shifts").insert({ ...rest, created_by: user?.id }).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: id ? "shift.update" : "shift.create",
        targetType: "shift", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "shifts"] }),
  });
};

export const useEmployeeShifts = (employeeId?: string) =>
  useQuery({
    queryKey: [...root, "employee-shifts", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_shifts")
        .select(`*, shift:shifts(*)`)
        .eq("employee_id", employeeId!)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAssignShift = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; shift_id: string; effective_from: string; effective_to?: string | null }) => {
      const { data, error } = await supabase
        .from("employee_shifts")
        .insert({ ...input, assigned_by: user?.id })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "shift.assign",
        targetType: "employee_shift", targetId: data.id, after: data });
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...root, "employee-shifts", v.employee_id] }),
  });
};

// -------- Holidays --------
export const useHolidays = (year?: number) =>
  useQuery({
    queryKey: [...root, "holidays", year],
    queryFn: async () => {
      let q = supabase.from("holidays").select("*").order("holiday_date");
      if (year) q = q.gte("holiday_date", `${year}-01-01`).lte("holiday_date", `${year}-12-31`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveHoliday = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Holiday> & { name: string; holiday_date: string }) => {
      const { id, ...rest } = input;
      const q = id
        ? supabase.from("holidays").update(rest).eq("id", id).select().single()
        : supabase.from("holidays").insert({ ...rest, created_by: user?.id }).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: id ? "holiday.update" : "holiday.create",
        targetType: "holiday", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "holidays"] }),
  });
};

export const useDeleteHoliday = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("holidays").delete().eq("id", id);
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "holiday.delete",
        targetType: "holiday", targetId: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "holidays"] }),
  });
};

// -------- Attendance --------
export const useMyAttendance = (employeeId?: string, from?: string, to?: string) =>
  useQuery({
    queryKey: [...root, "attendance", employeeId, from, to],
    enabled: !!employeeId,
    queryFn: async () => {
      let q = supabase.from("attendance_records").select("*").eq("employee_id", employeeId!)
        .order("work_date", { ascending: false }).limit(400);
      if (from) q = q.gte("work_date", from);
      if (to) q = q.lte("work_date", to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAttendanceForDate = (workDate: string) =>
  useQuery({
    queryKey: [...root, "attendance-day", workDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`*, employee:employees(id,full_name,employee_number,photo_url,department_id)`)
        .eq("work_date", workDate)
        .order("check_in_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCheckIn = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; status?: AttendanceStatus; notes?: string; shift_id?: string | null }) => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert({
          employee_id: input.employee_id,
          work_date: today,
          status: input.status ?? "present",
          check_in_at: new Date().toISOString(),
          shift_id: input.shift_id ?? null,
          notes: input.notes ?? null,
          source: "self",
          recorded_by: user?.id,
        }, { onConflict: "employee_id,work_date" })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "attendance.check_in",
        targetType: "attendance_record", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "attendance"] }),
  });
};

export const useCheckOut = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const now = new Date();
      const { data: existing, error: fetchErr } = await supabase
        .from("attendance_records").select("check_in_at").eq("id", recordId).single();
      if (fetchErr) throw fetchErr;
      const hours = existing?.check_in_at
        ? Math.max(0, (now.getTime() - new Date(existing.check_in_at).getTime()) / 3.6e6)
        : null;
      const { data, error } = await supabase
        .from("attendance_records")
        .update({ check_out_at: now.toISOString(), hours_worked: hours ? Math.round(hours * 100) / 100 : null })
        .eq("id", recordId).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "attendance.check_out",
        targetType: "attendance_record", targetId: recordId, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "attendance"] }),
  });
};

// -------- Attendance corrections --------
export const useCorrections = (filter?: { status?: "pending" | "approved" | "rejected" }) =>
  useQuery({
    queryKey: [...root, "corrections", filter],
    queryFn: async () => {
      let q = supabase.from("attendance_corrections")
        .select(`*, employee:employees(id,full_name,employee_number)`)
        .order("created_at", { ascending: false }).limit(200);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateCorrection = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<AttendanceCorrection> & { employee_id: string; work_date: string; requested_status: AttendanceStatus; reason: string }) => {
      const { data, error } = await supabase
        .from("attendance_corrections")
        .insert({ ...input, requested_by: user?.id })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "correction.create",
        targetType: "attendance_correction", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "corrections"] }),
  });
};

export const useReviewCorrection = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, decision, notes }: { id: string; decision: "approved" | "rejected"; notes?: string }) => {
      const { data, error } = await supabase
        .from("attendance_corrections")
        .update({ status: decision, review_notes: notes ?? null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: `correction.${decision}`,
        targetType: "attendance_correction", targetId: id, after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...root, "corrections"] });
      qc.invalidateQueries({ queryKey: [...root, "attendance"] });
    },
  });
};

// -------- Leave --------
export const useLeavePolicies = () =>
  useQuery({
    queryKey: [...root, "leave-policies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_policies").select("*").order("leave_type");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useLeaveBalances = (employeeId?: string, year?: number) =>
  useQuery({
    queryKey: [...root, "leave-balances", employeeId, year],
    enabled: !!employeeId,
    queryFn: async () => {
      const y = year ?? new Date().getFullYear();
      const { data, error } = await supabase.from("leave_balances")
        .select("*").eq("employee_id", employeeId!).eq("year", y);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAllocateBalance = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { employee_id: string; leave_type: LeaveType; year: number; allocated: number }) => {
      const { data, error } = await supabase
        .from("leave_balances")
        .upsert(input, { onConflict: "employee_id,leave_type,year" })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "leave.allocate",
        targetType: "leave_balance", targetId: data.id, after: data });
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [...root, "leave-balances", v.employee_id] }),
  });
};

export const useLeaveRequests = (filter?: { employee_id?: string; status?: LeaveRequestStatus }) =>
  useQuery({
    queryKey: [...root, "leave-requests", filter],
    queryFn: async () => {
      let q = supabase.from("leave_requests")
        .select(`*, employee:employees(id,full_name,employee_number,department_id)`)
        .order("created_at", { ascending: false }).limit(200);
      if (filter?.employee_id) q = q.eq("employee_id", filter.employee_id);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateLeaveRequest = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<LeaveRequest> & {
      employee_id: string; leave_type: LeaveType; start_date: string; end_date: string; days: number; reason: string;
    }) => {
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({ ...input, status: "pending_lead" })
        .select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: "leave.request",
        targetType: "leave_request", targetId: data.id, after: data });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...root, "leave-requests"] }),
  });
};

export const useReviewLeaveRequest = () => {
  const qc = useQueryClient(); const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, next, rejection_reason }: { id: string; next: LeaveRequestStatus; rejection_reason?: string }) => {
      const patch: Partial<LeaveRequest> = { status: next };
      const now = new Date().toISOString();
      if (next === "pending_dept_head") { patch.lead_reviewer = user?.id ?? null; patch.lead_reviewed_at = now; }
      else if (next === "pending_hr") { patch.dept_reviewer = user?.id ?? null; patch.dept_reviewed_at = now; }
      else if (next === "approved") { patch.hr_reviewer = user?.id ?? null; patch.hr_reviewed_at = now; }
      else if (next === "rejected") { patch.rejection_reason = rejection_reason ?? "Rejected"; }
      const { data, error } = await supabase.from("leave_requests").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await audit({ actor: user?.id ?? null, action: `leave.${next}`,
        targetType: "leave_request", targetId: id, after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...root, "leave-requests"] });
      qc.invalidateQueries({ queryKey: [...root, "leave-balances"] });
      qc.invalidateQueries({ queryKey: [...root, "attendance"] });
    },
  });
};

// -------- Workforce availability --------
export const useWorkforceAvailability = (workDate: string) =>
  useQuery({
    queryKey: [...root, "availability", workDate],
    queryFn: async () => {
      const [attRes, empRes] = await Promise.all([
        supabase.from("attendance_records").select("employee_id,status").eq("work_date", workDate),
        supabase.from("employees").select("id,full_name,department_id,employment_status").eq("employment_status", "active"),
      ]);
      const map = new Map<string, AttendanceStatus>();
      (attRes.data ?? []).forEach((r) => map.set(r.employee_id, r.status));
      const employees = empRes.data ?? [];
      const buckets: Record<string, number> = {
        present: 0, wfh: 0, business_travel: 0, training: 0, leave: 0, absent: 0, unmarked: 0,
      };
      employees.forEach((e) => {
        const s = map.get(e.id);
        if (!s) buckets.unmarked++;
        else if (s in buckets) buckets[s]++;
        else buckets.present++;
      });
      return { total: employees.length, buckets };
    },
  });
