// Generate a downloadable plain-text/PDF-like ownership certificate.
// We emit a minimal valid PDF (single-page text) without external deps.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const escapePdf = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Build a tiny single-page PDF with multiple text lines.
const buildPdf = (lines: string[]): Uint8Array => {
  const contentStream = [
    "BT",
    "/F1 12 Tf",
    "14 TL",
    "50 780 Td",
    ...lines.map((l, i) => (i === 0 ? `(${escapePdf(l)}) Tj` : `T* (${escapePdf(l)}) Tj`)),
    "ET",
  ].join("\n");
  const stream = `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    stream,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const cert_id = url.searchParams.get("id") || (await req.json().catch(() => ({})))?.cert_id;
    if (!cert_id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cert, error } = await supabase
      .from("ownership_certificates")
      .select("id, post_id, content_hash, media_type, ots_status, ots_confirmed_at, bitcoin_block_height, created_at, creator_id, profiles:profiles!ownership_certificates_creator_id_fkey(username, display_name)")
      .eq("id", cert_id)
      .single();
    if (error || !cert) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const profile = (cert as any).profiles;
    const lines = [
      "AURELIX — CONTENT OWNERSHIP CERTIFICATE",
      "",
      `Certificate ID: ${cert.id}`,
      `Issued:         ${new Date(cert.created_at).toUTCString()}`,
      "",
      `Creator:        ${profile?.display_name ?? ""}  @${profile?.username ?? "—"}`,
      `Creator UID:    ${cert.creator_id}`,
      `Post ID:        ${cert.post_id}`,
      `Media type:     ${cert.media_type}`,
      "",
      "SHA-256 hash of original media:",
      cert.content_hash,
      "",
      `OpenTimestamps: ${cert.ots_status}` + (cert.bitcoin_block_height ? `  (Bitcoin block ${cert.bitcoin_block_height})` : ""),
      cert.ots_confirmed_at ? `Confirmed at:   ${new Date(cert.ots_confirmed_at).toUTCString()}` : "",
      "",
      "WHAT THIS PROVES",
      "The exact file whose SHA-256 hash is shown above existed under",
      "the named Aurelix account at the issuance timestamp. The hash is",
      "submitted to the OpenTimestamps protocol, which periodically",
      "anchors batches of hashes to the Bitcoin blockchain — providing",
      "independent, third-party-verifiable proof of timestamp.",
      "",
      "WHAT THIS DOES NOT PROVE",
      "This certificate is NOT a substitute for official copyright",
      "registration with a national copyright office. For full legal",
      "protection, register the work with the appropriate authority.",
      "",
      `Verify online: https://auralixq.lovable.app/certificate/${cert.post_id}`,
    ];

    const pdf = buildPdf(lines);
    return new Response(pdf, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aurelix-certificate-${cert.id}.pdf"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
