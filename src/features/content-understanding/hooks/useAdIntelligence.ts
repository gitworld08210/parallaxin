import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type AdSignalType = 'watch_25' | 'watch_50' | 'watch_90' | 'like' | 'save' | 'share' | 'follow' | 'interaction';

const SIGNAL_WEIGHTS: Record<AdSignalType, number> = {
  watch_25: 1,
  watch_50: 2,
  watch_90: 4,
  like: 3,
  save: 5,
  share: 4,
  follow: 5,
  interaction: 2,
};

export const useAdInteraction = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      contentId: string;
      topicIds: string[];
      signalType: AdSignalType;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weight = SIGNAL_WEIGHTS[input.signalType];

      // 1. Record the raw signal
      const { error: signalError } = await (supabase as any).from('ads_interest_signals').insert({
        user_id: user.id,
        content_id: input.contentId,
        topic_ids: input.topicIds,
        signal_type: input.signalType,
        weight_applied: weight,
      });

      if (signalError) throw signalError;

      // 2. Update user interests (simplified upsert for MVP)
      // In production, this would be handled by a database trigger or background job for atomicity and decay
      for (const topicId of input.topicIds) {
        const { data: existing } = await (supabase as any)
          .from('ads_user_interests')
          .select('*')
          .eq('user_id', user.id)
          .eq('topic_id', topicId)
          .maybeSingle();

        if (existing) {
          await (supabase as any)
            .from('ads_user_interests')
            .update({
              interest_score: existing.interest_score + weight,
              signal_count: existing.signal_count + 1,
              last_signal_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await (supabase as any)
            .from('ads_user_interests')
            .insert({
              user_id: user.id,
              topic_id: topicId,
              interest_score: weight,
              signal_count: 1,
              confidence: 0.1, // Initial confidence
            });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-interests'] });
    },
    onError: (error) => {
      console.error('Failed to record ad interaction:', error);
    }
  });
};
