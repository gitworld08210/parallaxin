## Phase 24 — Content Ownership Certificates

Give creators verifiable, timestamped proof of ownership for their posts and reels — without crypto wallets. Hashes are anchored to Bitcoin via OpenTimestamps (free, open standard). Clear disclaimer: this is proof-of-timestamp, not legal copyright registration.

### 1. Database (one migration)

New table `ownership_certificates`:
- `id` uuid PK
- `post_id` uuid → posts(id) on delete cascade, unique
- `creator_id` uuid → auth.users
- `content_hash` text (SHA-256 hex, 64 chars) — indexed
- `media_url` text (the hashed file URL at time of cert)
- `media_type` text ('image' | 'video')
- `ots_proof` bytea nullable (raw OpenTimestamps .ots file)
- `ots_status` text default 'pending' ('pending' | 'confirmed' | 'failed')
- `ots_confirmed_at` timestamptz
- `bitcoin_block_height` int nullable
- `created_at`, `updated_at`

Plus:
- index on `content_hash` for duplicate lookup
- GRANTs (authenticated select/insert; service_role all; anon select for public verify page)
- RLS: anyone can read (public verify); only creator can insert their own for their own post; only service_role can update OTS fields
- Helper RPC `get_certificate_by_hash(_hash text)` for public verify
- Add `has_certificate boolean default false` to `posts` (denormalized flag for badge rendering)

### 2. Edge functions (three new)

**`ownership-certify`** (called from composer/post-detail when creator opts in)
- Input: `post_id`
- Verifies caller owns post, fetches media URL, downloads file, computes SHA-256
- Checks for existing cert with same hash → returns "similar content" warning but still creates
- Inserts row, sets `posts.has_certificate = true`
- Calls OpenTimestamps `stamp` (via public OTS calendar HTTP API: `https://a.pool.opentimestamps.org`) to get initial `.ots` proof, stores in `ots_proof`
- Returns cert id

**`ownership-upgrade`** (scheduled, hourly cron with `CRON_SECRET`)
- Finds certs with `ots_status='pending'` older than 1 hour
- Calls OTS `upgrade` to fetch Bitcoin attestation; if confirmed, stores block height + flips status

**`ownership-pdf`** (called from cert detail page)
- Generates a downloadable PDF certificate (hash, timestamp, creator, post link, plain-English explanation, OTS proof note)
- Returns PDF blob

### 3. Frontend

- **Composer (`Compose.tsx` / `ReelCompose.tsx`)**: optional toggle "Generate Ownership Certificate" with one-line disclaimer; on publish, calls `ownership-certify` after post insert.
- **PostCard / Post detail**: small shield badge when `has_certificate=true`, links to cert page.
- **New route `/certificate/:postId`** (public, no auth required):
  - Hash, timestamp, creator, media preview
  - OTS status pill (Pending / Confirmed + block height)
  - "Download PDF" button → calls `ownership-pdf`
  - Shareable URL for third parties
  - Plain-language "what this proves / does not prove" section
- **Post detail (own posts)**: if no cert yet, "Generate certificate" button.

### 4. Originality check
- After hash computed in `ownership-certify`, lookup existing certs with same hash
- If found and different creator + earlier date, return `{ similarTo: { creator, createdAt } }`; UI shows informational toast — does not block

### Out of scope
- Perceptual hashing (only exact SHA-256 in v1; informational note in UI that re-encoded copies won't match)
- Pre-upload originality scanning
- Legal copyright filing

### Technical notes

```text
flow: publish post
  → insert posts row (existing)
  → if certify toggle on:
      invoke('ownership-certify', { post_id })
        ↓ fetch media, sha256
        ↓ insert ownership_certificates (ots_status='pending')
        ↓ POST hash to OTS calendar → store .ots
        ↓ UPDATE posts.has_certificate=true
  cron hourly:
      ownership-upgrade → OTS upgrade → confirmed + block height
```

Disclaimer copy used throughout: *"This certificate proves the exact file existed under your account at the timestamp shown. It is not a substitute for official copyright registration."*
