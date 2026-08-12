// Appoint a C-level executive from the Founder Office.
// - Creates auth user + employees row with auto AURE### ID
// - Generates a branded PDF joining letter
// - Uploads PDF to private storage bucket
// - Emails PDF via Gmail connector (from founder's own Gmail)
// - Returns temp password + signed URL for the founder as fallback
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NAVY = rgb(0.043, 0.09, 0.184);
const GOLD = rgb(0.85, 0.65, 0.13);
const DARK_TEXT = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.4, 0.4, 0.4);
const WHITE = rgb(1, 1, 1);
const HAIRLINE = rgb(0.85, 0.85, 0.85);

interface SlotDef {
  key: string;
  label: string;
  department_key: string | null;
  role_key: string;
  level: string;
  authorities: string[];
  responsibilities: string[];
}

const SLOTS: Record<string, SlotDef> = {
  co_founder: {
    key: "co_founder",
    label: "Co-Founder",
    department_key: "founder_office",
    role_key: "co_founder",
    level: "L7",
    authorities: [
      "Co-lead strategic direction of Aurelix.",
      "Approve founder-level governance decisions.",
      "Represent Aurelix externally with founder authority.",
      "Appoint department heads jointly with the Founder.",
      "Access all Admin OS modules and audit trails.",
    ],
    responsibilities: [
      "Strategic co-leadership.",
      "Cross-department oversight.",
      "Executive governance participation.",
      "Fiduciary duty to shareholders.",
    ],
  },
  hr_head: {
    key: "hr_head",
    label: "Head of People Operations",
    department_key: "people_ops",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Build and manage the People Operations Department.",
      "Recruit People Operations personnel after Founder Office approval.",
      "Create employee onboarding workflows.",
      "Manage Employee Passports.",
      "Issue official People Operations documents.",
      "Conduct performance reviews.",
      "Recommend promotions.",
      "Recommend disciplinary actions.",
      "Maintain employee records.",
      "Oversee HR compliance.",
      "Develop HR policies.",
      "Coordinate employee training programs.",
    ],
    responsibilities: [
      "Employee lifecycle management.",
      "Recruitment and hiring operations.",
      "Organization structure management.",
      "Employee engagement.",
      "Learning & development.",
      "Attendance governance.",
      "HR analytics.",
      "Policy implementation.",
      "Internal compliance.",
      "Workforce planning.",
      "Talent development.",
    ],
  },
  cto: {
    key: "cto",
    label: "Chief Technology Officer",
    department_key: "engineering",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead the Engineering & Product Department.",
      "Approve production deployments.",
      "Define technology stack and architecture.",
      "Manage engineering hiring after HR approval.",
      "Own platform reliability and security posture.",
    ],
    responsibilities: [
      "Engineering strategy and execution.",
      "Platform reliability.",
      "Product delivery cadence.",
      "Technical mentorship.",
      "Vendor and infrastructure decisions.",
    ],
  },
  cfo: {
    key: "cfo",
    label: "Chief Financial Officer",
    department_key: "finance",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead the Finance & Legal Department.",
      "Approve budgets within governance limits.",
      "Sign financial contracts up to authorized value.",
      "Oversee statutory and regulatory compliance.",
      "Manage relationships with auditors and banks.",
    ],
    responsibilities: [
      "Financial planning and reporting.",
      "Treasury and cash management.",
      "Compliance and audit readiness.",
      "Procurement governance.",
      "Investor reporting support.",
    ],
  },
  coo: {
    key: "coo",
    label: "Chief Operating Officer",
    department_key: "founder_office",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Coordinate cross-department operations.",
      "Own operational KPIs across the company.",
      "Approve inter-department escalations.",
    ],
    responsibilities: [
      "Operational excellence.",
      "Process governance.",
      "Cross-functional execution.",
    ],
  },
  cso: {
    key: "cso",
    label: "Chief Security Officer",
    department_key: "security",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead the Security Department.",
      "Approve security incident responses.",
      "Manage IAM and access reviews.",
      "Sign off on compliance certifications.",
    ],
    responsibilities: [
      "Threat and incident management.",
      "Access governance.",
      "Compliance oversight.",
      "Security policy authorship.",
    ],
  },
  cpo: {
    key: "cpo",
    label: "Chief Product Officer",
    department_key: "engineering",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Own product vision and roadmap.",
      "Approve feature launches.",
      "Coordinate design and research teams.",
    ],
    responsibilities: [
      "Product strategy.",
      "User research governance.",
      "Roadmap prioritization.",
    ],
  },
  general_counsel: {
    key: "general_counsel",
    label: "General Counsel",
    department_key: "finance",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead legal function within Finance & Legal.",
      "Approve contract templates and legal policies.",
      "Represent Aurelix in legal matters.",
    ],
    responsibilities: [
      "Legal risk management.",
      "Contract governance.",
      "Regulatory liaison.",
    ],
  },
  head_ts: {
    key: "head_ts",
    label: "Head of Trust & Safety",
    department_key: "trust_safety",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead the Trust & Safety Department.",
      "Approve enforcement policies.",
      "Oversee appeals and investigations.",
    ],
    responsibilities: [
      "Content moderation governance.",
      "Appeals oversight.",
      "Policy authorship.",
    ],
  },
  head_verification: {
    key: "head_verification",
    label: "Head of Verification",
    department_key: "verification",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead the Verification Department.",
      "Approve badge issuance policies.",
      "Oversee identity verification pipeline.",
    ],
    responsibilities: [
      "Identity trust governance.",
      "Badge integrity.",
      "Verification appeals oversight.",
    ],
  },
  head_support: {
    key: "head_support",
    label: "Head of Customer Support",
    department_key: "support",
    role_key: "department_head",
    level: "L6",
    authorities: [
      "Lead the Customer Support Department.",
      "Approve SLA policies.",
      "Oversee cross-department escalations.",
    ],
    responsibilities: [
      "Support operations excellence.",
      "SLA governance.",
      "Voice-of-customer relay.",
    ],
  },
};

function generateTempPassword(length = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function pad(n: number, w: number): string {
  return n.toString().padStart(w, "0");
}

function formatDate(d: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${pad(d.getDate(), 2)} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------- PDF Generator ----------
async function buildJoiningLetter(input: {
  fullName: string;
  employeeNumber: string;
  slot: SlotDef;
  departmentName: string;
  companyEmail: string;
  personalEmail: string;
  joiningDate: Date;
  tempPassword: string;
  loginUrl: string;
  founderName: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Aurelix Appointment Letter — ${input.slot.label}`);
  pdf.setAuthor("Aurelix Founder Office");
  pdf.setSubject("Official Letter of Appointment");

  const page = pdf.addPage([595, 842]); // A4
  const { width: W, height: H } = page.getSize();

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const times = await pdf.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  // --- Outer border
  page.drawRectangle({
    x: 8, y: 8, width: W - 16, height: H - 16,
    borderColor: NAVY, borderWidth: 1.2,
  });

  // --- Left navy sidebar
  const SB = 190;
  page.drawRectangle({
    x: 12, y: 12, width: SB, height: H - 24, color: NAVY,
  });

  // Gold top mini bar on sidebar
  page.drawRectangle({
    x: 12, y: H - 24, width: SB, height: 4, color: GOLD,
  });

  // Logo mark (stylized A triangle)
  const cx = 12 + SB / 2;
  const logoTop = H - 60;
  const logoH = 55;
  const logoW = 55;
  // Outer triangle
  page.drawSvgPath(
    `M ${cx} ${logoTop} L ${cx - logoW / 2} ${logoTop - logoH} L ${cx + logoW / 2} ${logoTop - logoH} Z`,
    { color: GOLD, borderColor: GOLD, borderWidth: 1 },
  );
  // Inner cut
  page.drawSvgPath(
    `M ${cx} ${logoTop - 18} L ${cx - 15} ${logoTop - logoH + 4} L ${cx + 15} ${logoTop - logoH + 4} Z`,
    { color: NAVY },
  );

  // AURELIX wordmark
  const brand = "AURELIX";
  const brandSize = 20;
  const bw = helvBold.widthOfTextAtSize(brand, brandSize);
  page.drawText(brand, {
    x: cx - bw / 2, y: logoTop - logoH - 22,
    size: brandSize, font: helvBold, color: GOLD,
  });
  const tag = "BUILDING THE FUTURE, TOGETHER";
  const tagSize = 6;
  const tw = helv.widthOfTextAtSize(tag, tagSize);
  page.drawText(tag, {
    x: cx - tw / 2, y: logoTop - logoH - 34,
    size: tagSize, font: helv, color: WHITE,
  });

  // Divider on sidebar
  page.drawLine({
    start: { x: 32, y: logoTop - logoH - 48 },
    end: { x: 12 + SB - 20, y: logoTop - logoH - 48 },
    thickness: 0.6, color: GOLD, opacity: 0.6,
  });

  // "FOUNDER OFFICE / OFFICIAL APPOINTMENT LETTER"
  let sy = logoTop - logoH - 62;
  const fo = "FOUNDER OFFICE";
  page.drawText(fo, {
    x: cx - helvBold.widthOfTextAtSize(fo, 10) / 2, y: sy,
    size: 10, font: helvBold, color: WHITE,
  });
  sy -= 14;
  const oal = "OFFICIAL APPOINTMENT";
  page.drawText(oal, {
    x: cx - helv.widthOfTextAtSize(oal, 8) / 2, y: sy,
    size: 8, font: helv, color: WHITE,
  });
  sy -= 10;
  const ltr = "LETTER";
  page.drawText(ltr, {
    x: cx - helv.widthOfTextAtSize(ltr, 8) / 2, y: sy,
    size: 8, font: helv, color: WHITE,
  });
  sy -= 12;
  page.drawLine({
    start: { x: 40, y: sy },
    end: { x: 12 + SB - 28, y: sy },
    thickness: 0.4, color: GOLD, opacity: 0.5,
  });

  // Sidebar meta rows helper
  sy -= 16;
  const metaLabel = (label: string) => {
    page.drawText(label, {
      x: 26, y: sy, size: 7, font: helvBold, color: GOLD,
    });
    sy -= 10;
  };
  const metaValue = (value: string) => {
    page.drawText(value, {
      x: 26, y: sy, size: 8, font: helv, color: WHITE,
    });
    sy -= 14;
  };

  const docId = `AUR-FO-APPT-${input.joiningDate.getFullYear()}-${input.employeeNumber.replace(/[^0-9]/g, "").padStart(4, "0")}`;
  metaLabel("DOCUMENT ID"); metaValue(docId);
  metaLabel("LETTER NO."); metaValue(`${input.slot.key.toUpperCase()}-${input.joiningDate.getFullYear()}-0001`);
  metaLabel("ISSUE DATE"); metaValue(formatDate(new Date()));

  sy -= 4;
  page.drawLine({
    start: { x: 26, y: sy }, end: { x: 12 + SB - 26, y: sy },
    thickness: 0.4, color: GOLD, opacity: 0.4,
  });
  sy -= 12;
  const ad = "APPOINTMENT DETAILS";
  page.drawText(ad, {
    x: cx - helvBold.widthOfTextAtSize(ad, 9) / 2, y: sy,
    size: 9, font: helvBold, color: WHITE,
  });
  sy -= 16;

  metaLabel("EMPLOYEE ID"); metaValue(input.employeeNumber);
  metaLabel("DEPARTMENT"); metaValue(input.departmentName);
  metaLabel("POSITION"); metaValue(input.slot.label);
  metaLabel("EMPLOYEE LEVEL"); metaValue(input.slot.level);
  metaLabel("REPORTS TO"); metaValue("Founder Office");
  metaLabel("EMPLOYMENT TYPE"); metaValue("Full-Time");
  metaLabel("JOINING DATE"); metaValue(formatDate(input.joiningDate));

  // Verification note at bottom of sidebar
  const vy = 60;
  page.drawLine({
    start: { x: 26, y: vy + 40 }, end: { x: 12 + SB - 26, y: vy + 40 },
    thickness: 0.4, color: GOLD, opacity: 0.4,
  });
  const dv = "DIGITAL VERIFICATION";
  page.drawText(dv, {
    x: cx - helvBold.widthOfTextAtSize(dv, 9) / 2, y: vy + 26,
    size: 9, font: helvBold, color: GOLD,
  });
  const vl = "verify.aurelix.com";
  page.drawText(vl, {
    x: cx - helv.widthOfTextAtSize(vl, 8) / 2, y: vy + 12,
    size: 8, font: helv, color: WHITE,
  });
  page.drawText(docId, {
    x: cx - helv.widthOfTextAtSize(docId, 6) / 2, y: vy,
    size: 6, font: helv, color: WHITE, opacity: 0.7,
  });

  // ==================== RIGHT SIDE ====================
  const RX = 12 + SB + 24; // right content x
  const RW = W - RX - 24;

  // Founder Office ribbon top-right
  page.drawRectangle({
    x: W - 100, y: H - 60, width: 80, height: 44, color: NAVY,
  });
  page.drawText("FOUNDER", {
    x: W - 100 + 40 - helvBold.widthOfTextAtSize("FOUNDER", 8) / 2,
    y: H - 32, size: 8, font: helvBold, color: WHITE,
  });
  page.drawText("OFFICE", {
    x: W - 100 + 40 - helvBold.widthOfTextAtSize("OFFICE", 8) / 2,
    y: H - 44, size: 8, font: helvBold, color: WHITE,
  });

  let ry = H - 70;

  // "Dear <name>,"
  page.drawText("Dear", {
    x: RX, y: ry, size: 13, font: times, color: DARK_TEXT,
  });
  page.drawText(`${input.fullName},`, {
    x: RX + 34, y: ry, size: 13, font: timesBold, color: GOLD,
  });
  ry -= 22;

  // Intro paragraph
  const intro = `Following the evaluation of your professional qualifications, leadership capabilities, and organizational alignment, the Founder Office of Aurelix is pleased to appoint you as:`;
  ry = drawWrapped(page, intro, RX, ry, RW, times, 10, DARK_TEXT, 13);
  ry -= 12;

  // Title
  const title = input.slot.label.toUpperCase();
  const titleSize = 20;
  const titleW = timesBold.widthOfTextAtSize(title, titleSize);
  // gold lines around
  const dashY = ry - titleSize + 6;
  page.drawLine({
    start: { x: RX, y: dashY }, end: { x: RX + 12, y: dashY },
    thickness: 1.5, color: GOLD,
  });
  page.drawText(title, {
    x: RX + 18, y: ry - titleSize + 2,
    size: titleSize, font: timesBold, color: DARK_TEXT,
  });
  const afterTitleX = RX + 18 + titleW + 6;
  page.drawLine({
    start: { x: afterTitleX, y: dashY }, end: { x: RX + RW, y: dashY },
    thickness: 1.5, color: GOLD,
  });
  ry -= titleSize + 12;

  // Effective date
  page.drawText("effective ", {
    x: RX, y: ry, size: 12, font: times, color: DARK_TEXT,
  });
  const effX = RX + times.widthOfTextAtSize("effective ", 12);
  const dateStr = formatDate(input.joiningDate);
  page.drawText(`${dateStr}.`, {
    x: effX, y: ry, size: 12, font: timesBold, color: GOLD,
  });
  ry -= 20;

  const body = `This appointment authorizes you to establish, manage, and lead the ${input.departmentName} in accordance with the governance policies, operational standards, and strategic vision of Aurelix.`;
  ry = drawWrapped(page, body, RX, ry, RW, times, 10.5, DARK_TEXT, 14);
  ry -= 8;

  // Divider
  page.drawLine({
    start: { x: RX, y: ry }, end: { x: RX + RW, y: ry },
    thickness: 0.6, color: HAIRLINE,
  });
  ry -= 16;

  // Two columns: Authority & Key Responsibilities
  const colW = (RW - 20) / 2;
  const authX = RX;
  const respX = RX + colW + 20;
  let colY = ry;
  page.drawText("AUTHORITY GRANTED", {
    x: authX, y: colY, size: 10, font: helvBold, color: GOLD,
  });
  page.drawText("KEY RESPONSIBILITIES", {
    x: respX, y: colY, size: 10, font: helvBold, color: GOLD,
  });
  colY -= 14;
  const bulletsA = drawBullets(page, input.slot.authorities, authX, colY, colW, helv, 8.5, DARK_TEXT, 11);
  const bulletsB = drawBullets(page, input.slot.responsibilities, respX, colY, colW, helv, 8.5, DARK_TEXT, 11);
  ry = Math.min(bulletsA, bulletsB) - 10;

  // Divider
  page.drawLine({
    start: { x: RX, y: ry }, end: { x: RX + RW, y: ry },
    thickness: 0.6, color: HAIRLINE,
  });
  ry -= 14;

  // Governance clauses
  const clauses: Array<[string, string]> = [
    ["CONFIDENTIALITY:", "You acknowledge that during your employment you may have access to confidential company information, employee records, operational processes, financial information, intellectual property, and strategic plans. You agree to maintain strict confidentiality during and after your employment in accordance with company policy."],
    ["CONFLICT OF INTEREST:", "You shall immediately disclose any actual or potential conflict of interest to the Founder Office."],
    ["DIGITAL GOVERNANCE:", "This appointment automatically grants access to Aurelix Admin OS and all authorized systems. Access permissions shall be governed through RBAC."],
    ["CONDITIONS:", "This appointment becomes effective after identity verification, acceptance of this appointment, account activation, security policy acceptance, and completion of onboarding."],
  ];
  for (const [k, v] of clauses) {
    page.drawText(k, { x: RX, y: ry, size: 8.5, font: helvBold, color: GOLD });
    const kw = helvBold.widthOfTextAtSize(k, 8.5);
    ry = drawWrapped(page, ` ${v}`, RX + kw, ry, RW - kw, helv, 8.5, DARK_TEXT, 11);
    ry -= 6;
  }

  ry -= 6;
  // ACCEPTANCE header
  const accW = helvBold.widthOfTextAtSize("ACCEPTANCE", 10);
  const accCX = RX + RW / 2;
  page.drawLine({
    start: { x: RX + 20, y: ry - 4 }, end: { x: accCX - accW / 2 - 8, y: ry - 4 },
    thickness: 0.5, color: GOLD, opacity: 0.6,
  });
  page.drawText("ACCEPTANCE", {
    x: accCX - accW / 2, y: ry - 8, size: 10, font: helvBold, color: GOLD,
  });
  page.drawLine({
    start: { x: accCX + accW / 2 + 8, y: ry - 4 }, end: { x: RX + RW - 20, y: ry - 4 },
    thickness: 0.5, color: GOLD, opacity: 0.6,
  });
  ry -= 22;
  ry = drawWrapped(
    page,
    "I hereby accept this appointment and agree to perform my responsibilities in accordance with the policies, ethics, governance framework, and standards established by Aurelix.",
    RX, ry, RW, times, 9, DARK_TEXT, 12, "center",
  );
  ry -= 26;

  // Signatures
  const sigColW = (RW - 40) / 2;
  const sigTop = ry;
  page.drawText("EMPLOYEE SIGNATURE", {
    x: RX, y: sigTop, size: 8, font: helvBold, color: DARK_TEXT,
  });
  page.drawText("FOUNDER OFFICE", {
    x: RX + sigColW + 40, y: sigTop, size: 8, font: helvBold, color: DARK_TEXT,
  });
  page.drawText("DIGITALLY APPROVED", {
    x: RX + sigColW + 40, y: sigTop - 10, size: 7, font: helv, color: MUTED,
  });

  const sigLineY = sigTop - 28;
  page.drawLine({
    start: { x: RX, y: sigLineY }, end: { x: RX + sigColW, y: sigLineY },
    thickness: 0.6, color: DARK_TEXT,
  });
  page.drawText(input.founderName, {
    x: RX + sigColW + 40, y: sigLineY + 4,
    size: 13, font: timesBold, color: DARK_TEXT,
  });
  page.drawLine({
    start: { x: RX + sigColW + 40, y: sigLineY },
    end: { x: RX + sigColW * 2 + 40, y: sigLineY },
    thickness: 0.6, color: DARK_TEXT,
  });

  page.drawText(`Name: ${input.fullName}`, {
    x: RX, y: sigLineY - 12, size: 8, font: helv, color: DARK_TEXT,
  });
  page.drawText(`Date: ${formatDate(new Date())}`, {
    x: RX, y: sigLineY - 22, size: 8, font: helv, color: DARK_TEXT,
  });
  page.drawText(`Founder: ${input.founderName}`, {
    x: RX + sigColW + 40, y: sigLineY - 12, size: 8, font: helv, color: DARK_TEXT,
  });
  page.drawText(`Date: ${formatDate(new Date())}`, {
    x: RX + sigColW + 40, y: sigLineY - 22, size: 8, font: helv, color: DARK_TEXT,
  });

  // Footer bar for page 1
  page.drawRectangle({
    x: 12, y: 12, width: W - 24, height: 22, color: NAVY,
  });
  {
    const footer1 = "AURELIX TECHNOLOGIES PRIVATE LIMITED   ·   www.aurelix.com";
    page.drawText(footer1, {
      x: (W - helv.widthOfTextAtSize(footer1, 8)) / 2,
      y: 20, size: 8, font: helv, color: GOLD,
    });
  }

  // ================= PAGE 2 — CONFIDENTIAL ACCESS =================
  const page2 = pdf.addPage([595, 842]);
  const P2W = 595;
  const P2H = 842;

  // Header band
  page2.drawRectangle({ x: 0, y: P2H - 90, width: P2W, height: 90, color: NAVY });
  page2.drawText("AURELIX", { x: 40, y: P2H - 45, size: 22, font: timesBold, color: GOLD });
  page2.drawText("FOUNDER OFFICE  ·  CONFIDENTIAL", {
    x: 40, y: P2H - 65, size: 9, font: helvBold, color: rgb(0.85, 0.85, 0.9),
  });
  page2.drawText(`Document: AUR-FO-APPT-${new Date().getFullYear()}-${input.employeeNumber.replace(/[^0-9]/g, "").padStart(4, "0")}`, {
    x: 40, y: P2H - 80, size: 8, font: helv, color: rgb(0.7, 0.7, 0.75),
  });

  // Title
  page2.drawText("FIRST-LOGIN CREDENTIALS", {
    x: 40, y: P2H - 130, size: 20, font: helvBold, color: DARK_TEXT,
  });
  page2.drawLine({
    start: { x: 40, y: P2H - 138 }, end: { x: 200, y: P2H - 138 },
    thickness: 2, color: GOLD,
  });

  page2.drawText(`For: ${input.fullName}  ·  ${input.slotLabel}`, {
    x: 40, y: P2H - 160, size: 10, font: helv, color: MUTED,
  });

  // Big credentials card
  const cardX = 40;
  const cardY = P2H - 190;
  const cardW = P2W - 80;
  const cardH = 260;
  page2.drawRectangle({
    x: cardX, y: cardY - cardH, width: cardW, height: cardH,
    borderColor: GOLD, borderWidth: 1.5,
    color: rgb(1, 0.98, 0.9), opacity: 0.5,
  });

  // Label bar
  page2.drawRectangle({
    x: cardX, y: cardY - 26, width: cardW, height: 26, color: GOLD,
  });
  page2.drawText("CONFIDENTIAL — LOGIN CREDENTIALS", {
    x: cardX + 14, y: cardY - 18, size: 10, font: helvBold, color: NAVY,
  });

  // Employee ID
  page2.drawText("EMPLOYEE ID", {
    x: cardX + 20, y: cardY - 52, size: 8, font: helvBold, color: MUTED,
  });
  page2.drawText(input.employeeNumber, {
    x: cardX + 20, y: cardY - 70, size: 16, font: timesBold, color: DARK_TEXT,
  });

  // Company Email
  page2.drawText("COMPANY EMAIL (LOGIN ID)", {
    x: cardX + 20, y: cardY - 100, size: 8, font: helvBold, color: MUTED,
  });
  page2.drawText(input.companyEmail, {
    x: cardX + 20, y: cardY - 118, size: 14, font: timesBold, color: DARK_TEXT,
  });

  // Temporary Password (highlighted)
  page2.drawText("TEMPORARY PASSWORD", {
    x: cardX + 20, y: cardY - 148, size: 8, font: helvBold, color: MUTED,
  });
  page2.drawRectangle({
    x: cardX + 20, y: cardY - 176, width: cardW - 40, height: 22,
    color: NAVY,
  });
  page2.drawText(input.tempPassword, {
    x: cardX + 30, y: cardY - 170, size: 14, font: helvBold, color: GOLD,
  });

  // Login URL
  page2.drawText("FIRST-LOGIN URL", {
    x: cardX + 20, y: cardY - 200, size: 8, font: helvBold, color: MUTED,
  });
  page2.drawText(input.loginUrl, {
    x: cardX + 20, y: cardY - 216, size: 10, font: helv, color: DARK_TEXT,
  });

  // Warning strip
  page2.drawRectangle({
    x: cardX + 20, y: cardY - 250, width: cardW - 40, height: 28,
    color: rgb(0.95, 0.3, 0.2), opacity: 0.12,
    borderColor: rgb(0.85, 0.2, 0.1), borderWidth: 0.6,
  });
  page2.drawText("!  Change password immediately after first login. Do NOT share these credentials.", {
    x: cardX + 30, y: cardY - 240, size: 8.5, font: helvBold, color: rgb(0.7, 0.15, 0.1),
  });

  // Instructions
  const instrY = cardY - cardH - 30;
  page2.drawText("HOW TO LOG IN", {
    x: 40, y: instrY, size: 11, font: helvBold, color: DARK_TEXT,
  });
  const steps = [
    `1.  Open  ${input.loginUrl}  in your browser.`,
    `2.  Enter your Company Email above as the login ID.`,
    `3.  Enter the Temporary Password exactly as shown.`,
    `4.  You will be prompted to set a new password.`,
    `5.  Complete 2FA setup using an authenticator app (Google Authenticator / Authy).`,
    `6.  Accept company policies to activate your Admin OS access.`,
  ];
  let iy = instrY - 18;
  for (const s of steps) {
    page2.drawText(s, { x: 44, y: iy, size: 9.5, font: helv, color: DARK_TEXT });
    iy -= 16;
  }

  // Footer for page 2
  page2.drawRectangle({
    x: 12, y: 12, width: P2W - 24, height: 22, color: NAVY,
  });
  const footer2 = "AURELIX TECHNOLOGIES PRIVATE LIMITED  ·  CONFIDENTIAL — DO NOT DISTRIBUTE";
  page2.drawText(footer2, {
    x: (P2W - helv.widthOfTextAtSize(footer2, 8)) / 2,
    y: 20, size: 8, font: helv, color: GOLD,
  });

  return await pdf.save();
}



function drawWrapped(
  page: any, text: string, x: number, y: number, maxW: number,
  font: any, size: number, color: any, lineH: number,
  align: "left" | "center" = "left",
): number {
  const words = text.split(/\s+/);
  let line = "";
  const lines: string[] = [];
  for (const w of words) {
    const cand = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(cand, size) <= maxW) {
      line = cand;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  for (const l of lines) {
    let lx = x;
    if (align === "center") {
      lx = x + (maxW - font.widthOfTextAtSize(l, size)) / 2;
    }
    page.drawText(l, { x: lx, y, size, font, color });
    y -= lineH;
  }
  return y;
}

function drawBullets(
  page: any, items: string[], x: number, y: number, maxW: number,
  font: any, size: number, color: any, lineH: number,
): number {
  for (const it of items) {
    page.drawCircle({ x: x + 3, y: y + 2.5, size: 1.4, color });
    const afterY = drawWrapped(page, it, x + 10, y, maxW - 10, font, size, color, lineH);
    y = afterY - 2;
  }
  return y;
}

function buildRfc2822(opts: {
  fromName: string; fromEmail: string;
  to: string; subject: string; html: string;
  pdfBytes: Uint8Array; pdfFilename: string;
}): string {
  const boundary = `aurelix-${crypto.randomUUID()}`;
  
  // Standard Base64 for MIME attachments
  let bin = "";
  for (const b of opts.pdfBytes) bin += String.fromCharCode(b);
  const std = btoa(bin);
  const wrapped = std.match(/.{1,76}/g)?.join("\r\n") ?? std;
  return [
    `From: "${opts.fromName}" <${opts.fromEmail}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.html,
    "",
    `--${boundary}`,
    "Content-Type: application/pdf",
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${opts.pdfFilename}"`,
    "",
    wrapped,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    // Verify caller is active founder, co-founder, or holds an active
    // Operations Head (COO) / HR Head appointment.
    const { data: callerEmp } = await admin
      .from("employees")
      .select("id, full_name, role:admin_roles!inner(key)")
      .eq("user_id", user.id)
      .eq("employment_status", "active")
      .maybeSingle();

    const callerRole = (callerEmp as any)?.role?.key;
    let allowed = callerRole === "founder" || callerRole === "co_founder";
    if (!allowed && callerEmp) {
      const { data: activeAppt } = await admin
        .from("executive_appointments")
        .select("slot_key")
        .eq("employee_id", (callerEmp as any).id)
        .is("revoked_at", null)
        .in("slot_key", ["coo", "hr_head"]);
      if (activeAppt && activeAppt.length > 0) allowed = true;
    }
    if (!callerEmp || !allowed) {
      return json({ error: "Only the Founder Office, Operations Head, or HR Head can appoint members." }, 403);
    }

    const body = await req.json();
    const slotKey: string = body.slot_key;
    const fullName: string = (body.full_name || "").trim();
    const personalEmail: string = (body.personal_email || "").trim().toLowerCase();
    const phone: string | null = body.phone || null;
    const joiningDateStr: string = body.joining_date || new Date().toISOString().slice(0, 10);
    const notes: string | null = body.notes || null;
    const skipEmail: boolean = !!body.skip_email;

    if (!slotKey || !SLOTS[slotKey]) return json({ error: "Invalid slot" }, 400);
    if (!fullName || fullName.length < 2) return json({ error: "Full name required" }, 400);
    if (!/^\S+@\S+\.\S+$/.test(personalEmail)) return json({ error: "Valid email required" }, 400);

    const slot = SLOTS[slotKey];

    // Prevent duplicate active appointment
    const { data: existing } = await admin
      .from("executive_appointments")
      .select("id")
      .eq("slot_key", slotKey)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing) {
      return json({ error: `${slot.label} slot is already filled. Revoke first to re-appoint.` }, 409);
    }

    // Resolve department + role
    let departmentId: string | null = null;
    let departmentName = slot.label;
    if (slot.department_key) {
      const { data: dept } = await admin
        .from("admin_departments")
        .select("id, name")
        .eq("key", slot.department_key)
        .maybeSingle();
      if (dept) { departmentId = dept.id; departmentName = dept.name; }
    }
    const { data: role } = await admin
      .from("admin_roles")
      .select("id")
      .eq("key", slot.role_key)
      .maybeSingle();
    if (!role) return json({ error: `Role ${slot.role_key} not found` }, 500);

    // Generate creds
    const tempPassword = generateTempPassword(18);

    // Derive email local part from the appointee's name (e.g. "Mukul Sharma" -> "mukul").
    // Fallback to slot key if name is unusable. Sanitize to [a-z0-9.] only.
    const sanitize = (s: string) =>
      s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "").slice(0, 32);
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = sanitize(nameParts[0] || "");
    const lastName = sanitize(nameParts.slice(1).join("") || "");
    const baseLocal = firstName || slot.key.replace(/_/g, ".");

    // Pick a company email that isn't already used (previous holders may still exist as revoked/suspended).
    // Try: first, first.last, first1, first2, ...
    let companyEmail = `${baseLocal}@aurelix.com`;
    let created: any = null;
    let createErr: any = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      let localPart: string;
      if (attempt === 0) localPart = baseLocal;
      else if (attempt === 1 && lastName) localPart = `${baseLocal}.${lastName}`;
      else localPart = `${baseLocal}${attempt}`;
      const candidate = `${localPart}@aurelix.com`;
      const res = await admin.auth.admin.createUser({
        email: candidate,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, appointment_slot: slotKey },
      });
      if (res.data?.user) {
        created = res.data;
        companyEmail = candidate;
        createErr = null;
        break;
      }
      createErr = res.error;
      const msg = (res.error?.message || "").toLowerCase();
      const isDup = msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("duplicate");
      if (!isDup) break;
    }
    if (!created?.user) {
      return json({ error: `Auth user creation failed: ${createErr?.message ?? "unknown"}` }, 500);
    }
    const newUserId = created.user.id;

    // Generate employee number
    const { data: numRow, error: numErr } = await admin.rpc("gen_employee_number");
    if (numErr || !numRow) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: `Employee number generation failed: ${numErr?.message}` }, 500);
    }
    const employeeNumber = numRow as string;

    // Create employee row
    const joiningDate = new Date(joiningDateStr);
    const { data: emp, error: empErr } = await admin
      .from("employees")
      .insert({
        user_id: newUserId,
        employee_number: employeeNumber,
        full_name: fullName,
        company_email: companyEmail,
        department_id: departmentId,
        role_id: role.id,
        user_type: slotKey === "co_founder" ? "co_founder" : "executive",
        level: slot.level,
        employment_status: "active",
        requires_password_change: true,
        requires_2fa_setup: true,
        reporting_manager_id: callerEmp.id,
        joining_date: joiningDateStr,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (empErr || !emp) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: `Employee insert failed: ${empErr?.message}` }, 500);
    }

    // Grant admin app_role
    await admin.from("user_roles").insert({ user_id: newUserId, role: "admin" });

    // Seed onboarding session + checklist so HR/People Ops sees the new
    // appointee in the onboarding queue and can open the detail view.
    const { data: onbSession } = await admin
      .from("onboarding_sessions")
      .insert({
        employee_id: emp.id,
        stage: "credentials_generated",
        hr_owner_user_id: user.id,
        joining_date: joiningDateStr,
        background_check_required: false,
        hr_notes: `Auto-created via Founder Office appointment (${slot.label}).`,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (onbSession?.id) {
      const HR_CHECK = [
        { key: "documents_verified", label: "Documents verified", order: 10 },
        { key: "department_assigned", label: "Department assigned", order: 20, done: true },
        { key: "role_assigned", label: "Role assigned", order: 30, done: true },
        { key: "manager_assigned", label: "Reporting manager assigned", order: 40, done: true },
        { key: "passport_created", label: "Employee passport created", order: 50 },
        { key: "welcome_email_sent", label: "Joining letter sent to appointee", order: 60 },
        { key: "employee_activated", label: "Employee activated", order: 70, done: true },
      ];
      const EMP_CHECK = [
        { key: "password_changed", label: "Change temporary password", order: 10 },
        { key: "twofa_enabled", label: "Enable two-factor authentication", order: 20 },
        { key: "profile_completed", label: "Complete profile", order: 30 },
        { key: "policies_accepted", label: "Accept company policies", order: 40 },
      ];
      const nowIso = new Date().toISOString();
      const items = [
        ...HR_CHECK.map((c) => ({
          employee_id: emp.id,
          session_id: onbSession.id,
          owner: "hr" as const,
          item_key: c.key,
          label: c.label,
          sort_order: c.order,
          completed: !!c.done,
          completed_at: c.done ? nowIso : null,
          completed_by: c.done ? user.id : null,
        })),
        ...EMP_CHECK.map((c) => ({
          employee_id: emp.id,
          session_id: onbSession.id,
          owner: "employee" as const,
          item_key: c.key,
          label: c.label,
          sort_order: c.order,
        })),
      ];
      await admin.from("employee_onboarding_checklist").insert(items);
    }

    // Generate PDF
    const origin = req.headers.get("origin") ?? "https://aurelix.lovable.app";
    const pdfBytes = await buildJoiningLetter({
      fullName,
      employeeNumber,
      slot,
      departmentName,
      companyEmail,
      personalEmail,
      joiningDate,
      tempPassword,
      loginUrl: `${origin}/auth`,
      founderName: (callerEmp as any).full_name || "Founder Office",
    });

    // Upload PDF
    const pdfPath = `appointments/${employeeNumber}-${slot.key}.pdf`;
    await admin.storage.from("joining-letters").upload(pdfPath, pdfBytes, {
      contentType: "application/pdf", upsert: true,
    });
    const { data: signed } = await admin.storage
      .from("joining-letters")
      .createSignedUrl(pdfPath, 60 * 60 * 24 * 30);

    // Auto-email appointee using Gmail connector
    let gmailMessageId: string | null = null;
    let emailError: string | null = null;

    if (!skipEmail) {
      if (!gmailKey || !lovableKey) {
        emailError = "Email connector keys missing (GOOGLE_MAIL_API_KEY / LOVABLE_API_KEY)";
        console.error(emailError);
      } else {
        try {
          const founderEmail = (callerEmp as any).company_email || "office@aurelix.com";
          const founderName = (callerEmp as any).full_name || "Aurelix Founder Office";
          const emailSubject = `Official Appointment: ${slot.label} — ${fullName}`;

          const html = `
            <div style="font-family: sans-serif; color: #111; max-width: 600px;">
              <h2 style="color: #0b172f;">Official Appointment: ${slot.label}</h2>
              <p>Dear ${fullName},</p>
              <p>Congratulations. Following our recent discussions, the Founder Office is pleased to officially appoint you to the position of <strong>${slot.label}</strong> at Aurelix.</p>
              <p>Your official letter of appointment is attached to this email. It contains your unique Employee ID, company email, and temporary login credentials for the Aurelix Admin OS.</p>
              <p style="background: #fdf6e3; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                <strong>Next Steps:</strong><br>
                1. Download and read your appointment letter.<br>
                2. Log in at <a href="${origin}/auth">${origin}/auth</a> using your company email.<br>
                3. You will be prompted to change your temporary password on first login.
              </p>
              <p>Welcome to the leadership team.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">
                This is an automated official communication from the Aurelix Founder Office.
              </p>
            </div>
          `;

          const rfc2822 = buildRfc2822({
            fromName: founderName,
            fromEmail: founderEmail,
            to: personalEmail,
            subject: emailSubject,
            html,
            pdfBytes,
            pdfFilename: `Appointment-Letter-${employeeNumber}.pdf`,
          });

          const res = await fetch("https://connector-gateway.lovable.dev/google_mail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": gmailKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw: base64UrlEncode(new TextEncoder().encode(rfc2822)) }),
          });

          const mailData = await res.json();
          if (res.ok) {
            gmailMessageId = mailData.id;
          } else {
            emailError = `Gmail API error: ${res.status} ${res.statusText} - ${JSON.stringify(mailData)}`;
            console.error("Gmail send failed:", emailError);
          }
        } catch (e) {
        emailError = (e as Error).message;
        console.error("Gmail send exception:", emailError);
        }
    }
  }

    // Record appointment
    await admin.from("executive_appointments").insert({
      slot_key: slotKey,
      slot_label: slot.label,
      department_id: departmentId,
      employee_id: emp.id,
      appointed_by: callerEmp.id,
      personal_email: personalEmail,
      gmail_message_id: gmailMessageId,
      pdf_path: pdfPath,
      notes,
    });

    // Audit log
    await admin.from("admin_audit_logs").insert({
      action: "executive.appointed",
      module: "founder_office",
      actor_user_id: user.id,
      target_type: "employee",
      target_id: emp.id,
      after: {
        slot: slotKey,
        label: slot.label,
        employee_number: employeeNumber,
        company_email: companyEmail,
        personal_email: personalEmail,
        email_sent: !!gmailMessageId,
      } as any,
    });

    return json({
      success: true,
      employee_id: emp.id,
      employee_number: employeeNumber,
      company_email: companyEmail,
      temp_password: tempPassword,
      pdf_signed_url: signed?.signedUrl ?? null,
      pdf_path: pdfPath,
      email_sent: !!gmailMessageId,
      gmail_message_id: gmailMessageId,
      email_error: emailError,
    });
  } catch (e) {
    const errorMsg = (e as Error).stack || (e as Error).message || String(e);
    console.error("appoint-executive fatal error:", errorMsg);
    return json({ error: errorMsg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
