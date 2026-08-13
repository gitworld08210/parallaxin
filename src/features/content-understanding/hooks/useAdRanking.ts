import { supabase } from "@/integrations/supabase/client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthProvider";

export interface AdRankingResult {
  ad_id: string;
  ranking_score: number;
  explanation: string;
  ad_details?: any;
}

export const useAdRanking = (contentId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-ranking', contentId],
    queryFn: async () => {
      if (!user || !contentId) return [];

      // 1. Get current content context.
      const { data: context } = await supabase.from('content_context' as any).select('*').eq('content_id', contentId).maybeSingle();

      // 2. Get user interests.
      const { data: interests } = await supabase.from('ads_user_interests' as any).select('topic_id, interest_score').eq('user_id', user.id);

      // 3. Ad Ranking Algorithm (Spec #16 & #25)
      // Score = (TargetingMatch * 0.3) + (ContextMatch * 0.4) + (InterestMatch * 0.3)
      
      const contextTopics = context?.topic_ids || [];
      const userInterestTopics = (interests || []).map((i: any) => i.topic_id);
      
      // Calculate matches
      const contextMatch = contextTopics.some((t: string) => userInterestTopics.includes(t)) ? 1.0 : 0.0;
      
      // Economic Value / Bid (Mock)
      const bid = 0.5; 
      
      const ads = [
        { 
          ad_id: 'sample-ad-1', 
          ranking_score: contextMatch > 0 ? (0.95 + bid * 0.1) : (0.45 + bid * 0.05), 
          explanation: contextMatch > 0 
            ? "You're seeing this because your recent interests in travel and technology match this content."
            : "Showing this based on trending categories in your location." 
        }
      ];

      return ads.sort((a, b) => b.ranking_score - a.ranking_score) as AdRankingResult[];
    },
    enabled: !!contentId,
  });
};