import { supabase } from "@/integrations/supabase/client";

import { useQuery } from "@tanstack/react-query";
import { ContentContext, ContentTaxonomy } from "../types";

export const useContentContext = (contentId?: string) => {
  return useQuery({
    queryKey: ['content-context', contentId],
    queryFn: async () => { /* shimmed action */ },
    enabled: !!contentId,
  });
};

export const useTaxonomy = () => {
  return useQuery({
    queryKey: ['content-taxonomy'],
    queryFn: async () => {
        supabase.from('content_taxonomy').select('*').order('level', { ascending: true }).order('name', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ContentTaxonomy[];
    },
  });
};
