import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CopyVariant = {
  headline: string;
  description: string;
  cta: string;
  predicted_ctr: number; // 0..1 heuristic
  predicted_cvr: number;
  brand_safety_flags: string[];
};

function heuristicScore(text: string): { ctr: number; cvr: number } {
  const len = text.length;
  const hasNumber = /\d/.test(text);
  const hasEmoji = /[\p{Emoji}]/u.test(text);
  const hasCta = /(shop|buy|try|get|start|learn|discover|save|book|join)/i.test(text);
  let ctr = 0.012;
  if (len > 20 && len < 90) ctr += 0.008;
  if (hasNumber) ctr += 0.004;
  if (hasEmoji) ctr += 0.003;
  if (hasCta) ctr += 0.006;
  const cvr = Math.max(0.005, ctr * 0.35);
  return { ctr: Math.min(ctr, 0.06), cvr: Math.min(cvr, 0.025) };
}

const UNSAFE = [
  /guarantee(d)?\s+(income|profit|returns?)/i,
  /miracle|cure/i,
  /lose\s+\d+\s*(kg|kgs|pounds|lbs)/i,
  /free\s+money/i,
  /crypto\s+(scam|guaranteed)/i,
];

function flagsFor(text: string): string[] {
  const out: string[] = [];
  UNSAFE.forEach((r) => {
    if (r.test(text)) out.push(`Matches restricted claim: ${r.source}`);
  });
  if (/!{3,}/.test(text)) out.push("Excessive punctuation");
  if (text === text.toUpperCase() && text.length > 12) out.push("All caps copy");
  return out;
}

export function useGenerateAdCopy() {
  return useMutation({
    mutationFn: async (input: {
      brand: string;
      product: string;
      audience: string;
      tone?: string;
      count?: number;
      advertiser_id?: string;
    }): Promise<CopyVariant[]> => {
      const count = input.count ?? 4;
      const system = `You are an elite performance-marketing copywriter for the Aurelix ads platform.
Return STRICT JSON: {"variants":[{"headline":"","description":"","cta":""}]}.
Constraints: headline <= 40 chars, description <= 90 chars, cta 1-3 words.
No emojis unless the tone requests them. No unverifiable claims.`;
      const user = `Brand: ${input.brand}
Product/offer: ${input.product}
Target audience: ${input.audience}
Tone: ${input.tone ?? "confident, modern"}
Generate ${count} distinct variants.`;

      const { data, error } = await supabase.functions.invoke("hi-aig", {
        body: {
          task: "ad_copy",
          advertiser_id: input.advertiser_id,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          options: { response_format: { type: "json_object" } },
        },
      });
      if (error) throw error;
      const raw = data?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { parsed = {}; }
      const variants: any[] = Array.isArray(parsed.variants) ? parsed.variants : [];
      return variants.slice(0, count).map((v) => {
        const combined = `${v.headline ?? ""} ${v.description ?? ""}`;
        const s = heuristicScore(combined);
        return {
          headline: String(v.headline ?? "").slice(0, 60),
          description: String(v.description ?? "").slice(0, 140),
          cta: String(v.cta ?? "Learn more").slice(0, 24),
          predicted_ctr: s.ctr,
          predicted_cvr: s.cvr,
          brand_safety_flags: flagsFor(combined),
        };
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Generation failed"),
  });
}

export function useSaveCreativeFromVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      advertiser_id: string;
      name: string;
      variant: CopyVariant;
      destination_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("aap_creatives")
        .insert({
          advertiser_id: input.advertiser_id,
          name: input.name,
          format: "image",
          headline: input.variant.headline,
          description: input.variant.description,
          cta: input.variant.cta,
          destination_url: input.destination_url ?? null,
          payload: {
            source: "creative_studio",
            predicted_ctr: input.variant.predicted_ctr,
            predicted_cvr: input.variant.predicted_cvr,
            brand_safety_flags: input.variant.brand_safety_flags,
          },
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      toast.success("Saved to creative library");
      qc.invalidateQueries({ queryKey: ["aap-creatives", v.advertiser_id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}
