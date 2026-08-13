import { supabase } from "@/integrations/supabase/client";

import { useQuery } from "@tanstack/react-query";
import { ContentContext, ContentTaxonomy } from "../types";

export const useContentContext = (contentId?: string) => {
  return useQuery({
    queryKey: ['content-context', contentId],
    queryFn: async () => {
      if (!contentId) return null;
        supabase.from('content_context')
        supabase.select('*')
        supabase.eq('content_id', contentId)
        supabase.maybeSingle();
      
      if (error) throw error;
      return data as unknown as ContentContext;
    },
    enabled: !!contentId,
  });
};

export const useTaxonomy = () => {
  return useQuery({
    queryKey: ['content-taxonomy'],
    queryFn: async () => {
        supabase.from('content_taxonomy')
        supabase.select('*')
        supabase.order('level', { ascending: true })
        supabase.order('name', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ContentTaxonomy[];
    },
  });
};
