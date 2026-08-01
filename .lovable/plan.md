## Aurelix Ads Manager v2 — clean rebuild

Purana `aap_*` sab kuch chhod kar ek naya, chhota aur saaf schema (`ads_*`) banayenge. Phase 1 = advertiser experience (campaign banane se le kar reporting tak) + prepaid wallet billing. Ad delivery (Feed/Reels/Story me actual ad dikhana) Phase 2 me, lekin schema abhi se usko support karega.

### Naya data model (`ads_*`)

```text
ads_accounts        advertiser account (owner_user_id, org_id, name, currency, status, timezone)
ads_members         account ke members (role: owner/admin/analyst)
ads_wallets         balance_paise, reserved_paise
ads_wallet_txns     topup / spend / refund — immutable ledger
ads_campaigns       objective(awareness|traffic|engagement|leads|conversions), budget_type, budget, schedule, status
ads_adsets          targeting jsonb, placements text[], bid_strategy, daily_budget, optimization_goal
ads_creatives       uploaded media (private bucket), type(image|video), aspect, duration
ads_ads             adset_id, creative_id, headline, primary_text, cta, destination_url, review_state
ads_ad_reviews      T&S review queue (pending/approved/rejected + reason)
ads_daily_stats     ad_id x date x placement → impressions, clicks, spend, conversions
```

Har table par RLS: account members hi apna data dekhein; T&S/Founder staff review kar sakein; `service_role` edge functions ke liye.

### Ad formats (chaaron launch me)

- **Reels ad** — 9:16 full-screen video, auto-play, "Sponsored" chip + CTA bar.
- **Story ad** — 9:16, 5s ke baad skip, progress bar.
- **Feed ad** — sponsored post card, image ya video, CTA button.
- **Explore/Search ad** — grid tile, tap par full view.

Har format ke liye ek **live phone preview** jo actual app UI clone karega (Feed card, Reels overlay, Story frame, Explore grid) — creative upload karte hi real-time update.

### Screens (route: `/ads`)

1. `**/ads` — Business Center**: account nahi hai to 3-step create; hai to account switcher + spend snapshot.
2. `**/ads/:id` — Dashboard**: spend/impressions/clicks/CTR/CPM tiles, 30-din chart, placement breakdown, active campaign list, wallet balance strip.
3. `**/ads/:id/campaigns` — Manager grid**: Meta jaisa 3-tab structure (Campaigns / Ad sets / Ads) with parent filtering, on/off toggle, inline budget edit, bulk actions, date-range presets, column chooser, CSV export.
4. `**/ads/:id/create` — 5-step wizard**:
  - Objective → Budget & schedule → Audience (location, age, gender, language, interests + live reach estimate) → Placements (auto ya manual: Reels/Story/Feed/Explore) → Creative & preview → Review & publish.
  - Har step par right side live phone preview, left side form. Draft auto-save.
5. `**/ads/:id/creatives` — Library**: direct upload (image 10MB / video 100MB) private bucket + signed URLs, aspect ratio validation per placement.
6. `**/ads/:id/billing` — Wallet**: balance, top-up, spend ledger, invoices list.
7. `**/ads/review` — T&S queue**: staff-only approve/reject with reason; rejection advertiser ko notification.

### Billing (Phase 1 me shamil)

- Prepaid wallet: top-up → balance; campaign chalne par daily spend deduct.
- Balance khatam → campaigns auto-pause + notification.
- Payment provider: Manually qr code se payment karna hoga qr code admission os ke finance department se hoga jaha option rahega english kuch aacha sa manage payment ya kuch waha se qr upload hoga ye sab aur payment karne ke baad user ko utr number dalna hoga us admin os ka finance department approve karega tab hi coin wallet me jayega wallet ek hi universal hoga Aurelix wallet us me Aurelix coin hoga 
- Har mahine ya ads chalane wala organization chahe to har 15 days me bhi khud se download kar sakta hai alaga case me  ads chalne wala ko 2-3 din ya us se jade din ka chahiye to wo ticket bhi raise kar sakte hain jo finance department ke pass jayega waha se finance department us kitan din ka bhi generate kar ke ek click me omads orzination ke email pe bhej sakta hai ka branded invoice PDF/email (pehle wala finance email pipeline reuse).

### Design direction

Dark-first, data-dense workspace: left rail navigation, sticky toolbar (date range + account switcher), 8px spacing rhythm, tabular numerals for metrics, ek hi Lucide icon set, koi emoji nahi. Mobile par grid horizontally scroll ke bajaye card list me collapse hoga. Sab colors semantic tokens se (light + dark dono test honge).

### Delivery karne ka order

- **Step 1** — Schema migration + RLS + storage bucket.
- **Step 2** — Hooks layer (`src/hooks/ads/`) + shared UI atoms.
- **Step 3** — Business Center + account creation.
- **Step 4** — Campaign wizard + live previews (sabse bada piece).
- **Step 5** — Manager grid (3 tabs) + dashboard.
- **Step 6** — Creatives library + upload.
- **Step 7** — Wallet, top-up checkout, spend ledger, invoices.
- **Step 8** — T&S review queue + notifications.

### Mera suggestion (jo aap ne poocha)

1. **Delivery pehle mock rakhein**: Phase 1 me stats seed/simulate honge taki UI real lage; Phase 2 me actual ad serving + impression tracking jodenge — warna wizard ka feedback loop late milega.
2. **Auto placements default**: Meta ki tarah "Advantage+" style default rakho, manual sirf advanced users ke liye — clean UI ka yahi raaz hai.
3. **AI sirf wahan jahan value hai**: headline/primary-text suggestions aur "budget badhao / audience widen karo" recommendations — pura AI dashboard nahi.
4. **Review gate mandatory**: har ad publish se pehle T&S approve kare, tabhi platform enterprise lagega.

### Technical notes

- Naya `ads_*` schema banega; purana `aap_*` chhua nahi jayega (baad me archive/drop kar sakte hain — abhi aapka data safe rehta hai).
- Payments ke liye Lovable ka built-in Stripe integration enable karna hoga (Pro plan required) — wallet top-up ka checkout aur webhook usi par chalega.
- Storage: private `ads-creatives` bucket, signed URL reads.
- Reach estimate ek DB function se aayega (profiles/interests par count), UI me debounce ke saath.