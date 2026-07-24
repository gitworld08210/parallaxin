## Aurelix Ads Platform — Remaining Roadmap (Phases 10–14)

Phases 1–9 are shipped (DB, onboarding, campaigns, moderation, analytics/billing, delivery/audiences, experiments/brand safety, conversions/attribution, public API + webhooks). Here's what's left to make AAP feature-complete against the v1.0 spec.

### Phase 10 — Creative Intelligence & AI Assist
- AI creative generator (copy + image variants) via `hi-aig` (Gemini)
- Predicted CTR/CVR scoring on creative upload
- Auto-tagging (objects, brand safety pre-flags) before human review
- "Creative Studio" tab in AdvertiserShell with variant A/B seeding into Phase 7 experiments

### Phase 11 — Budget Automation & Smart Bidding
- Portfolio budgets across campaigns (`aap_portfolios`)
- Auto-bidding strategies: Max Conversions, Target CPA, Target ROAS
- Pacing controller Edge Function (cron) that reallocates spend hourly
- Anomaly detection + alerts (spend spikes, delivery drops)

### Phase 12 — Marketplace & Deals
- Direct deals / PMP between premium creators and advertisers
- `aap_deals`, `aap_deal_line_items`, negotiation state machine
- Reserved inventory in the delivery engine (priority tier above auction)
- Creator-side "Brand Deals" inbox

### Phase 13 — Measurement, Reporting & Exports
- Scheduled reports (email/webhook) with saved views
- Cohort + funnel reports on top of `aap_attributions`
- CSV/Parquet exports via signed URLs
- Incrementality / lift study module (holdout groups)

### Phase 14 — Compliance, Trust & Ops
- Ad transparency center (public page listing active ads per advertiser)
- Advertiser verification (business KYC) tied to spend limits
- DSAR/data deletion workflow for pixel data
- Full audit log viewer + SOC2-style access reports
- Billing: GST invoices, tax IDs, dunning for failed top-ups

### Cross-cutting gaps still open
- Cron wiring for `aap-webhook-dispatcher`, pacing, outbox retention cleanup
- Rate-limit enforcement on `aap-api` (table exists, gateway check pending)
- Advertiser role management UI (invite members, scoped permissions)
- Notification center for advertisers (moderation decisions, budget alerts)
- End-to-end smoke tests for the full campaign → serve → convert → report loop

### Suggested order
10 → 11 (creator/advertiser value) → 13 (reporting depth) → 12 (marketplace) → 14 (compliance before scale). Cross-cutting gaps folded in alongside.

Tell me which phase to start, or say "Phase 10" to continue sequentially.
