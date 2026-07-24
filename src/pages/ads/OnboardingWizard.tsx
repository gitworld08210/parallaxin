import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight, ChevronLeft, Building2, User } from "lucide-react";
import {
  useCreateAdvertiser,
  type AdvertiserType,
  type BillingMode,
} from "@/hooks/ads/useAdvertiser";

const input =
  "w-full bg-secondary/60 border border-border rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 transition-colors";

export default function AdsOnboardingWizard() {
  const nav = useNavigate();
  const create = useCreateAdvertiser();
  const [step, setStep] = useState(0);

  const [type, setType] = useState<AdvertiserType>("organization");
  const [display_name, setDisplayName] = useState("");
  const [legal_name, setLegalName] = useState("");
  const [country, setCountry] = useState("IN");
  const [website, setWebsite] = useState("");
  const [gstin, setGstin] = useState("");

  const [billing_mode, setBillingMode] = useState<BillingMode>("prepaid_wallet");
  const [billing_email, setBillingEmail] = useState("");
  const [billing_name, setBillingName] = useState("");
  const [address_line1, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postal_code, setPostal] = useState("");

  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);

  const canNext =
    (step === 0) ||
    (step === 1 && display_name.trim().length >= 2) ||
    (step === 2 && billing_email.trim().length > 3) ||
    (step === 3 && consent1 && consent2);

  const submit = async () => {
    const adv = await create.mutateAsync({
      type,
      display_name: display_name.trim(),
      legal_name: legal_name.trim() || undefined,
      country,
      billing_mode,
      billing: {
        billing_email: billing_email.trim(),
        billing_name: billing_name.trim() || undefined,
        address_line1: address_line1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postal_code: postal_code.trim() || undefined,
        country,
        gstin: gstin.trim() || undefined,
      },
      consent: { ads_policy: consent1, data_use: consent2 },
    });
    nav(`/ads/${adv.id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="relative mx-auto max-w-lg px-5 py-8">
        <div className="text-center mb-6">
          <span className="inline-flex h-14 w-14 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-3">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Set up your advertiser</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step {step + 1} of 4 · {["Entity", "Details", "Billing", "Consent"][step]}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {(["organization", "creator"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-2 py-6 rounded-xl border transition-all ${
                    type === t
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/40"
                  }`}
                >
                  {t === "organization" ? (
                    <Building2 className="h-6 w-6 text-primary" />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                  <span className="text-sm font-semibold capitalize">{t}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              <input className={input} placeholder="Brand / display name" value={display_name} onChange={(e) => setDisplayName(e.target.value)} />
              <input className={input} placeholder="Legal entity name (optional)" value={legal_name} onChange={(e) => setLegalName(e.target.value)} />
              <input className={input} placeholder="Website (optional)" value={website} onChange={(e) => setWebsite(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={input} placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
                <input className={input} placeholder="GSTIN (optional)" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-2">
                {(["prepaid_wallet", "postpaid_invoice"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBillingMode(m)}
                    className={`py-4 rounded-xl border text-sm font-semibold transition-all ${
                      billing_mode === m ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
                    }`}
                  >
                    {m === "prepaid_wallet" ? "Prepaid (UPI top-up)" : "Postpaid invoice"}
                  </button>
                ))}
              </div>
              {billing_mode === "postpaid_invoice" && (
                <p className="text-xs text-amber-500">
                  Postpaid needs Finance approval before your ads can spend.
                </p>
              )}
              <input className={input} type="email" placeholder="Billing email" value={billing_email} onChange={(e) => setBillingEmail(e.target.value)} />
              <input className={input} placeholder="Billing contact name" value={billing_name} onChange={(e) => setBillingName(e.target.value)} />
              <input className={input} placeholder="Address line" value={address_line1} onChange={(e) => setAddress(e.target.value)} />
              <div className="grid grid-cols-3 gap-3">
                <input className={input} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <input className={input} placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                <input className={input} placeholder="PIN" value={postal_code} onChange={(e) => setPostal(e.target.value)} />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <label className="flex gap-3 items-start p-3 rounded-xl bg-secondary/40 border border-border cursor-pointer">
                <input type="checkbox" checked={consent1} onChange={(e) => setConsent1(e.target.checked)} className="mt-1" />
                <span>I agree to the <strong>Aurelix Ads Policies</strong> — no misleading, prohibited or unsafe content.</span>
              </label>
              <label className="flex gap-3 items-start p-3 rounded-xl bg-secondary/40 border border-border cursor-pointer">
                <input type="checkbox" checked={consent2} onChange={(e) => setConsent2(e.target.checked)} className="mt-1" />
                <span>I authorize Aurelix to process advertising data as described in the <strong>Data Use Terms</strong>. This does not enable DM-based personalization; that requires separate user consent.</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canNext || create.isPending}
              className="px-5 py-2.5 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create advertiser"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
