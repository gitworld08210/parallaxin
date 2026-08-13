import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

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

import { ORG_TYPES } from "@/lib/orgTypes";

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
    [organization, settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const handleSave = () => {
    // Client-side validation — RPC is still the source of truth, this is UX.
    const schema = z.object({
      name: z.string().trim().min(1, "Name is required").max(100),
      slug: z.
string().
trim().
toLowerCase().
min(3, "Slug must be at least 3 characters").
max(32, "Slug must be at most 32 characters").
regex(
          /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
          "Only lowercase letters, numbers, and single hyphens",
        ),
      website: z.
string().
trim().
max(255).
optional().
refine(
          (v) => !v || /^https?:\/\/.+/i.test(v),
          "Website must start with http:// or https://",
        ),
      email: z.
string().
trim().
max(255).
optional().
refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email address"),
      description: z.string().max(2000).optional(),
    });

    const parsed = schema.safeParse({
      name: form.name,
      slug: form.slug,
      website: form.website || undefined,
      email: form.email || undefined,
      description: form.description || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    update.mutate({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: form.description ? form.description : null,
      logoUrl: form.logoUrl ? form.logoUrl : null,
      coverUrl: form.coverUrl ? form.coverUrl : null,
      website: form.website ? form.website : null,
      email: form.email ? form.email : null,
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
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
