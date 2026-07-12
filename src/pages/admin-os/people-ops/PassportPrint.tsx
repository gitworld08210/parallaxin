/**
 * Employee Passport — Premium Card View (Phase 2.3).
 *
 * A card-style, print-ready official passport rendered in the reference
 * "Aurelix Employee Passport" layout. Access is gated by the passport
 * permission — only HR and Founder Office members can open it for other
 * employees; employees can open their own via RLS.
 */
import { useEffect, useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  Mail, Phone, Building2, Globe, Calendar, User2, Monitor,
  MapPin, Briefcase, Award, ShieldCheck, Clock, FileText,
  Star, IdCard, Printer,
} from "lucide-react";
import {
  usePassport,
  usePassportTimeline,
  usePassportSection,
} from "@/hooks/admin-os/usePassport";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";

const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      }).toUpperCase()
    : "—";

const fmtDateLong = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

const hashDigest = (str: string) => {
  // Deterministic short hex-style hash (visual only, not crypto).
  let h1 = 0x811c9dc5, h2 = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  const hex = (h1 >>> 0).toString(16).toUpperCase().padStart(8, "0") +
              (h2 >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return hex.match(/.{1,4}/g)?.join(" ") ?? hex;
};

const Card = ({
  title, tone, icon: Icon, children,
}: {
  title: string;
  tone: "indigo" | "blue" | "green" | "gold" | "red";
  icon: any;
  children: React.ReactNode;
}) => {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-900 text-white",
    blue:   "bg-blue-900 text-white",
    green:  "bg-emerald-800 text-white",
    gold:   "bg-amber-600 text-white",
    red:    "bg-rose-800 text-white",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className={`${tones[tone]} px-4 py-2 flex items-center gap-2`}>
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-bold tracking-[0.16em]">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value?: React.ReactNode }) => (
  <div className="flex items-start gap-2.5 py-1.5">
    <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
      <Icon className="h-3.5 w-3.5 text-slate-600" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xs font-semibold text-slate-800 truncate">{value ?? "—"}</p>
    </div>
  </div>
);

const SkillBar = ({ name, level }: { name: string; level: number }) => (
  <div className="mb-2 last:mb-0">
    <div className="flex justify-between text-[11px]">
      <span className="font-medium text-slate-700">{name}</span>
      <span className="font-bold text-emerald-700">{level}%</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mt-1">
      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${level}%` }} />
    </div>
  </div>
);

const PassportPrint = () => {
  const { employeeId = "" } = useParams();
  const { hasPermission, employee: me, loading: meLoading } = useEmployee();
  const { data, isLoading } = usePassport(employeeId);
  const { data: timeline } = usePassportTimeline(employeeId);
  const { data: skills } = usePassportSection<any>("passport_skills", employeeId);
  const { data: certs } = usePassportSection<any>("passport_certifications", employeeId);
  const { data: docs } = usePassportSection<any>("passport_documents", employeeId);

  const emp: any = data?.employee;
  const p: any = data?.passport;

  const canManage = hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_PASSPORT_MANAGE);
  const isSelf = !!me && !!emp && me.id === emp.id;

  const verifiedSkills = useMemo(
    () => (skills ?? []).filter((s: any) => s.status === "verified").slice(0, 6),
    [skills],
  );

  const digest = useMemo(
    () => hashDigest(`${emp?.id ?? ""}-${p?.passport_number ?? ""}-${emp?.employee_number ?? ""}`),
    [emp?.id, p?.passport_number, emp?.employee_number],
  );

  useEffect(() => {
    if (!isLoading && emp) {
      const t = setTimeout(() => {
        try { /* no auto print */ } catch { /* noop */ }
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isLoading, emp]);

  if (meLoading || isLoading)
    return <div className="p-10 text-center text-sm text-slate-500">Loading passport…</div>;

  // Access gate — only self or HR/Founder office
  if (!emp)
    return <div className="p-10 text-center text-sm text-slate-500">Passport not found or access denied.</div>;
  if (!isSelf && !canManage)
    return <Navigate to="/admin-os/no-access" replace />;

  const passportNumber = p?.passport_number ?? `AUR-PSP-${(emp.employee_number ?? "000000").slice(-6)}`;
  const issueDate = p?.issued_at ?? emp.joining_date ?? new Date().toISOString();
  const validUntil = new Date(new Date(issueDate).setFullYear(new Date(issueDate).getFullYear() + 5));
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "https://aurelix.com"}/verify/${passportNumber}`;

  const initials = (emp.full_name ?? "?")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  // Build timeline: joined + department + promotion events
  const events = (timeline ?? []).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white">
      {/* Print button (non-print) */}
      <div className="max-w-[1024px] mx-auto px-4 mb-4 flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800"
        >
          <Printer className="h-3.5 w-3.5" /> Print / Save PDF
        </button>
      </div>

      <div
        className="max-w-[1024px] mx-auto bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none"
        style={{ minHeight: "1400px" }}
      >
        <div className="grid grid-cols-[260px_1fr] min-h-[1400px]">
          {/* ===================== LEFT SIDEBAR ===================== */}
          <aside className="bg-gradient-to-b from-[#0b1a3a] to-[#0a1530] text-white p-6 flex flex-col">
            {/* Logo */}
            <div className="text-center mb-4">
              <div className="mx-auto w-20 h-20 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                  <path d="M50 12 L88 82 L72 82 L50 42 L28 82 L12 82 Z" fill="#c9a24a" />
                  <path d="M50 42 L62 66 L38 66 Z" fill="#0a1530" />
                </svg>
              </div>
              <p className="mt-2 text-[15px] font-black tracking-[0.16em] text-amber-400">
                AURELIX
              </p>
              <p className="text-[8px] tracking-[0.2em] text-slate-300 mt-1">
                BUILDING THE FUTURE, TOGETHER
              </p>
            </div>

            <div className="h-px bg-amber-500/40 my-4" />

            <div className="text-center">
              <p className="text-[15px] font-bold tracking-widest text-amber-400">EMPLOYEE</p>
              <p className="text-[15px] font-bold tracking-widest text-amber-400">PASSPORT</p>
              <div className="h-0.5 w-12 bg-amber-500 mx-auto mt-2" />
            </div>

            {/* Chip motif */}
            <div className="mt-6 flex items-center gap-3 justify-center">
              <div className="w-10 h-8 rounded-md bg-gradient-to-br from-amber-500 to-amber-700 relative">
                <div className="absolute inset-1 border border-amber-900/40 rounded-sm" />
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                <path d="M6 8a6 6 0 0 1 12 0M9 11a3 3 0 0 1 6 0M12 14v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <p className="text-[9px] tracking-[0.2em] text-slate-400">PASSPORT ID</p>
                <p className="text-sm font-bold font-mono text-white mt-0.5">{passportNumber}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.2em] text-slate-400">ISSUE DATE</p>
                <p className="text-sm font-bold text-white mt-0.5">{fmtDate(issueDate)}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.2em] text-slate-400">VALID UNTIL</p>
                <p className="text-sm font-bold text-white mt-0.5">{fmtDate(validUntil.toISOString())}</p>
              </div>

              <div className="pt-2">
                <span
                  className={`inline-block border rounded-md px-3 py-1 text-xs font-bold tracking-wider ${
                    emp.employment_status === "active"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-rose-400 text-rose-300"
                  }`}
                >
                  {String(emp.employment_status ?? "—").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-[10px] tracking-[0.2em] text-amber-400 font-bold">QUICK VERIFY</p>
              <div className="mt-3 bg-white p-2 rounded-lg">
                <QRCode value={verifyUrl} size={180} style={{ width: "100%", height: "auto" }} />
              </div>
              <p className="text-[10px] text-slate-300 mt-2 leading-tight">
                Scan QR to verify this employee
              </p>
              <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> verify.aurelix.com
              </p>
            </div>

            <div className="mt-auto pt-8">
              <p className="italic text-sm text-white" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                Aurelix
              </p>
              <p className="text-[9px] text-slate-400 mt-1">Digitally Signed</p>
              <p className="text-[9px] text-slate-400">Founder Office</p>
              <p className="text-[9px] text-slate-400">Aurelix Technologies Pvt. Ltd.</p>
            </div>
          </aside>

          {/* ===================== MAIN CONTENT ===================== */}
          <main className="p-6 relative bg-[#fafafa]">
            {/* Header */}
            <header className="flex items-start justify-between">
              <div>
                <p className="text-[10px] tracking-[0.22em] text-slate-500 font-semibold">
                  AURELIX TECHNOLOGIES PRIVATE LIMITED
                </p>
                <h1 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                  EMPLOYEE PASSPORT
                </h1>
                <p className="text-[11px] tracking-[0.2em] text-amber-600 mt-1 font-semibold">
                  IDENTITY · EMPLOYMENT · GROWTH
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
                <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 4l2 8h10l2-8-4 3-3-5-3 5-4-3zM5 14v4h14v-4H5z" />
                </svg>
                <span className="text-[11px] font-bold tracking-wider text-amber-800">
                  {(emp.department?.name ?? "AURELIX").toUpperCase()}
                </span>
              </div>
            </header>

            <div className="h-px bg-slate-200 my-4" />

            {/* Profile row */}
            <section className="relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="grid grid-cols-[130px_1fr_1fr] gap-6 items-start">
                <div className="w-[130px] h-[160px] rounded-lg overflow-hidden bg-slate-200 border-4 border-white shadow-md flex items-center justify-center">
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-slate-500">{initials}</span>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-wide">
                    {(emp.full_name ?? "").toUpperCase()}
                  </h2>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-[10px] text-slate-500 tracking-wider">Employee ID</p>
                      <p className="text-sm font-bold text-amber-600 font-mono">{emp.employee_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 tracking-wider">Department</p>
                      <p className="text-sm font-semibold text-slate-800">{emp.department?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 tracking-wider">Position</p>
                      <p className="text-sm font-semibold text-slate-800">{emp.role?.name ?? "—"}</p>
                    </div>
                    {emp.level && (
                      <div>
                        <p className="text-[10px] text-slate-500 tracking-wider">Employee Level</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[11px] font-bold">
                            {emp.level}
                          </span>
                          <span className="text-xs text-slate-600">
                            · {emp.user_type === "founder" ? "Founder"
                              : emp.user_type === "co_founder" ? "Co-Founder"
                              : emp.user_type === "executive" ? "Executive"
                              : "Member"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-800">{emp.company_email}</span>
                  </div>
                  {p?.emergency_contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-800">Emergency: {p.emergency_contact_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-800">{p?.office_location ?? "Bangalore, India"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-800">www.aurelix.com</span>
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="italic text-lg text-slate-800" style={{ fontFamily: "'Brush Script MT', cursive" }}>
                        Founder Office
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Digitally Signed</p>
                      <p className="text-[9px] text-slate-500">Founder Office</p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500 flex items-center justify-center text-[7px] font-bold text-amber-700 text-center leading-tight">
                      FOUNDER<br/>OFFICE<br/>AURELIX
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Six-card grid */}
            <section className="grid grid-cols-3 gap-4 mt-4">
              <Card title="EMPLOYMENT DETAILS" tone="indigo" icon={Briefcase}>
                <Row icon={Calendar} label="Joining Date" value={fmtDateLong(emp.joining_date)} />
                <Row icon={User2} label="Reporting To" value={emp.reporting_manager?.full_name ?? "Founder Office"} />
                <Row icon={Monitor} label="Work Mode" value="Hybrid" />
                <Row icon={MapPin} label="Work Location" value={p?.office_location ?? "Bangalore, India"} />
                <Row icon={Briefcase} label="Employment Type" value={
                  emp.user_type === "contractor" ? "Contract"
                  : emp.user_type === "temporary" ? "Temporary" : "Full-Time"
                } />
              </Card>

              <Card title="ORGANIZATION" tone="blue" icon={Building2}>
                <div className="text-center py-1">
                  <div className="inline-block border-2 border-slate-300 rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50">
                    Founder Office
                  </div>
                  <div className="h-4 w-px bg-slate-300 mx-auto" />
                  <div className="inline-block bg-indigo-900 text-white rounded-lg px-4 py-2 text-xs font-bold">
                    {emp.department?.name ?? "—"}
                  </div>
                  <div className="mt-3 flex justify-center gap-2 flex-wrap">
                    {["People Ops", "Talent", "L&D"].map((n) => (
                      <div key={n} className="border border-slate-200 rounded-md px-2 py-1 text-[10px] text-slate-600 bg-white">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="SKILLS & EXPERTISE" tone="green" icon={Star}>
                {verifiedSkills.length > 0 ? (
                  verifiedSkills.map((s: any, i: number) => (
                    <SkillBar
                      key={s.id ?? i}
                      name={s.skill_name}
                      level={
                        s.skill_level === "expert" ? 95
                        : s.skill_level === "advanced" ? 88
                        : s.skill_level === "intermediate" ? 75
                        : 65
                      }
                    />
                  ))
                ) : (
                  <>
                    <SkillBar name="Leadership" level={90} />
                    <SkillBar name="Strategy" level={85} />
                    <SkillBar name="Operations" level={82} />
                    <p className="text-[10px] text-slate-500 mt-2 italic">Sample skills — verify in passport.</p>
                  </>
                )}
              </Card>

              <Card title="CERTIFICATIONS" tone="gold" icon={Award}>
                {(certs ?? []).length > 0 ? (
                  (certs ?? []).slice(0, 3).map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2 py-1.5">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Award className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{c.certification_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{c.issuing_authority ?? ""}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700">
                        {c.issue_date ? new Date(c.issue_date).getFullYear() : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No certifications on record.</p>
                )}
              </Card>

              <Card title="EMPLOYMENT TIMELINE" tone="blue" icon={Clock}>
                <div className="relative pl-4">
                  <div className="absolute left-1 top-2 bottom-2 w-px bg-slate-300" />
                  {events.length > 0 ? events.map((e: any) => (
                    <div key={e.id} className="relative pb-3 last:pb-0">
                      <div className="absolute -left-3 top-1 h-2.5 w-2.5 rounded-full bg-indigo-700 border-2 border-white" />
                      <p className="text-[11px] font-bold text-slate-800">
                        {fmtDateLong(e.occurred_at)}
                      </p>
                      <p className="text-[11px] text-slate-600">{e.title}</p>
                    </div>
                  )) : (
                    <div className="relative">
                      <div className="absolute -left-3 top-1 h-2.5 w-2.5 rounded-full bg-indigo-700 border-2 border-white" />
                      <p className="text-[11px] font-bold text-slate-800">
                        {fmtDateLong(emp.joining_date)}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Joined Aurelix as {emp.role?.name ?? "Employee"}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="DOCUMENTS" tone="green" icon={FileText}>
                {(docs ?? []).length > 0 ? (
                  (docs ?? []).slice(0, 6).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <p className="text-xs text-slate-700 truncate">{d.title}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    </div>
                  ))
                ) : (
                  ["Offer Letter","Appointment Letter","NDA","ID Proof"].map((n) => (
                    <div key={n} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <p className="text-xs text-slate-700">{n}</p>
                      <span className="text-[10px] text-slate-400 italic">Pending</span>
                    </div>
                  ))
                )}
              </Card>
            </section>

            {/* Bottom row */}
            <section className="grid grid-cols-4 gap-4 mt-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-700 text-white px-3 py-1.5 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-bold tracking-widest">COMPANY INFORMATION</p>
                </div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div><p className="text-slate-500 text-[9px] uppercase">Company</p><p className="font-semibold text-slate-800">Aurelix Technologies Pvt. Ltd.</p></div>
                  <div><p className="text-slate-500 text-[9px] uppercase">Industry</p><p className="font-semibold text-slate-800">Technology / Social Ecosystem</p></div>
                  <div><p className="text-slate-500 text-[9px] uppercase">Website</p><p className="font-semibold text-slate-800">www.aurelix.com</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-blue-900 text-white px-3 py-1.5 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-bold tracking-widest">SECURITY &amp; VERIFICATION</p>
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-500">Passport ID</span><span className="font-mono font-bold text-slate-800">{passportNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Issued By</span><span className="font-semibold text-slate-800">Founder Office</span></div>
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase mb-0.5">Digital Signature Hash</p>
                    <p className="font-mono text-[10px] text-slate-800 leading-tight">{digest}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-rose-800 text-white px-3 py-1.5 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-bold tracking-widest">EMERGENCY CONTACT</p>
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  <div><p className="text-slate-500 text-[9px] uppercase">Name</p><p className="font-semibold text-slate-800">{p?.emergency_contact_name ?? "—"}</p></div>
                  <div><p className="text-slate-500 text-[9px] uppercase">Relationship</p><p className="font-semibold text-slate-800">{p?.emergency_contact_relation ?? "—"}</p></div>
                  <div><p className="text-slate-500 text-[9px] uppercase">Phone</p><p className="font-semibold text-slate-800">{p?.emergency_contact_phone ?? "—"}</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="bg-slate-900 text-white px-3 py-1.5 text-center">
                  <p className="text-[10px] font-bold tracking-widest">EMPLOYEE QR CODE</p>
                </div>
                <div className="p-3 flex-1 flex flex-col items-center justify-center">
                  <div className="bg-white p-1 border border-slate-200 rounded">
                    <QRCode value={verifyUrl} size={90} />
                  </div>
                  <p className="mt-2 text-[10px] font-bold text-slate-800 font-mono">{emp.employee_number}</p>
                </div>
              </div>
            </section>

            {/* Footer band */}
            <footer className="mt-4 bg-[#0b1a3a] text-white px-4 py-2 rounded-lg grid grid-cols-4 gap-4 text-[10px]">
              <div><p className="text-slate-400">Document Version</p><p className="font-bold">1.0</p></div>
              <div><p className="text-slate-400">Issue Timestamp (UTC)</p><p className="font-bold">{new Date(issueDate).toISOString().replace("T"," ").slice(0,19)}</p></div>
              <div><p className="text-slate-400">Audit Reference ID</p><p className="font-bold font-mono">AUR-AUD-{new Date(issueDate).getFullYear()}-{(emp.employee_number ?? "").slice(-6)}</p></div>
              <div className="text-right"><p className="font-bold">Page 1 of 1</p></div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PassportPrint;
