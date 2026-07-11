import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "@/hooks/organization/useOrganizationSettings";

const ORG_TYPES = [
  "company",
  "startup",
  "nonprofit",
  "community",
  "government",
  "education",
  "other",
];

const VISIBILITY_OPTIONS = ["public", "unlisted", "private"];

const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export const SettingsForm = () => {
  const { organization } = useOrganizationContext();
  const { settings, loading } = useOrganizationSettings();
  const update = useUpdateOrganizationSettings();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    coverUrl: "",
    website: "",
    email: "",
    orgType: "company",
    timezone: "UTC",
    visibility: "public",
  });

  useEffect(() => {
    if (!organization) return;
    setForm({
      name: organization.name ?? "",
      slug: organization.slug ?? "",
      description: organization.description ?? "",
      logoUrl: organization.logo_url ?? "",
      coverUrl: organization.cover_url ?? "",
      website: organization.website ?? "",
      email: organization.email ?? "",
      orgType: organization.org_type ?? "company",
      timezone: settings?.timezone ?? "UTC",
      visibility: settings?.visibility ?? "public",
    });
  }, [organization, settings]);

  const initial = useMemo(
    () => ({
      name: organization?.name ?? "",
      slug: organization?.slug ?? "",
      description: organization?.description ?? "",
      logoUrl: organization?.logo_url ?? "",
      coverUrl: organization?.cover_url ?? "",
      website: organization?.website ?? "",
      email: organization?.email ?? "",
      orgType: organization?.org_type ?? "company",
      timezone: settings?.timezone ?? "UTC",
      visibility: settings?.visibility ?? "public",
    }),
    [organization, settings],
  );

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const handleSave = () => {
    update.mutate({
      name: form.name,
      slug: form.slug,
      description: form.description,
      logoUrl: form.logoUrl,
      coverUrl: form.coverUrl,
      website: form.website,
      email: form.email,
      orgType: form.orgType,
      timezone: form.timezone,
      visibility: form.visibility,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>
          These details appear across the workspace and public organization page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.trim() }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-desc">Description</Label>
          <Textarea
            id="org-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-logo">Logo URL</Label>
            <Input
              id="org-logo"
              value={form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-cover">Cover image URL</Label>
            <Input
              id="org-cover"
              value={form.coverUrl}
              onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-website">Website</Label>
            <Input
              id="org-website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-email">Contact email</Label>
            <Input
              id="org-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Organization type</Label>
            <Select
              value={form.orgType}
              onValueChange={(v) => setForm((f) => ({ ...f, orgType: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select
              value={form.visibility}
              onValueChange={(v) => setForm((f) => ({ ...f, visibility: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={!dirty || update.isPending}>
            {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SettingsForm;
