import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { useSecurityPolicy, useUpdateSecurityPolicy } from "@/hooks/admin-os/useExecutiveSecurity";

const SecurityPolicies = () => {
  const { data: policy } = useSecurityPolicy();
  const update = useUpdateSecurityPolicy();
  const [form, setForm] = useState<any>({});

  useEffect(() => { if (policy) setForm(policy); }, [policy]);

  const save = async () => {
    const { id, created_at, updated_at, updated_by, ...patch } = form;
    await update.mutateAsync(patch);
  };

  if (!policy) return <Card className="p-6 text-sm text-muted-foreground">Loading policy...</Card>;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Security Policies</h2>
          <p className="text-xs text-muted-foreground">Company-wide executive security policy. Founder-only.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Password Min Length</Label>
          <Input type="number" value={form.password_min_length ?? 12} onChange={(e) => setForm({ ...form, password_min_length: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Password Expiry (days)</Label>
          <Input type="number" value={form.password_expiry_days ?? 90} onChange={(e) => setForm({ ...form, password_expiry_days: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Password History Depth</Label>
          <Input type="number" value={form.password_history_depth ?? 5} onChange={(e) => setForm({ ...form, password_history_depth: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Failed Login Threshold</Label>
          <Input type="number" value={form.failed_login_threshold ?? 5} onChange={(e) => setForm({ ...form, failed_login_threshold: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Session Timeout (minutes)</Label>
          <Input type="number" value={form.session_timeout_minutes ?? 60} onChange={(e) => setForm({ ...form, session_timeout_minutes: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Max Concurrent Sessions</Label>
          <Input type="number" value={form.max_concurrent_sessions ?? 3} onChange={(e) => setForm({ ...form, max_concurrent_sessions: Number(e.target.value) })} className="mt-1" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { key: "password_require_uppercase", label: "Require Uppercase" },
          { key: "password_require_lowercase", label: "Require Lowercase" },
          { key: "password_require_number", label: "Require Number" },
          { key: "password_require_symbol", label: "Require Symbol" },
          { key: "mfa_required", label: "MFA Required" },
          { key: "device_approval_required", label: "Device Approval Required" },
        ].map((t) => (
          <div key={t.key} className="flex items-center justify-between border border-border/60 rounded-lg p-3">
            <Label className="text-sm">{t.label}</Label>
            <Switch checked={!!form[t.key]} onCheckedChange={(v) => setForm({ ...form, [t.key]: v })} />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>Save Policy</Button>
      </div>
    </Card>
  );
};

export default SecurityPolicies;
