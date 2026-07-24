## Problem
In Business Center → Creatives, the only way to add a creative is to paste a "Media URL". Advertisers don't have a link handy — they need to upload the file (photo/video) directly from their device.

## Plan

**1. Create a private storage bucket `ad-creatives`**
- Private bucket (files served via short-lived signed URLs).
- RLS on `storage.objects`:
  - Advertiser members can upload/read/delete files under `<advertiser_id>/…`.
  - Staff (Reviewer, Platform Admin, Founder) can read all — needed for moderation.

**2. Rework the Creatives "Upload" panel in `src/pages/ads/AdvertiserShell.tsx`**
- Replace the single "Upload URL" button with a segmented control: **Upload file** (default) / **Paste URL**.
- Upload file mode:
  - Native file picker restricted by chosen Format (`image/*` for image/carousel, `video/*` for video).
  - Client-side size guard (image ≤ 10 MB, video ≤ 100 MB) and MIME check.
  - Progress indicator while uploading to `ad-creatives/<advertiser_id>/<uuid>.<ext>`.
  - On success, store the storage path in `aap_creatives.media_url` (or a new `media_path` field — see technical notes) and refresh the library.
- Paste URL mode: keeps the current text input for external hosted media.
- Preview tile: if the creative is a stored file, fetch a signed URL to render; video files render in a `<video>` element with `muted` poster.

**3. Carousel support**
- When Format = `carousel`, allow selecting up to 10 images in one go and store them as an array (either JSON in `media_url` or a new `media_urls text[]` column — decide in build).

**4. No changes to campaigns/ad groups/finance** — this is a Creative Library UX change only.

## Technical notes
- Bucket creation via `supabase--storage_create_bucket` (private).
- Signed URL helper: `supabase.storage.from('ad-creatives').createSignedUrl(path, 3600)` used inside the creative card component; cache per session.
- Schema: prefer adding `media_path text` + `media_mime text` + `media_kind text` columns to `aap_creatives` (keeps `media_url` for external links). Migration + regenerated types before the UI edit.
- `useCreateCreative` hook (already in `src/hooks/ads/useCreatives.ts`) extended to accept the new fields.
- File input uses `accept="image/*"` or `accept="video/*"`; upload runs through `supabase.storage.from(...).upload()` with `upsert:false` and `cacheControl:'3600'`.

## Out of scope
- Video transcoding / thumbnail extraction (defer; show first frame via `<video preload="metadata">`).
- Ad-level creative override (still uses selector from library).
