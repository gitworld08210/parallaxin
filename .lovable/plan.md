## Goal

Ads ka pura frontend hata dena (Ads Manager sameet), test/dummy data saaf karna, aur `/ads` par ek saaf "Coming soon" page rakhna. Database schema, RLS aur edge functions untouched rahenge taaki nayi planning ke baad zero rework se rebuild ho sake.

## 1. Frontend delete

Delete `src/pages/ads/` (poora folder):
- `BusinessCenter`, `OnboardingWizard`, `AdvertiserShell`, `BillingCenter`, `CreditCenter`, `FinanceCreditReview`, `AnalyticsDashboard`, `AdsReviewQueue`, `ConversionsPanel`, `CreativeStudio`, `DeveloperPanel`, `ExperimentsAndSafety`
- `manager/` — `AdsManager`, `ManagerShell`, `Overview`, `DataGrid`, `PlacementsPanel`, `ReportsPanel`, `columns.ts`, `shared.tsx`, `wizard/CampaignWizard`, `wizard/AdPreview`

Delete `src/hooks/ads/` (poora folder): `useAdsManager`, `useAdvertiser`, `useBilling`, `useCampaigns`, `useConversions`, `useCreativeStudio`, `useDelivery`, `useDeveloper`, `useExperiments`, `usePostpaid`, `useReviewQueue`.

Delete `src/components/layout/AdsGate.tsx` (sirf ads ke liye tha).

## 2. Routes

`src/App.tsx` me sab `/ads/*` lazy imports aur routes hata kar sirf:

```text
/ads       -> AdsComingSoon
/ads/*     -> redirect to /ads
```

Naya file: `src/pages/ads/ComingSoon.tsx` — simple branded page ("Aurelix Ads — rebuild in progress"), back-to-home button, Helmet title/description. Side menu ka "Aurelix Ads" link rahega aur isi page par jayega.

Note: isme staff pages bhi hat rahe hain — `/ads/review` (Trust & Safety ad review) aur `/ads/finance/credit-review` (Finance credit approvals). Naye plan me inhe wapas banana padega.

## 3. Data clear (schema rakhenge)

Ek data-only cleanup (DELETE, koi DROP nahi), FK order me — child se parent tak:

```text
events/attributions/rollups -> creatives/ads -> ad_groups -> campaigns
audiences, saved_views, column_presets, rules, rule_runs, recommendations
experiments + variants + results, review_queue + decisions, appeals
invoices + lines, payments, wallet_ledger, wallets, credits,
credit_applications, postpaid_accounts, financial_ledger, risk/fraud
api_keys, pixels, webhooks + deliveries, conversion_events
advertiser_members, advertisers
```

Reference/config tables (`aap_placements`, `aap_policy_refs`, `aap_localization`, `aap_feature_flags`, `aap_config`) untouched rahengi.

Storage: `ad-creatives` bucket ke saare objects bhi delete honge (bucket rahega).

## 4. Kya nahi chhuenge

- Saare `aap_*` tables, enums, RPCs, triggers, RLS — as-is
- Edge functions `aap-api`, `aap-conversions-api`, `aap-generate-invoices`, `aap-recommendations`, `aap-webhook-dispatcher` — deployed rahengi (koi UI unhe call nahi karegi)
- Baaki app (feed, messages, admin-os, org) par zero impact

## 5. Verify

- Typecheck clean (koi dangling `hooks/ads` / `pages/ads` import na bache)
- `/ads` aur `/ads/manager` dono par Coming Soon render ho — Playwright se screenshot
- Data counts zero confirm karne ke liye query

## Next step

Iske baad hum blank slate se proper Ads planning karenge: objectives, campaign structure, delivery/auction, placements (Reels/Stories/Feed), billing, aur reviewer/finance flows — module-by-module scope decide karke build.
