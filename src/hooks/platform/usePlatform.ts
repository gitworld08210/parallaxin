import { supabase } from '@/integrations/supabase/client';
/**
 * Platform engine hooks. Thin React-Query wrappers around the service layer.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  approvals,
  workflows,
  notifications,
  activity,
  assignments,
  documents,
  reports,
  dashboards,
  scheduler,
  search,
} from "@/services/platform/platform";

const K = (parts: unknown[]) => ["platform", ...parts];

// Approvals
export const useApprovals = (filter?: { status?: string; module?: string }) =>
  useQuery({
    queryKey: K(["approvals", filter]),
    queryFn: () => approvals.list(filter),
  });

export const useApprovalDecisions = (id: string | undefined) =>
  useQuery({
    queryKey: K(["approval-decisions", id]),
    queryFn: () => approvals.decisions(id!),
    enabled: !!id,
  });

export const useDecideApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) => approvals.decide(input.id, input.decision, input.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: K(["approvals"]) }),
  });
};

export const useCreateApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approvals.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: K(["approvals"]) }),
  });
};

// Workflows
export const useWorkflows = () =>
  useQuery({ queryKey: K(["workflows"]), queryFn: workflows.list });
export const useWorkflow = (id?: string) =>
  useQuery({
    queryKey: K(["workflow", id]),
    queryFn: () => workflows.get(id!),
    enabled: !!id,
  });
export const useWorkflowRuns = (workflow_id?: string) =>
  useQuery({
    queryKey: K(["workflow-runs", workflow_id]),
    queryFn: () => workflows.runs(workflow_id),
  });

// Notifications
export const useNotificationDeliveries = (user_id?: string) =>
  useQuery({
    queryKey: K(["notif-deliveries", user_id]),
    queryFn: () => notifications.deliveries(user_id!),
    enabled: !!user_id,
  });

export const useNotificationTemplates = () =>
  useQuery({ queryKey: K(["notif-templates"]), queryFn: notifications.templates });

export const useNotificationPrefs = (user_id?: string) =>
  useQuery({
    queryKey: K(["notif-prefs", user_id]),
    queryFn: () => notifications.getPreferences(user_id!),
    enabled: !!user_id,
  });

// Activity
export const useActivity = (filter?: {
  department?: string;
  object_type?: string;
  limit?: number;
}) =>
  useQuery({
    queryKey: K(["activity", filter]),
    queryFn: () => activity.list(filter),
  });

export const useActivityRealtime = (onChange: () => void) => {
  useEffect(() => {
      supabase.channel("platform-activity").
on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "platform_activity_events" },
        () => onChange(),
      ).
subscribe();
    return () => {
    };
  }, [onChange]);
};

// Assignments
export const useAssignments = (filter?: {
  status?: string;
  assignee_user_id?: string;
}) =>
  useQuery({
    queryKey: K(["assignments", filter]),
    queryFn: () => assignments.list(filter),
  });

export const useAssign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignments.assign,
    onSuccess: () => qc.invalidateQueries({ queryKey: K(["assignments"]) }),
  });
};

export const useUpdateAssignmentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      status: "open" | "accepted" | "in_progress" | "completed" | "cancelled";
    }) => assignments.updateStatus(input.id, input.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: K(["assignments"]) }),
  });
};

// Search
export const useSearch = (q: string) =>
  useQuery({
    queryKey: K(["search", q]),
    queryFn: () => search.query(q),
    enabled: q.trim().length > 1,
  });

// Documents
export const useDocuments = () =>
  useQuery({ queryKey: K(["documents"]), queryFn: documents.list });
export const useDocument = (id?: string) =>
  useQuery({
    queryKey: K(["document", id]),
    queryFn: () => documents.get(id!),
    enabled: !!id,
  });
export const useDocumentVersions = (id?: string) =>
  useQuery({
    queryKey: K(["document-versions", id]),
    queryFn: () => documents.versions(id!),
    enabled: !!id,
  });
export const useUploadDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: documents.upload,
    onSuccess: () => qc.invalidateQueries({ queryKey: K(["documents"]) }),
  });
};

// Reports
export const useReportDefinitions = () =>
  useQuery({ queryKey: K(["report-defs"]), queryFn: reports.definitions });
export const useReportRuns = (definition_id?: string) =>
  useQuery({
    queryKey: K(["report-runs", definition_id]),
    queryFn: () => reports.runs(definition_id),
  });
export const useRunReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      definition_id: string;
      parameters?: Record<string, unknown>;
    }) => reports.run(input.definition_id, input.parameters ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: K(["report-runs"]) }),
  });
};

// Dashboards
export const useDashboards = () =>
  useQuery({ queryKey: K(["dashboards"]), queryFn: dashboards.list });
export const useDashboardWidgets = (dashboard_id?: string) =>
  useQuery({
    queryKey: K(["dashboard-widgets", dashboard_id]),
    queryFn: () => dashboards.widgets(dashboard_id!),
    enabled: !!dashboard_id,
  });

// Scheduler
export const useScheduledJobs = () =>
  useQuery({ queryKey: K(["jobs"]), queryFn: scheduler.jobs });
export const useJobRuns = (job_id?: string) =>
  useQuery({
    queryKey: K(["job-runs", job_id]),
    queryFn: () => scheduler.runs(job_id),
  });
