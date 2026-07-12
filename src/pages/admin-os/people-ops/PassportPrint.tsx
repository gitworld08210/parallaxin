/**
 * Printable Employee Passport view — Phase 2.3.
 * A clean, print-friendly summary of the passport and key history.
 */
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  usePassport,
  usePassportTimeline,
  usePassportSection,
} from "@/hooks/admin-os/usePassport";

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

const PassportPrint = () => {
  const { employeeId = "" } = useParams();
  const { data } = usePassport(employeeId);
  const { data: timeline } = usePassportTimeline(employeeId);
  const { data: promHist } = usePassportSection<any>("passport_promotion_history", employeeId);
  const { data: awards } = usePassportSection<any>("passport_awards", employeeId);
  const { data: skills } = usePassportSection<any>("passport_skills", employeeId);

  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  if (!data?.employee) return <div className="p-8">Loading passport…</div>;
  const emp = data.employee as any;
  const p = data.passport as any;

  return (
    <div className="min-h-screen bg-white text-black p-10 max-w-3xl mx-auto print:p-0">
      <header className="border-b-2 border-black pb-4 mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs tracking-widest">AURELIX · EMPLOYEE PASSPORT</p>
          <h1 className="text-3xl font-bold mt-1">{emp.full_name}</h1>
          <p className="text-sm mt-1">
            {emp.employee_number} · {emp.department?.name ?? "—"} · {emp.role?.name ?? "—"}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono">{p?.passport_number ?? "—"}</p>
          <p>Issued {fmtDate(p?.issued_at)}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div><b>Joining date:</b> {fmtDate(emp.joining_date)}</div>
        <div><b>Status:</b> {emp.employment_status}</div>
        <div><b>Level:</b> {emp.level ?? "—"}</div>
        <div><b>Manager:</b> {emp.reporting_manager?.full_name ?? "—"}</div>
        <div><b>Office:</b> {p?.office_location ?? "—"}</div>
        <div><b>Emergency:</b> {p?.emergency_contact_name ?? "—"} {p?.emergency_contact_phone ? `· ${p.emergency_contact_phone}` : ""}</div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-1 mb-2">Timeline</h2>
        <ul className="text-sm space-y-1">
          {(timeline ?? []).slice(0, 25).map((e: any) => (
            <li key={e.id} className="flex justify-between">
              <span>{fmtDate(e.occurred_at)} — {e.title}</span>
              <span className="text-xs uppercase">{e.event_type.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-1 mb-2">Promotions</h2>
        {promHist?.length ? (
          <ul className="text-sm space-y-1">
            {promHist.map((r: any) => (
              <li key={r.id}>{fmtDate(r.promotion_date)} — {r.old_level ?? "—"} → {r.new_level}</li>
            ))}
          </ul>
        ) : <p className="text-xs italic">None recorded.</p>}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-1 mb-2">Awards</h2>
        {awards?.length ? (
          <ul className="text-sm space-y-1">
            {awards.map((a: any) => (
              <li key={a.id}>{fmtDate(a.award_date)} — {a.award_name}{a.category ? ` (${a.category})` : ""}</li>
            ))}
          </ul>
        ) : <p className="text-xs italic">None recorded.</p>}
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black pb-1 mb-2">Verified skills</h2>
        {(skills ?? []).filter((s: any) => s.status === "verified").length ? (
          <ul className="text-sm space-y-1">
            {(skills ?? []).filter((s: any) => s.status === "verified").map((s: any) => (
              <li key={s.id}>{s.skill_name}{s.skill_level ? ` · ${s.skill_level}` : ""}</li>
            ))}
          </ul>
        ) : <p className="text-xs italic">None verified.</p>}
      </section>

      <footer className="text-[10px] text-center mt-10 border-t border-black pt-2">
        Official Aurelix Employee Passport · Generated {new Date().toLocaleString()}
      </footer>
    </div>
  );
};

export default PassportPrint;
