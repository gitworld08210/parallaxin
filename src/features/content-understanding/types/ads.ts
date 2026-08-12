import { ProcessingStatus } from "../types";

export interface UserInterest {
  id: string;
  user_id: string;
  topic_id: string;
  interest_score: number;
  confidence: number;
  last_signal_at: string;
  signal_count: number;
  interest_version: string;
  created_at: string;
  updated_at: string;
}

export interface InterestSignal {
  id: string;
  user_id: string;
  content_id: string;
  topic_ids: string[];
  signal_type: 'watch_25' | 'watch_50' | 'watch_90' | 'like' | 'save' | 'share' | 'follow' | 'interaction';
  weight_applied: number;
  created_at: string;
}

export interface AdvertiserTaxonomyMapping {
  id: string;
  internal_category_id: string;
  advertiser_category_name: string;
  is_targetable: boolean;
  sensitive_flag: boolean;
  version: string;
  created_at: string;
}

export interface AdCampaignTargeting {
  id: string;
  campaign_id: string;
  locations: string[];
  age_range: [number, number];
  interest_ids: string[];
  context_category_ids: string[];
  excluded_category_ids: string[];
  placements: ('feed' | 'reels' | 'stories')[];
  created_at: string;
  updated_at: string;
}

export interface AdRankingConfig {
  id: string;
  version: string;
  is_active: boolean;
  weights: {
    targeting_match: number;
    context_match: number;
    interest_match: number;
    predicted_engagement: number;
    ad_quality: number;
    bid_value: number;
  };
  penalties: {
    frequency_cap: number;
    negative_feedback: number;
    low_quality: number;
  };
  created_at: string;
}
