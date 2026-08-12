# Plan - Ad Targeting Enrichment & Creator Studio Growth Features

Enhance the Ads Manager with high-fidelity contextual targeting based on the new Content Understanding Engine (CUE) v3 taxonomy, and add a "Promote Post" flow to Creator Studio for seamless monetization.

## User Review Required

> [!IMPORTANT]
> - This plan assumes the `content_taxonomy` table has been populated with at least one level of categories.
> - "Promote Post" will use the existing "Universal Coin Wallet" for billing.

- Does the list of high-level categories (Fashion, Tech, etc.) align with your vision for the ads platform?
- Should creators be allowed to promote ANY post, or only those that pass an automated safety check?

## Proposed Changes

### 1. Ad Intelligence & Targeting
- **Enrich Campaign Wizard**: Update the "Audience" step to use real categories from `public.content_taxonomy`.
- **Contextual Ad Matching**: Enhance `useAdRanking` to filter ads based on the current reel's `topic_ids` (Context Match) and the user's `ads_user_interests` (Interest Match).
- **Ad Explainability**: Finalize `WhyThisAd` integration in `Reels.tsx` to show users transparency on why they were targeted.

### 2. Creator Studio Growth
- **Promote Post Flow**: Add a "Promote" button to the Content tab in Creator Studio.
- **Simplified Ad Creation**: Create a specialized wizard for creators to turn existing organic posts into ads with 3 clicks.
- **In-App Insights**: Show "Paid Reach" vs "Organic Reach" in the post insights view.

### 3. Database & Security
- **Targeting RLS**: Ensure `ads_adsets` targeting JSON is readable by the ranking engine.
- **Interest Processing**: Add a database trigger to decay interest scores over time (e.g., -10% every 7 days) to keep targeting fresh.

## Technical Details

- **Files to Modify**:
    - `src/features/ads/lib.ts`: Synchronize `INTERESTS` constant with database taxonomy.
    - `src/pages/ads/CampaignWizard.tsx`: Fetch and display dynamic interest categories.
    - `src/pages/CreatorStudio.tsx`: Add "Promote" action to post cards.
    - `src/features/content-understanding/hooks/useAdRanking.ts`: Implement the weighted ranking algorithm (Targeting + Context + Interest).
- **New Components**:
    - `src/features/ads/components/PromotePostModal.tsx`: A streamlined ad creation dialog for creators.
