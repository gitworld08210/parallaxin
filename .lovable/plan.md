# Aurelix Ads Platform (AAP) v1.0 — Build Plan

Scope: Full v1.0 (all 50 parts) as spec'd. Advertiser = Org OR verified Creator. Billing = manual UPI wallet credits + postpaid invoice (Finance marks paid manually). Ad delivery = live serving inside Feed / Reels / Stories, with Org-level placement control; only Finance + Engineering can toggle serving config. AI = call existing Higher Intelligence gateway only (no new AI infra).

Realistic delivery: this is a multi-phase program. Ek turn me sab kuch production-grade nahi ho sakta — first phases deep schema + core UX, later phases fill enterprise surfaces on top of the same tables. Naming prefix everywhere: `aap_` (tables), `/ads/*` (routes), `aap-*` (edge functions). Nothing existing renamed or removed.

---

## Phase 0 — Foundation & Guardrails

- Route namespace `/ads/*` with `AdsGate` (org member OR verified creator OR internal role).
- Feature flag `aap.enabled` in `company_feature_flags`; kill switch respected by every entry point.
- Shared UI kit: reuse `admin-os/ds` (PageHeader, SectionCard, StatCard, DataTable, StatusBadge, Toolbar, EmptyState).
- Command palette (`⌘K`) scoped to Ads, keyboard shortcuts, skeletons, confirmation dialogs.
- All AI calls go through existing edge functions using Higher Intelligence gateway — no new gateway, no model selection.

## Phase 1 — Database Foundation (Module 15 + 16, future-ready for all parts)

One migration set. Every `public.aap_*` table gets GRANTs + RLS + policies + `updated_at` trigger + audit trigger where relevant.

Core (v1 tables actively used):  
`aap_advertisers`, `aap_advertiser_members`, `aap_billing_profiles`, `aap_wallets`, `aap_wallet_ledger`, `aap_invoices`, `aap_invoice_lines`, `aap_payments`, `aap_credits`, `aap_coupons`, `aap_tax_profiles`,  
`aap_campaigns`, `aap_ad_groups`, `aap_ads`, `aap_creatives`, `aap_creative_versions`, `aap_assets`, `aap_asset_folders`,  
`aap_audiences`, `aap_audience_rules`, `aap_saved_audiences`,  
`aap_placements`, `aap_placement_configs` (org-level: which surfaces allow ads and density; editable only by Finance/Engineering),  
`aap_review_queue`, `aap_review_decisions`, `aap_appeals`, `aap_policy_refs`,  
`aap_events` (impression/click/conversion raw), `aap_daily_rollups` (per-ad/day pre-agg for analytics), `aap_conversion_events`,  
`aap_notifications` (mirrors platform notifications), `aap_audit_logs`,  
`aap_permissions`, `aap_roles`, `aap_role_permissions`, `aap_user_roles` (advertiser-scoped RBAC).

Future-ready (created empty, policies + grants set — surfaces built in later phases):  
`aap_experiments`, `aap_experiment_variants`, `aap_experiment_results`,  
`aap_automations`, `aap_automation_runs`, `aap_scheduled_jobs`,  
`aap_crm_leads`, `aap_crm_contacts`, `aap_crm_activities`,  
`aap_brand_safety_rules`, `aap_blocked_categories`,  
`aap_fraud_events`, `aap_risk_scores`,  
`aap_verifications`, `aap_verification_documents`,  
`aap_api_keys`, `aap_webhooks`, `aap_webhook_deliveries`,  
`aap_feature_flags`, `aap_config`, `aap_localization`,  
`aap_kb_docs`, `aap_kb_versions`,  
`aap_licenses`, `aap_seats`, `aap_quotas`,  
`aap_reports`, `aap_report_runs`, `aap_dashboards`,  
`aap_backups_log`.

RBAC roles seeded: `founder_office`, `finance_l1`, `finance_l2`, `trust_safety`, `moderator`, `org_admin`, `advertiser_admin`, `advertiser_editor`, `advertiser_viewer`. Uses existing `has_role`/employee permission helpers where possible (no recursive RLS).

Indexes: partial on `status`, composite on `(advertiser_id, created_at)`, `(campaign_id, day)` for rollups, GIN on targeting JSON.

## Phase 2 — Advertiser Onboarding & Business Center (Parts 5, 12, 21, 38)

- `/ads/get-started` wizard: choose Organization vs Creator → verification status check → create `aap_advertiser` → billing profile → tax → default wallet.
- Business Center at `/ads/business`: team, roles, ad accounts, billing accounts, verification, activity, security.
- Advertiser CRM shell (leads/clients/contacts/notes/timeline) — CRUD + import stub.

## Phase 3 — Campaigns → Ad Groups → Ads → Creatives (Modules 2, 3, 4, 6, Parts 7, 37)

- Campaign Manager: create/edit/pause/resume/archive/duplicate/delete with all objectives + statuses.
- Ad Group editor (budget, audience picker, placement picker, optimization goal, schedule, bid strategy).
- Ad editor with format-specific forms (Image / Video / Carousel / Story / Feed / Reels). Search & Sponsored profile/org registered as `coming_soon`.
- Live device preview (mobile/desktop, dark/light) using existing Feed/Reels/Story card components.
- Creative Studio + Asset Library: folders, versions, upload to Supabase Storage bucket `aap-assets` (private, signed URLs).
- Creative Review Studio (side-by-side compare, timeline for video, reviewer comments) — used by Review Center.

## Phase 4 — Audiences & Placement (Modules 5, 7, Parts 18)

- Audience builder with country/state/city/lang/age/gender/device/OS/interest/behavior rules stored as JSON.
- Reach forecast via SQL estimate over `profiles`/`employees`/interest vectors (best-effort; documented as approximate).
- Saved audiences, audience overlap view.
- Placement manager with per-org `aap_placement_configs` (density, allowed surfaces). Only Finance + Engineering can edit; RLS enforces.
- Audience Intelligence tab calls existing Higher Intelligence endpoint for insights.

## Phase 5 — Review Center, Appeals, Policy (Modules 11, Part 22)

- Reviewer queue `/ads/review` (moderator/T&S). States: pending/approved/rejected/appealed/need_changes.
- Internal notes, rejection reasons from `aap_policy_refs`, audit timeline, review analytics.
- Advertiser-side Appeals inbox.

## Phase 6 — Billing, Wallet, Invoices, Finance (Modules 8, Part 9)

- Wallet top-up: reuses existing UPI + UTR flow, credits `aap_wallets` after Finance verify.
- Postpaid invoicing: monthly cron creates `aap_invoices` from `aap_daily_rollups` for org/creator advertisers on postpaid terms; emailed via existing branded pipeline; Finance manually marks paid/unpaid.
- Credits, coupons, promotional credits, refunds, tax profiles, payment history.
- Finance Center `/ads/finance` (finance_l1/l2 only): approve credit lines, apply/refund, waive fees, spend limits.

## Phase 7 — Ad Serving in Feed / Reels / Stories

- `aap-select-ads` edge function: given (user, surface, org context, placement config) returns eligible approved ads with pacing + frequency cap + brand safety filters. Deterministic, cache-friendly.
- Client hooks: `useFeedAds`, `useReelsAds`, `useStoryAds` inject sponsored items into existing feed/reels/story loaders at positions defined by the org's `aap_placement_configs` (density: e.g. every Nth item).
- Impression + click + view-through tracking → `aap-track` edge function → `aap_events`; nightly job (or on-demand) rolls up to `aap_daily_rollups` and updates campaign spend against budget.
- Frequency capping + pacing service; hard-stop when `budget_remaining <= 0`.

## Phase 8 — Analytics & Reporting (Module 9, Parts 24, 41)

- Analytics dashboard: reach, impressions, clicks, CTR, CPM, CPC, CPA, ROAS, conversions, spend, revenue, breakdowns (audience/placement/device/country), time compare.
- Recharts throughout; server-side aggregation from `aap_daily_rollups`.
- Reporting Center: daily/weekly/monthly/quarterly/yearly + custom; scheduled reports via `aap_scheduled_jobs` → email via existing pipeline; export CSV/Excel/PDF (client-side for CSV/Excel, edge function for PDF).
- Data warehouse-style read models are just rollup tables + materialized views.

## Phase 9 — Notifications, Tasks, Communication (Modules 13, Parts 26–28)

- Notification templates for each event; delivery via existing platform notification + email systems.
- Task center and internal chat scoped to advertiser workspace (reuses existing conversation tables).

## Phase 10 — AI Command Center (Modules 10, Parts 18, 19, 40, 50)

Single UI at `/ads/ai` with panels: Campaign Suggestions, Budget Optimization, Audience Suggestions, Creative Suggestions, Performance Prediction, Campaign Health, Fraud Detection, Insights, Planner, Coach, Report Generator. Every panel posts to the existing Higher Intelligence edge function with a task-specific prompt — no new gateway, no new model config.

## Phase 11 — Admin, Founder & Ops (Modules 14, Parts 15, 42, 43)

- Founder Office AAP dashboard: total revenue, revenue by country/org/category, live campaigns, platform health, fraud stats, pending appeals, daily/weekly/monthly/quarterly/annual reports.
- Admin controls: suspend/pause campaign, emergency stop, freeze/blacklist advertiser, daily spend limits, approve appeals, audit logs.
- Platform Operations: queue monitor, job runs, service status, error tracking.

## Phase 12 — Governance, Security, Compliance, Search (Parts 13, 29, 30, 31, 32, 33, 34, 35, 45, 46, 47, 48, 49)

- Approval workflow engine reuses `platform_approval_requests`.
- Knowledge Center, Audit Center, Security Center, Global Search across all AAP entities (uses `platform_search_index`).
- Feature Management, DR & Backup log, Config Center, Data Governance, Scheduler, Resource/Quota, Licensing surfaces.
- Consent, privacy requests, data export/delete workflows.

## Phase 13 — Developer Platform, Integrations, Automation, Monitoring (Parts 8, 11, 12, 39, 43)

- API keys, webhooks + deliveries, rate limits, OAuth stub, docs page.
- Automation Center (auto pause/resume/budget, spending rules) built on `aap_automations` + scheduler.
- Monitoring dashboard for AAP internals.

## Phase 14 — Fraud, Brand Safety, Experimentation, Localization, Growth, Marketplace stubs (Parts 6, 10, 14, 17, 20, 36)

- Brand Safety, Fraud Prevention Center (uses Higher Intelligence).
- Experiment Center (A/B split), Localization, Growth (referrals/promo/templates), Marketplace scaffold.

## Phase 15 — Future Expansion Framework (Part 44)

- Placement/format registry so Commerce/Retail/Voice/AR-VR/Live/TV/Creator marketplace are new rows, not new tables.
- Documented extension points; no redesign needed for new surfaces.

---

## Technical notes (for devs)

- All entry points use existing shared components; no duplicate wrappers.
- Ad serving is deterministic and stateless per request; pacing state lives in Redis-like table `aap_pacing_state` with row-level lock.
- Budgets and spend are money-safe: `numeric(18,4)` + double-entry ledger (`aap_wallet_ledger`, `aap_invoice_lines`).
- Every mutation writes to `aap_audit_logs` via generic trigger.
- Only Finance + Engineering roles can UPDATE `aap_placement_configs` and `aap_config` — enforced by RLS using `has_role`.
- Search across AAP uses existing `platform_search_index` with new source types.
- No use of `service_role` from the browser; sensitive ops go through edge functions.

## Delivery order I will actually ship next turns

1. Phase 0 + Phase 1 (routes/gate + full migration with all tables, RLS, grants).
2. Phase 2 + Phase 3 (advertiser onboarding + campaign/adgroup/ad/creative editors).
3. Phase 4 + Phase 5 (audiences/placements + review center).
4. Phase 6 + Phase 7 (billing + live ad serving in Feed/Reels/Stories).
5. Phase 8 + Phase 10 + Phase 11 (analytics, AI panels, admin/founder).
6. Phases 9, 12, 13, 14, 15 to complete enterprise surfaces.

Each phase = its own reviewable turn. Nothing existing (org OS, admin OS, wallet, payroll, creator studio, feeds, live) is renamed or broken.

&nbsp;

# DEFAULT AI MODEL RECOMMENDATIONS

&nbsp;

## IMPORTANT

&nbsp;

These are the recommended default models.

&nbsp;

The Higher Intelligence AI Gateway may replace any model automatically if a better, faster or more cost-effective model becomes available.

&nbsp;

No application module should directly call any model.

&nbsp;

---

&nbsp;

# 1. GENERAL REASONING

&nbsp;

Recommended Models

&nbsp;

Primary:

Claude Opus

&nbsp;

Fallback:

GPT-5

&nbsp;

Purpose:

&nbsp;

- Business reasoning

- Executive reports

- Campaign planning

- Long context analysis

- Founder Office insights

&nbsp;

---

&nbsp;

# 2. FAST DAILY TASKS

&nbsp;

Primary:

&nbsp;

GPT-5 Mini

&nbsp;

Fallback:

&nbsp;

Gemini 2.5 Flash

&nbsp;

Purpose

&nbsp;

- Chat

- UI Assistant

- Quick summaries

- Notifications

- Simple reports

&nbsp;

---

&nbsp;

# 3. AD COPY GENERATION

&nbsp;

Primary

&nbsp;

Claude Sonnet

&nbsp;

Fallback

&nbsp;

GPT-5

&nbsp;

Purpose

&nbsp;

- Headlines

- Descriptions

- CTA

- Marketing Copy

- Landing Page Text

&nbsp;

---

&nbsp;

# 4. IMAGE ANALYSIS

&nbsp;

Primary

&nbsp;

GPT-5 Vision

&nbsp;

Fallback

&nbsp;

Gemini 2.5 Pro Vision

&nbsp;

Purpose

&nbsp;

- Brand Logo Detection

- OCR

- Image Moderation

- Creative Quality

- Policy Check

&nbsp;

---

&nbsp;

# 5. VIDEO ANALYSIS

&nbsp;

Primary

&nbsp;

Gemini 2.5 Pro

&nbsp;

Fallback

&nbsp;

GPT-5 Vision

&nbsp;

Purpose

&nbsp;

- Video Review

- Frame Analysis

- Brand Safety

- Scene Detection

&nbsp;

---

&nbsp;

# 6. AUDIO

&nbsp;

Primary

&nbsp;

Whisper

&nbsp;

Fallback

&nbsp;

Gemini Audio

&nbsp;

Purpose

&nbsp;

- Speech Recognition

- Audio Moderation

- Transcription

&nbsp;

---

&nbsp;

# 7. TRANSLATION

&nbsp;

Primary

&nbsp;

Gemini 2.5 Flash

&nbsp;

Fallback

&nbsp;

GPT-5

&nbsp;

Purpose

&nbsp;

- Global Ads

- Localization

- Multi-language Campaigns

&nbsp;

---

&nbsp;

# 8. EMBEDDINGS

&nbsp;

Primary

&nbsp;

text-embedding-3-large

&nbsp;

Fallback

&nbsp;

Voyage AI

&nbsp;

Purpose

&nbsp;

- Semantic Search

- Similar Ads

- Knowledge Search

- Audience Matching

&nbsp;

---

&nbsp;

# 9. MODERATION

&nbsp;

Primary

&nbsp;

OpenAI Moderation

&nbsp;

Fallback

&nbsp;

Llama Guard

&nbsp;

Purpose

&nbsp;

- Hate Speech

- Violence

- Adult Content

- Spam

- Unsafe Content

&nbsp;

---

&nbsp;

# 10. RECOMMENDATION SYSTEM

&nbsp;

Use internal ML models trained by Aurelix.

&nbsp;

Purpose

&nbsp;

- Feed Ranking

- Ad Ranking

- Audience Matching

- Budget Optimization

- Interest Prediction

&nbsp;

---

&nbsp;

# 11. FRAUD DETECTION

&nbsp;

Use internal ML models.

&nbsp;

Purpose

&nbsp;

- Click Fraud

- Bot Detection

- Invalid Traffic

- Fake Accounts

- Fake Conversions

&nbsp;

---

&nbsp;

# 12. FORECASTING

&nbsp;

Use internal ML models.

&nbsp;

Purpose

&nbsp;

- Revenue Forecast

- Campaign Forecast

- Growth Prediction

- Spend Prediction

&nbsp;

---

&nbsp;

# USER CONSENT

&nbsp;

Personalized advertising may only use data after explicit user consent.

&nbsp;

Consent must be:

&nbsp;

- Opt-in

- Revocable

- Versioned

- Timestamped

&nbsp;

---

&nbsp;

# DIRECT MESSAGE POLICY

&nbsp;

Private DMs are never used for advertising by default.

&nbsp;

If users enable DM-based personalization:

&nbsp;

- Show a dedicated consent screen.

- Explain what data will be analyzed.

- Explain why.

- Explain benefits.

- Allow opt-out anytime.

&nbsp;

Without consent:

&nbsp;

- No DM content analysis.

- No ad targeting from DMs.

&nbsp;

---

&nbsp;

# FOUNDER OFFICE

&nbsp;

Founder Office only receives:

&nbsp;

- Anonymous Trends

- Revenue

- Campaign Analytics

- AI Insights

- Growth Forecasts

- Platform Health

&nbsp;

Never expose private message content or personally identifiable user data.

&nbsp;

---

&nbsp;

# FUTURE AI

&nbsp;

As Aurelix collects sufficient data, gradually replace third-party AI services with proprietary Aurelix models for:

&nbsp;

- Recommendation

- Ranking

- Fraud Detection

- Forecasting

- Ads Optimization

- Search

- Eventually, proprietary foundation models where appropriate.