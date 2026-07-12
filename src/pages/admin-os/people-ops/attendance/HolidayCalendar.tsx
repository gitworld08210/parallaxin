import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useHolidays, useSaveHoliday, useDeleteHoliday } from "@/hooks/admin-os/useAttendance";
import { useDepartments } from "@/hooks/admin-os/useEmployees";

const HolidayCalendar = () => {
  const { hasPermission } = useEmployee();
  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_HOLIDAY_MANAGE);
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: holidays, isLoading } = useHolidays(year);
  const { data: departments } = useDepartments();
  const save = useSaveHoliday();
  const remove = useDeleteHoliday();

  const [form, setForm] = useState({ name: "", holiday_date: "", kind: "company", department_id: "" as string });
  const [showForm, setShowForm] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.holiday_date) { toast.error("Name and date required"); return; }
    try {
      await save.mutateAsync({
        name: form.name,
        holiday_date: form.holiday_date,
        kind: form.kind as any,
        department_id: form.department_id || null,
      });
      toast.success("Holiday saved");
      setShowForm(false);
      setForm({ name: "", holiday_date: "", kind: "company", department_id: "" });
    } catch (err) { toast.error((err as Error).message); }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof holidays>();
    (holidays ?? []).forEach((h) => {
      const key = h.holiday_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    });
    return Array.from(map.entries()).sort();
  }, [holidays]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · HOLIDAYS</p>
          <h1 className="text-xl font-bold">Holiday Calendar</h1>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {canManage && (
            <button onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" /> Add holiday
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Date *</label>
            <input type="date" required value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Kind</label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              {["national", "company", "department", "regional"].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Department (for dept holidays)</label>
            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm">
              <option value="">—</option>
              {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Save</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">No holidays for {year}.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([month, list]) => (
            <div key={month} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-2 border-b border-border/60 text-xs font-semibold">
                {new Date(month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
              </div>
              <div className="divide-y divide-border/60">
                {(list ?? []).map((h) => (
                  <div key={h.id} className="p-3 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{h.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">{h.kind}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{h.holiday_date}</p>
                    </div>
                    {canManage && (
                      <button onClick={() => remove.mutate(h.id)} className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-red-500/10 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HolidayCalendar;
