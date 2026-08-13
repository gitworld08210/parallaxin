// AuditService — infrastructure helper for organization audit logging.
// Wraps the server-side `write_org_audit_log` RPC so future mutation code
// can attach a consistent audit trail without duplicating the invocation.
//
// Phase 1 provides the utility only. Mutation logging arrives with Phase 2+.

import { supabase } from "@/integrations/supabase/client";

export interface AuditLogInput {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export const auditService = {
  async record(input: AuditLogInput): Promise<void> {
    const { error } = await supabase.rpc("write_org_audit_log" as never, {
      _organization_id: input.organizationId,
      _action: input.action,
      _entity_type: input.entityType,
      _entity_id: input.entityId ?? null,
      _old_data: (input.oldData as any) ?? null,
      _new_data: (input.newData as any) ?? null,
    } as never);

    if (error) {
      // Audit writes must never break the user's action — log and swallow.
      console.warn("[audit] write_org_audit_log failed", error);
    }
  },
};
