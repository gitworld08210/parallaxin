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

      // 3. Ad Ranking Algorithm (Spec #16 & #25)
      // Score = (TargetingMatch * 0.3) + (ContextMatch * 0.4) + (InterestMatch * 0.3)
      
      const contextTopics = context?.topic_ids || [];
      const userInterestTopics = (interests || []).map((i: any) => i.topic_id);
      
      // Calculate matches
      const contextMatch = contextTopics.some((t: string) => userInterestTopics.includes(t)) ? 1.0 : 0.0;
      const interestMatch = (interests || []).reduce((acc: number, curr: any) => {
        return acc + (curr.interest_score > 10 ? 0.5 : 0.1);
      }, 0);

      const ads = [
        { 
          ad_id: 'sample-ad-1', 
          ranking_score: Math.min(0.99, (0.4 * contextMatch) + (0.3 * Math.min(1, interestMatch)) + 0.2), 
          explanation: contextMatch > 0 
            ? "You're seeing this because your interests align with this content's topics."
            : "Showing this based on trending categories in your location." 
        }
      ];

      return ads.sort((a, b) => b.ranking_score - a.ranking_score) as AdRankingResult[];
    },
    enabled: !!contentId,
  });
};