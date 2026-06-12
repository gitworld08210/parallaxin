import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Clock, Download, ExternalLink, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Cert {
  id: string;
  post_id: string;
  creator_id: string;
  content_hash: string;
  media_url: string;
  media_type: string;
  ots_status: string;
  ots_confirmed_at: string | null;
  bitcoin_block_height: number | null;
  created_at: string;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

const Certificate = () => {
  const { postId } = useParams();
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error } = await supabase
        .from("ownership_certificates")
        .select("*, profile:profiles!ownership_certificates_creator_id_fkey(username, display_name, avatar_url)")
        .eq("post_id", postId)
        .maybeSingle();
      if (error) toast.error(error.message);
      setCert(data as any);
      setLoading(false);
    })();
  }, [postId]);

  const copyHash = async () => {
    if (!cert) return;
    await navigator.clipboard.writeText(cert.content_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadPdf = () => {
    if (!cert) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ownership-pdf?id=${cert.id}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!cert) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-display text-xl font-bold">No certificate found</h1>
          <p className="text-sm text-muted-foreground mt-1">This post hasn't been certified.</p>
          <Link to="/" className="text-sm text-primary mt-4 inline-block">Back to Aurelix</Link>
        </div>
      </div>
    );
  }

  const statusColor = cert.ots_status === "confirmed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
    : cert.ots_status === "failed" ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-amber-500/10 text-amber-500 border-amber-500/30";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <header className="text-center pt-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Ownership Certificate</h1>
          <p className="text-xs text-muted-foreground mt-1">Aurelix · Verifiable proof of timestamp</p>
        </header>

        <div className="glass rounded-2xl p-5 border border-border space-y-4">
          {cert.media_type === "image" ? (
            <img src={cert.media_url} alt="Certified media" className="w-full max-h-80 object-contain rounded-xl bg-muted" />
          ) : (
            <video src={cert.media_url} controls className="w-full max-h-80 rounded-xl bg-muted" />
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Creator</p>
              <p className="font-semibold mt-0.5">@{cert.profile?.username ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Issued</p>
              <p className="font-semibold mt-0.5">{new Date(cert.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">SHA-256 hash of original media</p>
            <button onClick={copyHash} className="w-full font-mono text-[11px] break-all bg-muted/50 rounded-lg p-3 text-left flex items-start gap-2 hover:bg-muted transition-colors">
              <span className="flex-1">{cert.content_hash}</span>
              {copied ? <Check className="h-4 w-4 text-emerald-500 shrink-0" /> : <Copy className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          </div>

          <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${statusColor}`}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-semibold capitalize">
                OpenTimestamps: {cert.ots_status}
              </span>
            </div>
            {cert.bitcoin_block_height && (
              <span className="text-xs">Bitcoin block #{cert.bitcoin_block_height}</span>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={downloadPdf} className="flex-1 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <Link to={`/p/${cert.post_id}`} className="px-4 py-3 rounded-md bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4" /> View post
            </Link>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-border space-y-3 text-sm">
          <h2 className="font-semibold">What this proves</h2>
          <p className="text-muted-foreground">
            The exact file with the SHA-256 hash above existed under this Aurelix account at the issued timestamp. The hash is anchored to the Bitcoin blockchain via OpenTimestamps — independently verifiable by any third party.
          </p>
          <h2 className="font-semibold pt-2">What it doesn't prove</h2>
          <p className="text-muted-foreground">
            This is not a substitute for official copyright registration. For full legal protection, register your work with your national copyright office.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
