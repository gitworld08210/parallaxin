// Supabase removed
import { useQuery } from "@tanstack/react-query";
import { ContentContext, ContentTaxonomy } from "../types";

export const useContentContext = (contentId?: string) => {
  return useQuery({
    queryKey: ['content-context', contentId],
    queryFn: async () => {
      if (!contentId) return null;
        .from('content_context')
        .select('*')
        .eq('content_id', contentId)
        .maybeSingle();
      
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
        .from('content_taxonomy')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ContentTaxonomy[];
    },
  });
};
