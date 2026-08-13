import { supabase } from "@/integrations/supabase/client";
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
/**
 * Aurelix Admin OS — Core Platform Engines service layer.
 *
 * Reusable services every module consumes. No department-specific logic.
 * All writes go through Supabase RLS; every mutation also emits an
 * admin audit log and an activity event where applicable.
 */


// -------- shared helpers --------

export async function logAdminAction(input: {
  module: string;
  action: string;
  target_type?: string;
  target_id?: string;
  before?: unknown;
  after?: unknown;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  
  // Primary: Firestore for audit trails
  try {
    await addDoc(collection(db, "admin_audit_logs"), {
      actor_user_id: uid,
      module: input.module,
      action: input.action,
      target_type: input.target_type ?? null,
      target_id: input.target_id ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      created_at: serverTimestamp()
    });
  } catch (e) {
    console.warn("Firestore audit log failed", e);
  }

  // Secondary: Supabase for legacy admin views
  await supabase.from("admin_audit_logs" as any).insert({
    actor_user_id: uid,
    module: input.module,
    action: input.action,
    target_type: input.target_type ?? null,
    target_id: input.target_id ?? null,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
  } as any);
}

export async function emitActivity(input: {
  verb: string;
  object_type: string;
  object_id?: string;
  department?: string;
  visibility?: "public" | "admin" | "department";
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  await supabase.from("platform_activity" as any).insert({
    actor_user_id: uid,
    verb: input.verb,
    object_type: input.object_type,
    object_id: input.object_id ?? null,
    department: input.department ?? null,
    visibility: input.visibility ?? "admin",
    summary: input.summary,
    metadata: (input.metadata ?? {}) as never,
  } as any);

}

// -------- Approval engine --------

export interface CreateApprovalInput {
  module: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
  workflow_id?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  due_at?: string;
}

export const approvals = {
  async create(input: CreateApprovalInput) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");
    const { data, error } = await supabase.from("platform_approval_requests").insert({
      module: input.module,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      title: input.title,
      description: input.description ?? null,
      payload: (input.payload ?? {}) as never,
      workflow_id: input.workflow_id ?? null,
      priority: input.priority ?? "normal",
      due_at: input.due_at ?? null,
      requested_by: uid,
    }).select().single();
    if (error) throw error;
    await logAdminAction({
      module: "approvals",
      action: "created",
      target_type: "approval",
      target_id: data.id,
      after: data,
    });
    await emitActivity({
      verb: "requested",
      object_type: "approval",
      object_id: data.id,
      summary: `Approval requested: ${input.title}`,
      metadata: { module: input.module },
    });
    return data;
  },
  async list(filter?: { status?: string; module?: string }) {
    let q = supabase.from("platform_approval_requests").select("*").order("created_at", { ascending: false });
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.module) q = q.eq("module", filter.module);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async decide(id: string, decision: "approved" | "rejected", reason?: string) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");
    const status = decision === "approved" ? "approved" : "rejected";
    const { data: before } = await supabase.from("platform_approval_requests").select("*").eq("id", id).single();
    const { error: upErr } = await supabase.from("platform_approval_requests").update({ status, completed_at: new Date().toISOString() }).eq("id", id);
    if (upErr) throw upErr;
    const { error: decErr } = await supabase.from("platform_approval_decisions").insert({
      request_id: id,
      decided_by: uid,
      decision,
      reason: reason ?? null,
    });
    if (decErr) throw decErr;
    await logAdminAction({
      module: "approvals",
      action: decision,
      target_type: "approval",
      target_id: id,
      before,
      after: { status },
    });
    await emitActivity({
      verb: decision,
      object_type: "approval",
      object_id: id,
      summary: `Approval ${decision}${reason ? `: ${reason}` : ""}`,
    });
  },
  async decisions(id: string) {
    const { data, error } = await supabase.from("platform_approval_decisions").select("*").eq("request_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
};

// -------- Workflow engine --------

export const workflows = {
  async list() {
    const { data, error } = await supabase.from("platform_workflows").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async get(id: string) {
    const { data, error } = await supabase.from("platform_workflows").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async create(input: {
    key: string;
    name: string;
    description?: string;
    owner_department?: string;
    trigger?: string;
    steps?: unknown[];
  }) {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("platform_workflows").insert({
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      owner_department: input.owner_department ?? null,
      trigger: input.trigger ?? "manual",
      steps: (input.steps ?? []) as never,
      created_by: userData.user?.id ?? null,
    }).select().single();
    if (error) throw error;
    await logAdminAction({
      module: "workflows",
      action: "created",
      target_type: "workflow",
      target_id: data.id,
      after: data,
    });
    return data;
  },
  async runs(workflow_id?: string) {
    let q = supabase.from("platform_workflow_runs").select("*").order("created_at", { ascending: false }).limit(50);
    if (workflow_id) q = q.eq("workflow_id", workflow_id);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};

// -------- Notification engine --------

export const notifications = {
  async notify(input: {
    recipient_user_id: string;
    template_key?: string;
    title: string;
    body: string;
    channels?: ("in_app" | "email")[];
    payload?: Record<string, unknown>;
  }) {
    const channels = input.channels ?? ["in_app"];
    const rows = channels.map((channel) => ({
      recipient_user_id: input.recipient_user_id,
      template_key: input.template_key ?? null,
      channel,
      status: channel === "in_app" ? "delivered" : "queued",
      payload: {
        title: input.title,
        body: input.body,
        ...(input.payload ?? {}),
      } as never,
      sent_at: channel === "in_app" ? new Date().toISOString() : null,
    }));
    const { data, error } = await supabase.from("platform_notification_deliveries").insert(rows).select();
    if (error) throw error;
    return data;
  },
  async deliveries(user_id: string, limit = 30) {
    const { data, error } = await supabase.from("platform_notification_deliveries").select("*").eq("recipient_user_id", user_id).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
  async templates() {
    const { data, error } = await supabase.from("platform_notification_templates").select("*").order("key");
    if (error) throw error;
    return data;
  },
  async getPreferences(user_id: string) {
    const { data } = await supabase.from("platform_notification_preferences").select("*").eq("user_id", user_id).maybeSingle();
    return data;
  },
  async savePreferences(user_id: string, prefs: Record<string, unknown>) {
    const { data, error } = await supabase.from("platform_notification_preferences").upsert({ user_id, ...prefs }).select().single();
    if (error) throw error;
    return data;
  },
};

// -------- Activity engine --------

export const activity = {
  async list(filter?: {
    department?: string;
    object_type?: string;
    limit?: number;
  }) {
    let q = supabase.from("platform_activity_events").select("*").order("created_at", { ascending: false }).limit(filter?.limit ?? 50);
    if (filter?.department) q = q.eq("department", filter.department);
    if (filter?.object_type) q = q.eq("object_type", filter.object_type);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};

// -------- Assignment engine --------

export const assignments = {
  async list(filter?: { status?: string; assignee_user_id?: string }) {
    let q = supabase.from("platform_assignments").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.assignee_user_id)
      q = q.eq("assignee_user_id", filter.assignee_user_id);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async assign(input: {
    module: string;
    entity_type: string;
    entity_id: string;
    assignee_user_id: string;
    department?: string;
    method?: "manual" | "auto" | "rule";
    priority?: "low" | "normal" | "high" | "urgent";
  }) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    const { data, error } = await supabase.from("platform_assignments").insert({
      module: input.module,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      assignee_user_id: input.assignee_user_id,
      assigned_by: uid ?? null,
      department: input.department ?? null,
      method: input.method ?? "manual",
      priority: input.priority ?? "normal",
    }).select().single();
    if (error) throw error;
    await logAdminAction({
      module: "assignments",
      action: "assigned",
      target_type: input.entity_type,
      target_id: input.entity_id,
      after: data,
    });
    await emitActivity({
      verb: "assigned",
      object_type: input.entity_type,
      object_id: input.entity_id,
      summary: `${input.entity_type} assigned`,
      metadata: { assignee: input.assignee_user_id },
    });
    return data;
  },
  async updateStatus(
    id: string,
    status: "open" | "accepted" | "in_progress" | "completed" | "cancelled",
  ) {
    const patch: {
      status: string;
      accepted_at?: string;
      completed_at?: string;
    } = { status };
    if (status === "accepted") patch.accepted_at = new Date().toISOString();
    if (status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("platform_assignments").update(patch).eq("id", id);
    if (error) throw error;
    await logAdminAction({
      module: "assignments",
      action: `status_${status}`,
      target_type: "assignment",
      target_id: id,
    });
  },
};

// -------- Global search --------

export const search = {
  async query(q: string, limit = 25) {
    if (!q.trim()) return [];
    const { data, error } = await supabase.rpc("platform_global_search" as never, {
      _q: q,
      _limit: limit,
    } as never);
    if (error) throw error;
    return data ?? [];
  },
};

// -------- Documents --------

export const documents = {
  async list() {
    const { data, error } = await supabase.from("platform_documents").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async get(id: string) {
    const { data, error } = await supabase.from("platform_documents").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async versions(id: string) {
    const { data, error } = await supabase.from("platform_document_versions").select("*").eq("document_id", id).order("version", { ascending: false });
    if (error) throw error;
    return data;
  },
  async upload(input: {
    name: string;
    category?: string;
    file: File;
    department?: string;
  }) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Not authenticated");
    const path = `${uid}/${crypto.randomUUID()}-${input.file.name}`;
    const { error: upErr } = await supabase.storage.from("platform-documents").upload(path, input.file);
    if (upErr) throw upErr;
    const { data, error } = await supabase.from("platform_documents").insert({
      name: input.name,
      category: input.category ?? null,
      owner_user_id: uid,
      department: input.department ?? null,
      storage_path: path,
      mime_type: input.file.type,
      size_bytes: input.file.size,
      current_version: 1,
    } as any).select().single();
    if (error) throw error;
    await supabase.from("platform_document_versions").insert({
      document_id: (data as any).id,
      version: 1,
      storage_path: path,
      size_bytes: input.file.size,
      created_by: uid,
    } as any);
    await logAdminAction({
      module: "documents",
      action: "uploaded",
      target_type: "document",
      target_id: (data as any).id,
      after: { name: (data as any).name },
    });
    return data;
  },
  async signedUrl(path: string) {
    const { data, error } = await supabase.storage.from("platform-documents").createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  },
};


// -------- Reports --------

export const reports = {
  async definitions() {
    const { data, error } = await supabase.from("platform_report_definitions").select("*").order("name");
    if (error) throw error;
    return data;
  },
  async runs(definition_id?: string) {
    let q = supabase.from("platform_report_runs").select("*").order("created_at", { ascending: false }).limit(50);
    if (definition_id) q = q.eq("definition_id", definition_id);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async run(definition_id: string, parameters: Record<string, unknown> = {}) {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("platform_report_runs").insert({
      definition_id,
      parameters: parameters as never,
      requested_by: userData.user?.id ?? null,
      status: "pending",
    }).select().single();
    if (error) throw error;
    return data;
  },
};

// -------- Dashboards --------

export const dashboards = {
  async list() {
    const { data, error } = await supabase.from("platform_dashboards").select("*").order("name");
    if (error) throw error;
    return data;
  },
  async widgets(dashboard_id: string) {
    const { data, error } = await supabase.from("platform_dashboard_widgets").select("*").eq("dashboard_id", dashboard_id).order("position");
    if (error) throw error;
    return data;
  },
};

// -------- Scheduler --------

export const scheduler = {
  async jobs() {
    const { data, error } = await supabase.from("platform_scheduled_jobs").select("*").order("name");
    if (error) throw error;
    return data;
  },
  async runs(job_id?: string) {
    let q = supabase.from("platform_scheduled_job_runs").select("*").order("created_at", { ascending: false }).limit(50);
    if (job_id) q = q.eq("job_id", job_id);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};
