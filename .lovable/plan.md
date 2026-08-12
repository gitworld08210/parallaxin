# Virtual World Access & Hiring Visibility Plan

The user is reporting that verification/reports are not reaching the correct departments and that "not able to publish" (likely referring to Virtual World communication failures). 

## Proposed Changes

### 1. Fix Virtual World Approved UI & "Send" Functionality
- **Issue**: The `virtual-world-send` Edge Function uses `is_admin_department_member` with department keys like `verification`, `founder-office`, and `trust-safety`. However, the migration `20260712040804` defines department keys as `founder_office` (underscore), but the function was checking for `founder-office` (dash) and `verification`. 
- **Action**: Standardize the Edge Function to check the correct department keys.
- **Action**: Update `virtual-world-send` to handle the Firebase authentication context since the app has migrated to Firebase Auth.

### 2. Standardize Department Routing
- **Issue**: User reports that KYC submissions and support requests aren't reaching their respective departments.
- **Action**: Verify the triggers/functions responsible for routing `verification_requests` and `reports`.
- **Action**: Ensure the "People Operations" and "Verification" department dashboards are correctly filtering based on their department keys.

### 3. Hiring Access Fix
- **Issue**: HR Head and COO need to be able to appoint members and see the recruitment queue.
- **Action**: Verify `useAppointments.ts` and `AppointmentsPanel.tsx` permissions logic.
- **Action**: Update the `appoint-executive` Edge Function to ensure it correctly identifies the caller's authority.

## Technical Details

### Edge Function: `virtual-world-send`
- Update the check for `is_admin_department_member` to use keys `verification`, `founder_office`, and `trust_safety`.
- Add logging to capture the exact reason for Twilio failures.

### Database Schema
- Ensure `virtual_world_applications` status transitions correctly notify the applicant.
- Verify `public.has_role` or `is_admin_department_member` consistency.

### Component Updates
- `src/pages/VirtualWorld.tsx`: Improve error display when the Edge Function returns specific Twilio errors.
- `src/pages/admin-os/verification/VirtualWorldRequests.tsx`: Ensure document viewing works with signed URLs for both Supabase and Cloudinary.
