# Virtual World & Admin OS Enhancements Plan

Fix reported issues in Virtual World communication and improve Admin OS operational visibility for Founders and HR.

## User-facing changes
- **Virtual World Status Updates**: Added real-time feedback in the Virtual World UI. If a message or call fails, you'll see exactly why (e.g., "Daily limit reached" or "Number format incorrect").
- **Improved KYC Review**: Verification staff now have a more robust interface for reviewing Aadhaar documents and granting access to the private communication suite.
- **Enhanced Passport Visibility**: Fixed issues where certain employee details weren't loading in the Digital Passport, ensuring HR and Founders have a complete view of an employee's career history, skills, and certifications.
- **Onboarding Transparency**: Improved the onboarding queue to show exactly where each new hire is in the process (from HR review to credential issuance).

## Technical details
- **Edge Function Reliability**: Configured `virtual-world-send` in `supabase/config.toml` with `verify_jwt = true` to ensure secure caller identity and prevent unauthorized access.
- **Error Handling**: Enhanced the `invoke` call in `src/pages/VirtualWorld.tsx` to surface provider-specific errors (status codes and body details) to the frontend toast notifications.
- **Permission Auditing**: Verified `ADMIN_PERMISSIONS` mapping for People Ops and Founder Office to ensure they have the necessary overrides to view any employee passport.
- **Database Schema Sync**: Verified `virtual_world_access` and `virtual_world_logs` tables to ensure RLS policies allow for the automated daily limit tracking and history logging.

## Proposed Changes

### Configuration
#### [supabase/config.toml](supabase/config.toml)
- Add `virtual-world-send` function configuration with `verify_jwt = true`.

### Frontend
#### [src/pages/VirtualWorld.tsx](src/pages/VirtualWorld.tsx)
- Improve error handling in the `send` function to parse and display detailed error messages from the Edge Function response.

#### [src/pages/admin-os/verification/VirtualWorldRequests.tsx](src/pages/admin-os/verification/VirtualWorldRequests.tsx)
- Refine the review UI to handle document loading more gracefully and ensure decision notes are properly saved.

#### [src/pages/admin-os/people-ops/OnboardingQueue.tsx](src/pages/admin-os/people-ops/OnboardingQueue.tsx)
- Update the queue to better reflect the current stage of new hires and fix potential loading issues.
