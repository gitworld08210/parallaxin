// AuditService — infrastructure helper for organization audit logging.
// Wraps the server-side `write_org_audit_log` RPC so future mutation code
// can attach a consistent audit trail without duplicating the invocation.
//
// Phase 1 provides the utility only. Mutation logging arrives with Phase 2+.

import { supabase } from "@/integrations/supabase/client";
import { reportOperationalError } from "@/lib/operationalErrors";

export interface AuditLogInput {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

export const auditService = {
  async record(input: AuditLogInput): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("write_org_audit_log" as never, {
        _organization_id: input.organizationId,
        _action: input.action,
        _entity_type: input.entityType,
        _entity_id: input.entityId ?? null,
        _old_data: (input.oldData as any) ?? null,
        _new_data: (input.newData as any) ?? null,
      } as never);

      if (error) throw error;
      return true;
    } catch (error) {
      // Browser-side audit copies are best-effort. Callers get an explicit
      // delivery result while failures remain observable to monitoring.
      reportOperationalError("organization-audit", error, {
        organizationId: input.organizationId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
      });
      return false;
    }
  },
};
