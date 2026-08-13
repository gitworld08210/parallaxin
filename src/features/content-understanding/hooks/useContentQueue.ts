import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import { ReviewStatus } from "../types";

export const useContentQueue = () => {
  return useQuery({
    queryKey: ['content-classification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_context')
        .select('*')
        .eq('human_review_required', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useReviewContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: ReviewStatus;
      categoryId?: string;
      notes?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('content_context').update({
        human_review_status: input.status,
        human_review_required: false,
        primary_category_id: input.categoryId || null,
        classified_by: u.user?.id,
        classified_at: new Date().toISOString(),
        notes: input.notes,
        updated_at: new Date().toISOString(),
      } as any).eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Content review submitted");
      qc.invalidateQueries({ queryKey: ['content-classification-queue'] });
      qc.invalidateQueries({ queryKey: ['content-context-detail'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
