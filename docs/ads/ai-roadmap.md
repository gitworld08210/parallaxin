# Aurelix AI Roadmap

The Higher Intelligence AI Gateway (`hi-aig` edge function + `ai_task_routes` table) is
the single entry point for every AI call in the app. Application code never picks a
model — it passes a `task` key and HI-AIG chooses primary → fallback.

## Current tasks

See `ai_task_routes` in the database. Edit rows there to swap models without
redeploying any code.

| task_key | purpose |
|---|---|
| general_reasoning | executive reports, campaign planning, long-context analysis |
| fast_daily | chat, UI assistant, quick summaries |
| ad_copy | headlines, descriptions, CTAs |
| image_analysis | OCR, brand logo, moderation |
| video_analysis | video review, scene detection |
| audio_transcribe | speech recognition |
| translation | localization |
| embeddings | semantic search |
| moderation | hate/violence/adult/spam |
| recommendation | reserved (internal ML) |
| fraud_detection | reserved (internal ML) |
| forecasting | reserved (internal ML) |

## Consent

- `user_ad_consent` — versioned, revocable opt-in for personalized ads.
- `user_dm_ai_consent` — separate opt-in required for any HI-AIG call tagged `source: 'dm'`. Without it the router refuses the request.

## Founder Office

Only aggregate insights (trends, revenue, health) — never private message content or PII.

## Future

Gradually replace third-party rows with Aurelix-internal endpoints:

1. Recommendation & ranking
2. Fraud detection
3. Forecasting
4. Ads optimization
5. Search
6. Proprietary foundation models
