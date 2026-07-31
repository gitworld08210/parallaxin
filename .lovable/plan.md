## Goal

Rebuild `/ads/manager` to match the uploaded Aurelix Ads Manager mockup: a dark/ light Meta-Ads-style workspace with a left sidebar, an Overview dashboard, and a guided campaign creation flow that ends in real Reels / Stories / Feed / In-Stream / Explore ad previews on a phone mockup.

## What exists today

- `/ads/manager` is a single-page grid (levels tabs + data grid + charts + AI recs) — `src/pages/ads/manager/AdsManager.tsx`, `DataGrid.tsx`, `columns.ts`.
- Data hooks already available: `useAdsManager` (report RPCs, bulk edit, recommendations), `useCampaigns` (campaign / ad set / ad CRUD, `Placement` = feed | reels | stories | explore | search | profile | organization), `useCreativeStudio`, `useBilling`, `useConversions`, `useAdvertiser`.
- Reporting RPCs `aap_report_rows`, `aap_report_timeseries`, `aap_report_breakdown` already exist.

So this is mostly a UI/UX rebuild on top of existing data, plus one small schema addition for ad-set targeting.

## New structure

Shell: `src/pages/ads/manager/ManagerShell.tsx` — persistent left sidebar (Overview, Campaigns, Ad Sets, Ads, Creatives, Audiences, Placements, Reports, Conversions, Billing & Payments, Settings, Help), account chip at bottom, content area on the right. Mobile: sidebar collapses to a drawer + top tab bar (app is used at 420px too).

Routes (all nested under `/ads/manager`):

```
/ads/manager                → Overview
/ads/manager/campaigns      → Campaigns list (existing DataGrid, restyled)
/ads/manager/adsets         → Ad sets list
/ads/manager/ads            → Ads list
/ads/manager/creatives      → Creatives library
/ads/manager/audiences      → Audience manager
/ads/manager/placements     → Placements report
/ads/manager/reports        → Reports dashboard (performance/demographics/placement/conversion/device)
/ads/manager/conversions    → Conversion funnel + pixel events
/ads/manager/billing        → Billing & payments
/ads/manager/create         → Full-screen campaign creation wizard
```

## 1. Overview page

KPI strip (Spend, Impressions, Clicks, CTR, Conversions, CPA) each with delta vs previous period; date-range picker + "Customize"; "Performance Overview" multi-series line chart (spend / clicks / conversions) with hover tooltip; "Campaign Status" counts (Active, Learning, Limited, Inactive, Rejected); "Top Campaigns" list with spend + ROAS. All from the existing report RPCs.

## 2. Campaign creation wizard (the core ask)

Full-screen, step-based, matching the mockup panels:

1. **Objective** — card grid: Awareness, Traffic, Engagement, App Promotion, Video Views, Lead Generation, Conversions, Catalog Sales (mapped to existing `CampaignObjective`; unsupported ones map to nearest valid value).
2. **Campaign type** — Automatic (Aurelix AI optimizes) / Manual / A/B Test.
3. **Campaign setup** — name, buying type (Auction / Reach & Frequency), Campaign Budget Optimization toggle, budgets.
4. **Ad set** — left sub-nav (Audience, Placements, Budget & Schedule, Optimization & Delivery):
  - Audience: saved audience picker + custom (locations, age, gender, interests) with a live "Estimated Reach" gauge.
  - **Placements**: Automatic (recommended) vs Manual with checkboxes — Aurelix Feed, Aurelix Reels, Aurelix Stories, In-Stream Ads (Videos), Aurelix Explore, Profile Feed. This is the Instagram/Meta behaviour requested: ads placed between users' reels, in stories, and in feed.
  - Budget & schedule: daily/lifetime, start/end date.
  - Optimization goal + bid strategy/amount.
5. **Ad creation** — format (Single Image / Single Video / Carousel / Collection), media picker from the creatives library (direct upload already supported), primary text, headline, description, website URL, display link, CTA button, deep link.
6. **Ad preview** — tabbed phone mockups rendering the real creative + copy in **Feed, Reels, Stories, In-Stream, Explore** frames, styled like the app's actual surfaces (Reels: full-bleed video, overlay CTA button, Sponsored label, like/comment/share rail; Stories: 9:16 with progress bar and swipe-up CTA; Feed: 1:1/4:5 card with avatar + Sponsored).
7. **Review & Publish** — summary of campaign / ad set / ad + budget, then Publish (creates campaign → ad set → ad, status `pending_review`).

Wizard state is kept in one reducer, drafts saved to the campaign row so users can resume.

## 3. Supporting pages

- **Placements report** — donut by surface + table (Impressions / Clicks / CTR / Spend / Results) using `aap_report_breakdown`.
- **Reports dashboard** — left tab rail (Performance, Demographics, Placement, Conversion, Device) with chart + top-campaign table.
- **Demographics** — age bars + gender donut + top locations.
- **Conversions** — funnel (Purchase / Add to Cart / Initiate Checkout / View Content / Lead) + top conversion events.
- **Creatives library** — All / Images / Videos / Templates tabs, grid of thumbnails with size labels, Upload button (reuses the existing `ad-creatives` private bucket flow).
- **Audience manager** — table of audiences (name, type, size, availability) + create.
- **Billing & payments** — current balance, Add Funds, transactions table with status pills.
- **Notifications panel** — recent campaign/payment/approval events.
- **Ad approval status** — All / Pending / Approved / Rejected with reason column.

## 4. Ad formats guide

A small reference strip (Reels 9:16, Stories 9:16, Feed 1:1 / 4:5) shown in the creative step and in the creatives library, so advertisers upload correct sizes.

## Technical notes

- New folder `src/pages/ads/manager/` with `ManagerShell.tsx`, `Overview.tsx`, `wizard/` (one file per step + `AdPreview.tsx` with the phone frames), and `panels/` for the report/creative/audience/billing pages. Existing `DataGrid.tsx` / `columns.ts` / `useAdsManager.ts` are kept and reused, not rewritten.
- One migration: add `targeting jsonb` (locations, age range, gender, interests) and `estimated_reach` to `aap_ad_groups` if not already present, plus GRANTs unchanged (table already exists with RLS).
- No AI-routing changes; the AI recommendation panel from the current page moves into Overview.
- All colors via existing semantic tokens; the mockup's dark indigo look maps to the current dark theme, and light mode stays readable.

## Out of scope

Existing `/ads/:advertiserId/*` shell pages stay as they are and remain reachable; nothing is deleted.