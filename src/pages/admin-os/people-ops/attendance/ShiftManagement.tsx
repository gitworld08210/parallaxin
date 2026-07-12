import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useShifts, useSaveShift, type Shift } from "@/hooks/admin-os/useAttendance";
import { useDepartments } from "@/hooks/admin-os/useEmployees";

const kinds = ["general", "morning", "evening", "night", "flexible", "remote"] as const;

const ShiftManagement = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_SHIFT_MANAGE);
  const { data: shifts, isLoading } = useShifts();
  const { data: departments } = useDepartments();
  const save = useSaveShift();

  const [editing, setEditing] = useState<Partial<Shift> | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name) { toast.error("Name required"); return; }
    try {
      await save.mutateAsync(editing as any);
      toast.success("Saved");
      setEditing(null);
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · SHIFTS</p>
          <h1 className="text-xl font-bold">Shift Management</h1>
        </div>
        {canManage && (
          <button onClick={() => setEditing({ name: "", kind: "general", start_time: "09:00", end_time: "18:00", days_of_week: [1, 2, 3, 4, 5] })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> New shift
          </button>
        )}
      </div>

      {editing && canManage && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Name *</label>
            <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Kind</label>
            <select value={editing.kind ?? "general"} onChange={(e) => setEditing({ ...editing, kind: e.target.value as any })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Start</label>
            <input type="time" value={editing.start_time ?? "09:00"} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">End</label>
            <input type="time" value={editing.end_time ?? "18:00"} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Department (optional)</label>
            <select value={editing.department_id ?? ""} onChange={(e) => setEditing({ ...editing, department_id: e.target.value || null })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              <option value="">All departments</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Days of week (1=Mon..7=Sun)</label>
            <input value={(editing.days_of_week ?? []).join(",")}
              onChange={(e) => setEditing({ ...editing, days_of_week: e.target.value.split(",").map((s) => Number(s.trim())).filter(Boolean) })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <label className="text-xs flex items-center gap-1">
              <input type="checkbox" checked={editing.is_default ?? false} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} />
              Default shift
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={save.isPending}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Save shift</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !shifts || shifts.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No shifts defined.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {shifts.map((s: any) => (
              <div key={s.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">{s.kind}</span>
                    {s.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">Default</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)} · days [{(s.days_of_week ?? []).join(", ")}] · {s.department?.name ?? "All departments"}
                  </p>
                </div>
                {canManage && (
                  <button onClick={() => setEditing(s)} className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted">
                    Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftManagement;
