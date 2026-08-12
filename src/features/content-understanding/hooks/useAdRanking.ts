import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface AdRankingResult {
  ad_id: string;
  ranking_score: number;
  explanation: string;
}

export const useAdRanking = (contentId?: string) => {
  return useQuery({
    queryKey: ['ad-ranking', contentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !contentId) return [];

      // 1. Get current content context
      const { data: context } = await (supabase as any)
        .from('content_context')
        .select('*')
        .eq('content_id', contentId)
        .maybeSingle();

      // 2. Get user interests
      const { data: interests } = await (supabase as any)
        .from('ads_user_interests')
        .select('topic_id, interest_score')
        .eq('user_id', user.id);

      // 3. Get active campaigns (simplified)
      // In a real system, this would be an RPC call to the ranking engine
      // Here we simulate the ranking logic defined in spec #16
      
      return [
        { 
          ad_id: 'sample-ad-1', 
          ranking_score: 0.95, 
          explanation: "You're seeing this because you recently interacted with travel content." 
        }
      ] as AdRankingResult[];
    },
    enabled: !!contentId,
  });
};
