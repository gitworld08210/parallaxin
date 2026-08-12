# Plan - Aurelix Content Understanding & Contextual Ads Intelligence V3

Implement the V3 Master Implementation Prompt for Content Understanding and Contextual Ads Intelligence. This plan focuses on backend infrastructure (tables, triggers, RLS) and the integration of AI signals into the existing Aurelix ecosystem.

## User Review Required

> [!IMPORTANT]
> This implementation will establish the core content context layer and ad intelligence engine.

- **Taxonomy Confirmation**: The plan uses a standard taxonomy (Travel, Tech, Food, etc.). Do you have a specific taxonomy file or should I proceed with the provided examples?
- **AI Processing**: Content understanding will be asynchronous. Are there specific vision models or speech-to-text services you prefer to prioritize in the AI Gateway?

## Proposed Changes

### Database Schema (Supabase)

#### Content Understanding Layer
- Create `content_taxonomy` for hierarchical categorization.
- Create `content_context` to store AI-generated metadata, confidence scores, and signal agreement for Reels, Posts, and Stories.
- Add triggers to automatically queue low-confidence content for human review in the Verification Department.

#### Contextual Ads Intelligence
- Create `ads_user_interests` to store decaying interest profiles based on engagement signals.
- Create `ads_interest_signals` to log granular engagement events (watch time %, likes, shares).
- Implement a "Brand Safety" check via a dedicated classifier to ensure ad suitability.

### Backend Logic (Edge Functions / Triggers)

#### Asynchronous AI Pipeline
- Implement a worker trigger that samples frames and sends them to the VLM (Gemini/Qwen) via the AI Gateway.
- Integrate Whisper for speech-to-text and PaddleOCR for text extraction.
- Implement "Multi-Signal Fusion" to calculate a final category confidence score.

#### User Interest Decay
- Add a daily cron job to decay user interest scores by 10% weekly to maintain recency.

### Frontend Integration

#### Reels & Discovery
- Enhance the Reels player to track watch time checkpoints (25%, 50%, 90%) and emit `ads_interest_signals`.
- Update `WhyThisAd` to pull data from the new ranking engine.

#### Ads Manager V3
- Update the Campaign Wizard to allow targeting based on the new versioned taxonomy.
- Add "Brand Safety" toggles and exclusion categories (Politics, Religion, etc.) for advertisers.

#### Verification Department
- Update the Reviewer Workspace to show high-fidelity AI signals (OCR, transcripts, signal agreement bars).

## Technical Details

- **Atomic Ledger**: Ad interactions will be logged atomically to `ads_interest_signals` to prevent double-counting.
- **RLS**: Secure `content_context` so internal AI signals are not exposed directly to users, only the high-level "Why am I seeing this?" explanation.
- **Model Routing**: All AI calls will pass through a unified `ai_gateway` proxy to allow model replacement without downtime.
