import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Megaphone, ArrowRight, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAdsAccounts, rememberAccount, lastAccount } from "@/hooks/ads/useAdsAccounts";

export default function BusinessCenter() {
  const navigate = useNavigate();
  const { accounts, loading, createAccount } = useAdsAccounts();
  const [name, setName] = useState("");
  const [type, setType] = useState("individual");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !accounts.length) return;
    const remembered = lastAccount();
    const target = accounts.find((a) => a.id === remembered) ?? accounts[0];
    navigate(`/ads/${target.id}`, { replace: true });
  }, [loading, accounts, navigate]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Ad account ka naam likhiye");
      return;
    }
    setSaving(true);
    try {
      const acc = await createAccount({ name: name.trim(), business_type: type, website: website.trim() });
      rememberAccount(acc.id);
      toast.success("Ad account ready");
      navigate(`/ads/${acc.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not create account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <Helmet>
        <title>Aurelix Ads — Business Center</title>
        <meta name="description" content="Create your Aurelix ad account and start running Reels, Stories, Feed and Explore ads." />
      </Helmet>

      <div className="mx-auto max-w-lg px-5 py-12">
        {loading ? (
          <div className="grid h-64 place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Set up your ad account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ek ad account banaiye, phir Reels, Stories, Feed aur Explore par campaigns chalaiye. Spend aapke universal
              Aurelix Coin wallet se katega.
            </p>

            <Card className="mt-6 space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Ad account name</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aurelix Retail Pvt Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Business type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual / Creator</SelectItem>
                    <SelectItem value="business">Registered business</SelectItem>
                    <SelectItem value="agency">Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-site">Website (optional)</Label>
                <Input
                  id="acc-site"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <Button onClick={submit} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Create ad account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
