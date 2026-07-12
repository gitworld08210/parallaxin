import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useChangePassword, useMFASettings, useUpsertMFA, useSecurityPolicy } from "@/hooks/admin-os/useExecutiveSecurity";

const PasswordAndMFA = () => {
  const change = useChangePassword();
  const { data: mfa = [] } = useMFASettings();
  const upsertMFA = useUpsertMFA();
  const { data: policy } = useSecurityPolicy();

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const validate = (p: string) => {
    if (!policy) return null;
    if (p.length < policy.password_min_length) return `Password must be at least ${policy.password_min_length} characters`;
    if (policy.password_require_uppercase && !/[A-Z]/.test(p)) return "Must contain an uppercase letter";
    if (policy.password_require_lowercase && !/[a-z]/.test(p)) return "Must contain a lowercase letter";
    if (policy.password_require_number && !/[0-9]/.test(p)) return "Must contain a number";
    if (policy.password_require_symbol && !/[^A-Za-z0-9]/.test(p)) return "Must contain a symbol";
    return null;
  };

  const submit = async () => {
    const err = validate(pw);
    if (err) return toast.error(err);
    if (pw !== pw2) return toast.error("Passwords do not match");
    await change.mutateAsync(pw);
    setPw(""); setPw2("");
  };

  const methodEnabled = (m: string) => mfa.some((x: any) => x.method === m && x.is_enabled);

  return (
    <div className="space-y-5">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Password Management</h2>
        </div>
        {policy && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Current Policy</p>
            <p className="mt-1">
              Min length {policy.password_min_length} ·
              {policy.password_require_uppercase && " uppercase ·"}
              {policy.password_require_lowercase && " lowercase ·"}
              {policy.password_require_number && " number ·"}
              {policy.password_require_symbol && " symbol"}
            </p>
            <p>Expires every {policy.password_expiry_days} days · Last {policy.password_history_depth} passwords blocked</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">New Password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-xs">Confirm Password</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={change.isPending || !pw}>Change Password</Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Multi-Factor Authentication</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {policy?.mfa_required ? "MFA is required by policy." : "MFA is optional."}
          </p>
        </div>

        <div className="space-y-3">
          {[
            { key: "totp", label: "Authenticator App (TOTP)", desc: "Time-based one-time codes from an authenticator app.", available: true },
            { key: "email_otp", label: "Email OTP", desc: "One-time codes delivered to your email.", available: true },
            { key: "hardware", label: "Hardware Security Key", desc: "FIDO2 / WebAuthn hardware key.", available: false },
            { key: "biometric", label: "Biometric", desc: "Face or fingerprint via device authenticator.", available: false },
          ].map((m) => (
            <div key={m.key} className="flex items-center justify-between border border-border/60 rounded-lg p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{m.label}</p>
                  {!m.available && <Badge variant="secondary" className="text-[10px]">Future</Badge>}
                  {methodEnabled(m.key) && <Badge className="text-[10px]">Enabled</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{m.desc}</p>
              </div>
              <Switch
                checked={methodEnabled(m.key)}
                disabled={!m.available || upsertMFA.isPending}
                onCheckedChange={(v) => upsertMFA.mutate({ method: m.key, is_enabled: v })}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PasswordAndMFA;
