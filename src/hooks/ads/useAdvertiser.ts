import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AdvertiserType = "organization" | "creator";
export type BillingMode = "prepaid_wallet" | "postpaid_invoice";

export interface CreateAdvertiserInput {
  type: AdvertiserType;
  display_name: string;
  legal_name?: string;
  country?: string;
  organization_id?: string | null;
  billing_mode: BillingMode;
  billing: {
    billing_email: string;
    billing_name?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    gstin?: string;
  };
  consent: { ads_policy: boolean; data_use: boolean };
}

/** Advertisers current user belongs to. */
export const useMyAdvertisers = () =>
  useQuery({
    queryKey: ["aap", "my-advertisers"],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("aap_advertiser_members")
        .select("advertiser_id, role, aap_advertisers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (members ?? []).map((m: any) => ({
        role: m.role,
        advertiser: m.aap_advertisers,
      }));
    },
  });

export const useAdvertiser = (id?: string) =>
  useQuery({
    queryKey: ["aap", "advertiser", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aap_advertisers")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useCreateAdvertiser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdvertiserInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!input.consent.ads_policy || !input.consent.data_use) {
        throw new Error("Please accept the ads policy and data-use terms");
      }

      // 1. advertiser row
      const { data: adv, error: advErr } = await supabase
        .from("aap_advertisers")
        .insert({
          type: input.type,
          display_name: input.display_name,
          legal_name: input.legal_name ?? null,
          country: input.country ?? "IN",
          organization_id: input.organization_id ?? null,
          owner_user_id: user.id,
          billing_mode: input.billing_mode,
          created_by: user.id,
        })
        .select()
        .single();
      if (advErr) throw advErr;

      // 2. owner membership
      await supabase.from("aap_advertiser_members").insert({
        advertiser_id: adv.id,
        user_id: user.id,
        role: "advertiser_admin",
        invited_by: user.id,
      });

      // 3. billing profile
      await supabase.from("aap_billing_profiles").insert({
        advertiser_id: adv.id,
        billing_email: input.billing.billing_email,
        billing_name: input.billing.billing_name ?? null,
        address_line1: input.billing.address_line1 ?? null,
        city: input.billing.city ?? null,
        state: input.billing.state ?? null,
        postal_code: input.billing.postal_code ?? null,
        country: input.billing.country ?? input.country ?? "IN",
        gstin: input.billing.gstin ?? null,
        is_default: true,
      });

      // 4. wallet shell (prepaid)
      await supabase.from("aap_wallets").insert({
        advertiser_id: adv.id,
      } as any).select().maybeSingle();

      // 5. postpaid requires Finance approval before campaigns can spend
      if (input.billing_mode === "postpaid_invoice") {
        await supabase.from("platform_approval_requests").insert({
          request_type: "aap.postpaid_credit_line",
          resource_type: "aap_advertiser",
          resource_id: adv.id,
          requested_by: user.id,
          title: `Postpaid credit line — ${input.display_name}`,
          summary: "Advertiser requested postpaid invoicing. Finance review required.",
          status: "pending",
          priority: "normal",
        } as any);
      }

      return adv;
    },
    onSuccess: (adv: any) => {
      qc.invalidateQueries({ queryKey: ["aap"] });
      toast.success(`Advertiser "${adv.display_name}" created`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create advertiser"),
  });
};
