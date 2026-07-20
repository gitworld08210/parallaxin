## Goal

1. Ghost admins ke `admin` role revoke karna (dono gmail accounts).
2. Apki personal Gemini API key add karke user/creator experience upgrade karna — 5 high-impact AI features.

---

## Part A — Ghost admin cleanup

- `user_roles` se delete karo jaha `role = 'admin'` aur user ka email `%@gmail.com` (specifically `adit080210@gmail.com`, `ra.adityaraj.2010@gmail.com`).
- Sanity check: baaki admins (`@aurelix.com`) intact rahen — pre/post SELECT chalayenge.
- Add a database trigger: agar `auth.users` se koi user delete ho, uski `user_roles` rows auto-remove ho (ghost admin banne se roke).

---

## Part B — Gemini API key

- `add_secret` se `GEMINI_API_KEY` request karunga (secure form). Where to get: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) → "Create API key".
- Server-only, kabhi frontend me expose nahi hoga.
- Sab Gemini calls edge functions se — model `gemini-2.5-flash` (fast, cheap) default; `gemini-3.1-pro` sirf heavy tasks ke liye.

---

## Part C — AI features (Gemini-powered)

### 1. Caption & Hashtag Generator ✍️

**Kaha:** `Compose.tsx`, `ReelCompose.tsx`, `StoryCompose.tsx` — "✨ AI suggest" button.
**Flow:** user photo/caption draft type kare → button dabaye → 3 caption variants + 15 trending hashtags aa jaayen → tap-to-insert.
**Backend:** naya edge fn `ai-caption-suggest` (Gemini vision for image + text prompt).

### 2. Aurelix AI Assistant Upgrade 🚀

**Kaha:** `Assistant.tsx` + `ai-assistant` edge fn.
**Change:** Lovable Gateway → direct Gemini API (`gemini-3.1-pro` for chat). Better reasoning, faster, apki own quota.  
**Bonus:** image understanding — user photo upload kare, AI analyze kare.

### 3. Smart Reply in DMs 💬

**Kaha:** `Conversation.tsx` — incoming message ke neeche 3 chip suggestions.
**Flow:** last 5 messages ko Gemini bhejo → 3 short reply suggestions (formal/casual/funny) → tap se send.
**Backend:** naya edge fn `ai-smart-reply`.
**Privacy:** sirf on-demand (button dabane par), auto nahi.

### 4. Bio Rewriter + Creator Insights 🎨📊

**Bio (`EditProfile.tsx`):** "Rewrite my bio" button → 3 style variants (professional, playful, aesthetic).
**Insights (`PostInsights.tsx`, `Analytics.tsx`):** raw metrics Gemini ko de → plain-English summary + 3 actionable tips ("Your reels perform 40% better on Fridays — post more then").
**Backend:** naya edge fn `ai-creator-insights`.

### 5. Auto Content Moderation 🛡️

**Kaha:** Post/comment create hote hi background me Gemini se safety check.
**Flow:** naya text/image → Gemini "categorize risk: safe/nsfw/hate/spam" → agar risky, `moderation_flags` table me row insert → Trust & Safety dept queue me auto-route ho jaye (Phase 2 routing engine use karega).
**Backend:** naya edge fn `ai-moderate-content` + trigger on post/comment insert.
**No user-facing block** — sirf silent flag for review, false-positives se creators pareshan na hon.

### 6. **Bonus** — Smart Search & Discover 🔍

**Kaha:** `Discover.tsx` — natural language search bar ("show me cozy coffee reels").
**Backend:** query embed karo (Gemini embeddings), posts ke embeddings se cosine similarity match.
**Tables:** `post_embeddings (post_id, embedding vector(768))` + trigger to auto-embed new posts.

---

## Technical section

### Database migrations

1. **Ghost admin cleanup** (single migration):
  - `DELETE FROM user_roles WHERE role='admin' AND user_id IN (select id from auth.users where email in (...))`.
  - Trigger: `on_auth_user_deleted` → cascade delete `user_roles`.
2. **Moderation flags** table + RLS (only T&S dept read).
3. **Post embeddings** table with `pgvector` extension + IVFFlat index.

### Edge functions (all new, streaming where useful)

- `ai-caption-suggest`
- `ai-smart-reply`
- `ai-creator-insights`
- `ai-moderate-content` (background, invoked by trigger via `pg_net`)
- `ai-search-embed`
- Update: `ai-assistant` — switch to direct Gemini.

### Shared helper

`supabase/functions/_shared/gemini.ts` — thin fetch wrapper around `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` reading `GEMINI_API_KEY`, with 429/402/5xx error mapping and streaming SSE parser.

### Frontend hooks

- `useAiCaption(imageUrl, draft)` — react-query mutation.
- `useSmartReplies(conversationId)` — on-demand fetch.
- `useAiBioRewrite(currentBio)`.
- `useCreatorInsights(postId | 'account')`.

### Rate limiting

Per-user Gemini calls capped in edge fn (existing `ai_rate_limits` table pattern) — 30/hour for creators, 10/hour for regular users. Prevents key abuse.

### UI polish

- Loading skeleton + shimmer on AI buttons.
- "Powered by Gemini" tiny footer chip (Google ToS requirement).
- Toast on 429 / 402: "AI is busy, try in a minute".

---

## Rollout order

1. Ghost admin migration + delete-cascade trigger.
2. `GEMINI_API_KEY` secret request.
3. Shared `gemini.ts` helper.
4. Feature 1 (Caption) → 2 (Assistant upgrade) → 3 (Smart reply) → 4 (Bio + Insights) → 5 (Moderation) → 6 (Smart search).
5. Verify each in preview before moving on.

Approve karo to build mode me shift ho ke sab implement karta hun.