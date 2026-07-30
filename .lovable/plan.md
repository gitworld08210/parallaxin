## Goal

Two things:
1. Replace the current Ads UI (a stack of narrow mobile cards at `/ads/:advertiserId/*`) with a real **desktop-class Ads Manager workspace** modelled on Meta Ads Manager + Google Ads.
2. Re-route all AI calls: **OpenAI `gpt-5.6-sol`** for reasoning-heavy work, **`google/gemini-3.6-flash`** for fast/high-volume and anything touching image/video. (Claude Opus is not available on the Lovable AI Gateway — only OpenAI + Google models — so Opus is replaced by GPT-5.6-sol.)

Existing backend (`aap_*` tables, edge functions, billing/invoices/credit) stays. Only additive schema.

---

## Part A — Ads Manager rebuild

### A1. Workspace shell (replaces `AdvertiserShell.tsx` card stack)
Full-height three-region layout, Meta-style:

```text
┌──────────────────────────────────────────────────────────────┐
│ Account switcher · Date range · Currency · Wallet · Search   │  top bar
├───────────┬──────────────────────────────────────────────────┤
│           │  Campaigns │ Ad sets │ Ads   (3-tier tabs)       │
│  Nav rail │  ─────────────────────────────────────────────   │
│  Manage   │  [Create] [Duplicate] [Edit] [⏸] [🗑] [Rules]    │  bulk bar
│  Analyze  │  Filters ▾  Breakdown ▾  Columns ▾  Export       │
│  Audiences│  ┌──────── data grid ─────────────────────────┐  │
│  Creatives│  │ ☑ Name | Status | Delivery | Budget | Res.│  │
│  Billing  │  │   Reach Impr CPM CPC CTR Spend Conv CPA   │  │
│  Tools    │  └────────────────────────────────────────────┘  │
│           │  Sticky totals row                               │
└───────────┴──────────────────────────────────────────────────┘
```

- Left rail collapsible; keeps mobile fallback (stacked) below `md`.
- Tab drill-down with selection context: pick a campaign → Ad sets tab auto-filters to it (Meta behaviour), breadcrumb chips to clear.

### A2. Data grid (the core of the whole thing)
- Virtualised table, resizable + reorderable + pinned columns, sticky header and sticky totals footer.
- **Inline editing**: name, status toggle, daily/lifetime budget, bid — optimistic save with toast + undo.
- **Row selection** → bulk bar: pause/resume, duplicate, budget change (fixed or %), delete, add to rule.
- **Column presets**: Performance, Delivery, Engagement, Conversions, Video, Cost per result, Custom. Saved per user.
- **Breakdowns** (Meta parity): by time (day/week/month), by delivery (age, gender, placement, device, region), by action type. Rendered as expandable sub-rows.
- **Filters**: chip builder — status, objective, delivery status, metric thresholds (`Spend > 1000`), date, name contains.
- **Date range picker**: presets (today, yesterday, last 7/14/30, this month, lifetime, maximum) + custom + compare-to-previous with delta arrows in every metric cell.
- **Charts drawer**: click any row → side panel with time-series of the selected metrics + breakdown donuts.
- Export CSV of the current view.

### A3. Campaign creation (Meta-style guided flow, replaces the 3-field form)
Full-screen 3-column wizard: **Campaign → Ad set → Ad**, with a live right-hand preview and an always-visible validation/publish panel.
- Campaign: objective picker with descriptions and predicted result type, buying type, CBO toggle (campaign budget optimisation), spend limits, A/B test toggle.
- Ad set: budget & schedule (daily/lifetime, dayparting grid), optimisation goal + bid strategy (lowest cost / cost cap / bid cap / ROAS), attribution window selector, audience (saved / new / lookalike / custom), detailed targeting with include-exclude narrowing, placements (automatic vs manual per surface), frequency caps, **live audience size gauge** wired to `aap_estimate_reach`.
- Ad: identity, format, creative from library or upload, primary text / headline / description with multi-variant (dynamic creative), CTA, destination + UTM builder, **multi-placement live preview** (feed, reels, story, explore, search, profile) rendered with real app chrome.
- Draft autosave at each step, "Publish" runs the full validation list and submits to review.

### A4. Supporting surfaces (Google Ads parity)
- **Automated rules**: condition builder (if CPA > X over last 3 days → pause / adjust budget / notify), schedule, run history.
- **Recommendations / Opportunities page**: AI-generated, scored, one-click apply (uses reasoning model — Part B).
- **Delivery diagnostics** per ad set: learning phase, auction overlap, budget-limited / bid-limited flags, rejection reasons with policy links.
- **Audience manager**: sources, size, overlap matrix, lookalike creation.
- **Creative library**: grid + performance per asset, tagging, folders (uses existing `ad-creatives` bucket).
- **Experiments**: existing A/B panel folded into the workspace with significance/confidence display.
- **Billing/Credit/Invoices**: existing pages re-skinned into the shell (no logic change).

### A5. Design pass
- Dense, information-first: 13px table type, tabular numerals, restrained colour — status dots, green/red deltas only. Liquid-glass treatment reserved for the top bar in light mode (consistent with the rest of the app), never inside the grid.
- All colours via existing semantic tokens; dark mode unchanged.

### A6. Additive schema (minor)
- `aap_saved_views` — per-user saved filter+column+breakdown+date state, shareable within advertiser.
- `aap_column_presets` — named column sets.
- `aap_rules` + `aap_rule_runs` — automated rules and execution log.
- `aap_recommendations` — AI opportunities with state (new/applied/dismissed).
All with GRANTs, RLS scoped through `aap_is_advertiser_member`.

---

## Part B — AI model routing change

- Add `src/../supabase/functions/_shared/ai-router.ts`: single Lovable AI Gateway client (`@ai-sdk/openai-compatible`, base `https://ai.gateway.lovable.dev/v1`, `Lovable-API-Key` header) exposing two tiers:
  - `reasoning` → `openai/gpt-5.6-sol` with `reasoning_effort: "none"` in the chat body (required for GPT-5.6 with tools) — used for: campaign optimisation recommendations, budget/bid advice, credit-risk scoring, executive AI, KIP chat, authenticity scoring, moderation adjudication.
  - `fast` → `google/gemini-3.6-flash` — used for: captions, bio rewrite, alt text, DM suggest, post suggestions, creative critique on images/video, ranking, embeddings-adjacent text work.
- Drive the mapping from the existing `ai_task_routes` table so tiers can be changed without redeploys; ship seed rows for every task.
- Migrate the existing functions (`executive-ai`, `kip-chat`, `ai-assistant`, `ai-creator-coach`, `ai-caption`, `ai-bio-rewrite`, `ai-dm-suggest`, `ai-post-suggestions`, `ai-moderate`, `suggest-alt-text`, `authenticity-score`, `rank-foryou`) off `_shared/gemini.ts` onto the router; keep `_shared/gemini.ts` as a thin re-export so nothing breaks mid-migration.
- Surface 429 / 402 gateway errors to the UI as real messages (rate limit / credits) instead of generic failures.

---

## Build order

1. Migration: saved views, column presets, rules, recommendations, `ai_task_routes` seed.
2. AI router + migrate edge functions; verify one live call per tier.
3. Workspace shell + nav + top bar + date range/compare.
4. Data grid engine (columns, presets, breakdowns, filters, inline edit, bulk actions, totals, export).
5. Campaign/Ad set/Ad creation flow with live placement previews.
6. Automated rules, recommendations, delivery diagnostics.
7. Audiences, creative library, experiments, billing re-skin.
8. Mobile fallback + polish pass.

This is a multi-turn build; each numbered step ships working and verified before the next.

## Technical notes

- Grid is built in-house on TanStack Table + TanStack Virtual (already React Query based) — no new heavyweight UI dependency.
- Metrics read from `aap_daily_rollups` with a date-range aggregate RPC; breakdowns from `aap_events` roll-ups so the grid stays fast.
- No changes to `aap_campaigns` / `aap_ad_groups` / `aap_ads` structure — only reads/writes through existing hooks.
