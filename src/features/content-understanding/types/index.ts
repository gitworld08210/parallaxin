export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ReviewStatus = 'pending' | 'in_review' | 'classified' | 'escalated' | 'cancelled';

export interface ContentContext {
  id: string;
  content_id: string;
  processing_status: ProcessingStatus;
  primary_category_id: string | null;
  secondary_category_ids: string[];
  topic_tags: string[];
  confidence_scores: Record<string, number>;
  signal_agreement: 'low' | 'medium' | 'high';
  ambiguity_score: number;
  signal_contributions: Record<string, any>;
  vision_reference?: string;
  transcript_reference?: string;
  ocr_reference?: string;
  classification_version: string;
  model_pipeline_version: string;
  human_review_required: boolean;
  human_review_status: ReviewStatus;
  classified_by?: string;
  classified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentTaxonomy {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
}
