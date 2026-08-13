/**
 * Virtual World — private calling & messaging over a shared company number.
 *
 * Access is gated: a user must submit an Aadhaar-based KYC request, which the
 * Admin OS Verification department approves or declines. Once approved, the
 * user can place calls and send SMS / WhatsApp through Twilio without ever
 * revealing their own phone number.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe2, ArrowLeft, ShieldCheck, Phone, MessageSquare, Send, Upload,
  Clock, CheckCircle2, XCircle, Loader2, Lock,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useVirtualWorld, uploadKycFile } from "@/hooks/useVirtualWorld";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, tint: "text-emerald-500 bg-emerald-500/10" },
  { key: "sms", label: "SMS", icon: Send, tint: "text-sky-500 bg-sky-500/10" },
  { key: "voice", label: "Call", icon: Phone, tint: "text-indigo-500 bg-indigo-500/10" },
] as const;

type ChannelKey = (typeof CHANNELS)[number]["key"];

const FilePick = ({
  label, file, onPick,
}: { label: string; file: File | null; onPick: (f: File | null) => void }) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 text-sm hover:bg-muted/40">
    <Upload className="h-4 w-4 text-muted-foreground" />
    <span className="flex-1 truncate">{file ? file.name : label}</span>
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => onPick(e.target.files?.[0] ?? null)}
    />
  </label>
);

const VirtualWorld = () => {
  const { user } = useAuth();
  const { application, access, logs, loading, refresh } = useVirtualWorld();

  // KYC form
  const [fullName, setFullName] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Console
  const [channel, setChannel] = useState<ChannelKey>("whatsapp");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submitApplication = async () => {
    if (!user) return;
    const digits = aadhaar.replace(/\D/g, "");
    if (fullName.trim().length < 3) return toast.error("Enter your full name as on Aadhaar");
    if (digits.length !== 12) return toast.error("Aadhaar number must be 12 digits");
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) return toast.error("Phone must be like +919876543210");
    if (purpose.trim().length < 10) return toast.error("Tell us why you need Virtual World access");
    if (!front || !selfie) return toast.error("Aadhaar front image and a selfie are required");

    setSubmitting(true);
    try {
      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadKycFile(user.uid, "aadhaar-front", front),
        back ? uploadKycFile(user.uid, "aadhaar-back", back) : Promise.resolve(null),
        uploadKycFile(user.uid, "selfie", selfie),
      ]);

      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      
      await addDoc(collection(db, "virtual_world_applications"), {
        user_id: user.uid,
        full_name: fullName.trim(),
        aadhaar_number: digits,
        aadhaar_front_path: frontPath,
        aadhaar_back_path: backPath,
        selfie_path: selfiePath,
        contact_phone: phone.trim(),
        purpose: purpose.trim(),
        status: "pending",
        created_at: serverTimestamp()
      });

      toast.success("Request sent to the Verification department");
      await refresh();
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setSubmitting(false);
    }
  };

  const send = async () => {
    if (!/^\+[1-9]\d{7,14}$/.test(to.trim())) return toast.error("Enter number like +919876543210");
    if (channel !== "voice" && message.trim().length < 1) return toast.error("Write a message first");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("virtual-world-send", {
        body: {
          channel,
          to: to.trim(),
          message: message.trim(),
          callerPhone: application?.contact_phone ?? undefined,
        },
      });

      if (error) {

        console.error("Virtual World invocation error:", error);
        throw error;
      }

      if ((data as any)?.error) {
        const details = (data as any).details ? ` (${(data as any).details})` : "";
        throw new Error(`${(data as any).error}${details}`);
      }
      toast.success(channel === "voice" ? "Calling your phone, then connecting…" : "Sent");
      setMessage("");
      await refresh();
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setSending(false);
    }
  };

  const status = application?.status;
  const approved = !!access?.is_active;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/" aria-label="Back to home"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="rounded-xl bg-primary/10 p-2 text-primary"><Globe2 className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Virtual World</h1>
          <p className="text-xs text-muted-foreground">Call & message anyone without sharing your number</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : approved ? (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Verified access
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {access?.daily_limit ?? 25} actions / day
              </span>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setChannel(c.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors",
                    channel === c.key ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/40",
                  )}
                >
                  <c.icon className="h-5 w-5" />
                  {c.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="vw-to">Recipient number</Label>
                <Input id="vw-to" inputMode="tel" placeholder="+919876543210" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              {channel !== "voice" && (
                <div>
                  <Label htmlFor="vw-msg">Message</Label>
                  <Textarea id="vw-msg" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message…" />
                </div>
              )}
              <Button className="w-full" onClick={send} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {channel === "voice" ? "Start private call" : "Send privately"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Everything goes out from the shared Aurelix company number. Your personal number is never shown.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Recent activity</p>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="divide-y">
                {logs.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="font-medium capitalize">{l.channel}</span>
                    <span className="truncate text-muted-foreground">{l.to_number}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{l.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : status === "pending" ? (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <h2 className="text-base font-semibold">Request under review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The Verification department is reviewing your documents. You'll get access as soon as it's approved.
          </p>
        </div>
      ) : status === "rejected" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 text-center">
            <XCircle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
            <h2 className="text-base font-semibold">Request declined</h2>
            {application?.review_note && (
              <p className="mt-1 text-sm text-muted-foreground">{application.review_note}</p>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">You can submit a fresh request below.</p>
          <KycForm />
        </div>
      ) : (
        <KycForm />
      )}
    </div>
  );

  function KycForm() {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
          <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Virtual World is restricted. Submit your identity details — the Verification department will
            approve or decline. Documents are stored privately and only verification staff can open them.
          </p>
        </div>

        <div>
          <Label htmlFor="vw-name">Full name (as on Aadhaar)</Label>
          <Input id="vw-name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label htmlFor="vw-aadhaar">Aadhaar number</Label>
          <Input id="vw-aadhaar" inputMode="numeric" placeholder="12 digits" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} maxLength={14} />
        </div>
        <div>
          <Label htmlFor="vw-phone">Your phone number</Label>
          <Input id="vw-phone" inputMode="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="mt-1 text-[11px] text-muted-foreground">Used only to ring you for calls — never shown to the other person.</p>
        </div>
        <div>
          <Label htmlFor="vw-purpose">Why do you need access?</Label>
          <Textarea id="vw-purpose" rows={3} maxLength={500} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        <div className="space-y-2">
          <FilePick label="Aadhaar front image" file={front} onPick={setFront} />
          <FilePick label="Aadhaar back image (optional)" file={back} onPick={setBack} />
          <FilePick label="Selfie photo" file={selfie} onPick={setSelfie} />
        </div>

        <Button className="w-full" onClick={submitApplication} disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Send request to Verification
        </Button>
      </div>
    );
  }
};

export default VirtualWorld;
