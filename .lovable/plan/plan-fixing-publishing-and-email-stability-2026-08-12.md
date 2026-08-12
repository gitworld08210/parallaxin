# Plan - Fixing Publishing and Email Stability

The user is unable to publish the application, and the email domain setup is in a `provisioning_failed` state. This plan focuses on identifying the root cause of the publishing failure (likely missing secrets or connection issues) and fixing the email domain configuration to ensure automated HR emails function correctly.

## User Review Required

> [!IMPORTANT]
> The email domain `parallaxai.in` is currently in a `provisioning_failed` state. Please click **Set up email domain** in the actions below to verify your DNS settings (DKIM/SPF) in GoDaddy if you haven't already.

## Proposed Changes

### Infrastructure & Secrets
- **Verify Connections**: Ensure the Twilio and Google Mail connectors are correctly linked to the production environment.
- **Fix Secret Mismatches**: Standardize secret names across Edge Functions (e.g., ensuring `TWILIO_API_KEY` vs `TWILIO_AUTH_TOKEN` usage is consistent).
- **Cloudinary Integration**: Move hardcoded Cloudinary credentials to environment secrets to prevent build-time failures during sensitive data scrubbing.

### Email & HR Flow
- **Email Domain Restoration**: Trigger a re-verification of the `parallaxai.in` domain.
- **HR Email Fallback**: Update the `appoint-executive` function to provide clearer error reporting if the Gmail connector fails during the appointment process.

### Auth & Stability
- **Firebase Bridge**: Ensure the `FIREBASE_SERVICE_ACCOUNT_JSON` is correctly parsed in the `firebase-bridge` Edge Function to prevent login issues for new appointees.

## Technical Details

- **Deployment**: Investigate the exact error message from the Lovable deployment logs (simulated via `supabase--migration` or `supabase--deploy_edge_functions` checks if available).
- **Secrets**: Use `secrets--add_secret` to ensure `CLOUDINARY_API_SECRET` and `CLOUDINARY_API_KEY` are present in the backend environment.
- **Email**: Transition from Gmail connector to the native `parallaxai.in` domain once provisioning is successful for higher deliverability.

<presentation-actions>
<presentation-open-email-setup>Set up email domain</presentation-open-email-setup>
</presentation-actions>
