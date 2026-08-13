
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      contentId: string;
      topicIds: string[];
      signalType: AdSignalType;
    }) => {
      if (!user) return;

      const weight = SIGNAL_WEIGHTS[input.signalType];

      // 1. Record the raw signal
      const { error: signalError } = await supabase.from("ads_interest_signals").insert({
        user_id: user.uid,
        content_id: input.contentId,
        topic_ids: input.topicIds,
        signal_type: input.signalType,
        weight_applied: weight,
      });

      if (signalError) throw signalError;

      // 2. Interest scores are now updated via database triggers on ads_interest_signals
      // This client-side loop is removed to avoid race conditions and redundant calls.
      return;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-interests'] });
    },
    onError: (error) => {
      console.error('Failed to record ad interaction:', error);
    }
  });
};
