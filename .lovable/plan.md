# AAP Update — Higher Intelligence AI Routing Policy + Continued Build

## Part A — New foundation: Higher Intelligence AI Gateway (HI-AIG)

**Rule:** No app module calls a model directly. Every AI call goes through one server-side router that picks the model per task and can swap it anytime.

### A1. Router table (DB)
`ai_task_routes` — seeded with task → primary/fallback mapping. Editable by Founder Office only.

| task_key | primary | fallback |
|---|---|---|
| `general_reasoning` | `openai/gpt-5.5` | `openai/gpt-5` |
| `fast_daily` | `openai/gpt-5-mini` | `google/gemini-2.5-flash` |
| `ad_copy` | `openai/gpt-5.4` | `openai/gpt-5` |
| `image_analysis` | `openai/gpt-5` (vision) | `google/gemini-2.5-pro` |
| `video_analysis` | `google/gemini-2.5-pro` | `openai/gpt-5` |
| `audio_transcribe` | `openai/whisper-1` | `google/gemini-2.5-flash` |
| `translation` | `google/gemini-2.5-flash` | `openai/gpt-5` |
| `embeddings` | `openai/text-embedding-3-large` | `google/gemini-embedding-001` |
| `moderation` | `openai/omni-moderation` | (internal Llama Guard stub) |

Note: Claude isn't in the Lovable AI catalog — mapped to closest supported GPT-5 tier and documented in the row's `notes` column. Router table lets Founder Office remap when catalog changes.

### A2. Shared edge function `hi-aig`
- Signature: `{ task: string, input, options? }` → returns model output + `{model_used, latency_ms, cost_estimate}`.
- Reads `ai_task_routes`, calls Lovable AI Gateway with primary, falls back on 5xx/429.
- Logs to `ai_gateway_runs` (task, model, tokens, user, org, cost).
- Internal ML tasks (`recommendation`, `fraud`, `forecast`) return `{stub: true}` today — reserved for Aurelix proprietary models later.

### A3. Refactor existing callers
Replace direct model strings in:
- `supabase/functions/_shared/gemini.ts` → thin wrapper over `hi-aig`.
- `executive-ai`, `ai-coach`, caption/bio/smart-reply/moderation functions → pass `task` instead of `model`.

### A4. Consent + privacy guardrails (DB + gates)
- `user_ad_consent` (opt-in, revocable, versioned, timestamp, `policy_version`).
- `user_dm_ai_consent` (separate opt-in; without it, `hi-aig` refuses any task whose input is tagged `source: 'dm'`).
- Founder Office AI views scoped to aggregates only — RLS blocks message content and PII columns; add `aap_founder_insights_v` view returning only trends/revenue/health.

## Part B — Continue AAP build (this turn)

### B1. `AdsGate` (`src/components/layout/AdsGate.tsx`)
Allows: verified creators, org owners/admins, and AAP staff (`aap_is_staff`). Everyone else → `/ads/get-started`.

### B2. Routes in `src/App.tsx`
- `/ads` → Business Center (list advertisers user can access)
- `/ads/get-started` → Onboarding wizard
- `/ads/:advertiserId/*` → gated shell (campaigns, billing, review — stubs wired next phase)

### B3. Onboarding wizard `src/pages/ads/OnboardingWizard.tsx`
Steps:
1. Entity type (Organization / Creator / Individual)
2. Legal + brand details (name, country, GSTIN optional, website)
3. Billing profile (Manual UPI default, Postpaid gated by Finance approval)
4. Consent acknowledgements (ad policies, data use)
5. Create `aap_advertisers` + `aap_advertiser_members` (owner) + `aap_billing_profiles` + initial `platform_approval_requests` row for Finance if postpaid.

### B4. Hook `src/hooks/ads/useAdvertiser.ts`
CRUD + membership queries used by the wizard and Business Center.

## Part C — Roadmap addendum (future AI)
Track in `docs/ads/ai-roadmap.md`:
1. Ship HI-AIG router (this phase).
2. Log every call → training corpus.
3. Swap task rows to Aurelix-internal endpoints as models mature (recommendation → ranking → fraud → forecasting → foundation).

## Out of scope this turn
Campaign/AdGroup/Ad CRUD UI, creative studio, ad serving injection, billing UI beyond profile creation. Those follow in the next phases.
