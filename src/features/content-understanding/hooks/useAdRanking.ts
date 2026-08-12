import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface AdRankingResult {
  ad_id: string;
  ranking_score: number;
  explanation: string;
  ad_details?: any;
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

      // 3. Simulated Ad Ranking Logic (Spec #16)
      // Algorithm: Score = (TargetingMatch * 0.3) + (ContextMatch * 0.4) + (InterestMatch * 0.3)
      
      // For the MVP demo, we provide a relevant sample ad if context matches interests
      const contextTopics = context?.topic_ids || [];
      const userInterestTopics = (interests || []).map((i: any) => i.topic_id);
      
      const hasContextMatch = contextTopics.some((t: string) => userInterestTopics.includes(t));
      
      const ads = [
        { 
          ad_id: 'sample-ad-1', 
          ranking_score: hasContextMatch ? 0.95 : 0.45, 
          explanation: hasContextMatch 
            ? "You're seeing this because your interests align with this content's topics."
            : "Showing this based on trending categories in your location." 
        }
      ];

      return ads.sort((a, b) => b.ranking_score - a.ranking_score) as AdRankingResult[];
    },
    enabled: !!contentId,
  });
};