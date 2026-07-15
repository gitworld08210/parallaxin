## Goal

Jab bhi HR ya koi department head kisi ko hire kare (ya koi bhi system trigger ho — offer, welcome, credentials, hiring approval), email automatically **company domain** (`notify.parallaxai.in`) se jaye — bilkul waise jaise Founder appoint karta hai to auto chala jata hai. Founder ka personal Gmail flow untouched rahega.

## Current state

- Domain `notify.parallaxai.in` add ho gaya hai but **DNS pending** hai GoDaddy par. Jab tak DNS verify nahi hoti tab tak koi bhi email actually send nahi hoga.
- HR "Send welcome email" button abhi sirf DB me log karta hai (`welcome_email_history`) — actual email nahi jata. Yahi asli gap hai.
- Founder appointment flow (`appoint-executive`) Gmail connector use karta hai → **isko chhod rahe hain** aapke instruction ke mutabik.
- Hiring flow (Offers → Onboarding) me kahin bhi candidate ko auto-email nahi jata.

## Step 1 — DNS setup (aapka action, GoDaddy par)

GoDaddy DNS dashboard me `parallaxai.in` ke andar ye records add karein (values Lovable ne assign kiye hain, exact copy karein):

| Type | Host / Name | Value |
|---|---|---|
| TXT | `_lovable-email` | `lovable_email_verify=a65eba7770c719a42b7be99cf1c69ef14b577fd6f7a77d73855aac5de2ca2c83` |
| NS  | `notify` | `ns3.lovable.cloud` |
| NS  | `notify` | `ns4.lovable.cloud` |

DNS propagate hone me kuch minute se kuch ghante lag sakte hain. Verification Cloud → Emails me automatically hoti rahegi.

**Scaffolding aur code changes DNS verify hone se pehle bhi ho sakti hain** — sirf actual send DNS ready hone ke baad start hoga.

## Step 2 — Email infrastructure + role-based aliases

1. `setup_email_infra` chala kar queue/cron/tables set up karenge (idempotent).
2. `scaffold_transactional_email` chala kar `send-transactional-email` edge function + templates registry banayenge.
3. Role-based "from" aliases ek jagah define honge (edge function ke andar constant map):

   | Purpose | From alias |
   |---|---|
   | HR hire / welcome / onboarding | `hr@notify.parallaxai.in` |
   | Careers / candidate / offer letter | `careers@notify.parallaxai.in` |
   | Department head appointments (non-founder) | `office@notify.parallaxai.in` |
   | System notifications / password / verification | `no-reply@notify.parallaxai.in` |
   | Payroll / payslip | `payroll@notify.parallaxai.in` |

   Har template registry me `fromAlias` field hoga jo yeh decide karega.

## Step 3 — Branded email templates

`supabase/functions/_shared/transactional-email-templates/` me ye templates banenge (Aurelix navy+gold branding, existing PDF ke saath consistent):

- `hr-welcome.tsx` — HR ka welcome-to-Aurelix email jab activate kare (name, company email, temp password, login URL, first-day info).
- `hr-hire-notification.tsx` — Naya hire hone par candidate ko congrats + starter info.
- `offer-letter.tsx` — Offer accept hone par candidate ko confirmation.
- `credentials-issued.tsx` — Jab bhi temp password/credentials reset ho.
- `department-appointment.tsx` — Jab department head kisi ko role appoint kare (non-founder path).
- `payslip-released.tsx` — Payroll cycle release hone par employee ko payslip ready notification (`/wallet/payslips` link).

Sab templates ek shared `AurelixLayout` component use karenge — logo, footer, brand colors ek jagah.

## Step 4 — Wiring HR hire flow (asli fix)

`src/hooks/admin-os/useOnboarding.ts` → `useSendWelcomeEmail`:
- DB log karne ke baad `supabase.functions.invoke('send-transactional-email', { templateName: 'hr-welcome', recipientEmail, templateData, idempotencyKey })` call karega.
- HR ke "Send welcome email" button click par actual email jayega — session_id + employee_id idempotency key banega, retry-safe.

`src/hooks/admin-os/useOnboarding.ts` → `useActivateEmployee`:
- Activation ke saath `credentials-issued` template auto-fire hoga if temp password mojood ho.

Hiring pipeline (`src/hooks/admin-os/useHiring.ts` / Offers flow):
- Offer status → `accepted` transition par `offer-letter` template auto-send.
- Candidate → employee conversion par `hr-hire-notification` auto-send.

Ye triggers HR / department head jo bhi karega, unke UI action se jud jayenge — Founder wale flow ki tarah "click ke saath auto email" ban jayega.

## Step 5 — Payroll notification (existing feature ke saath tie-in)

`PayrollCycles` me jab admin cycle ko `released` karta hai:
- Us cycle ke saare `payroll_items` iterate karke har employee ko `payslip-released` email jayega (`send-transactional-email` per item, idempotency = `payslip-{cycle_id}-{item_id}`).

## Step 6 — Verification

1. DNS verify hone tak Cloud → Emails me domain "Active" hone ka wait.
2. HR test flow: dummy employee ko welcome email bhejo → inbox me `hr@notify.parallaxai.in` se aana chahiye.
3. Offer accept flow → `careers@notify.parallaxai.in` se offer letter.
4. Payroll release → `payroll@notify.parallaxai.in` se payslip notification, `/wallet/payslips` link kaam kare.
5. `email_send_log` me har send ke against status = `sent` dikhe.

## Out of scope (is turn me nahi)

- Founder ka Gmail-connector appointment flow — aapke instruction ke mutabik untouched.
- Real PDF attach karna (Lovable Emails attachments support nahi karta — payslip/offer PDF ke liye Supabase Storage signed link email me embed hoga).
- Marketing / bulk emails.
- Custom unsubscribe page abhi default rahega; branded page baad me alag turn me.

## Technical notes

- One shared edge function `send-transactional-email`; alias per template via registry `fromAlias` mapping (Lovable Emails ye field support karta hai via `SENDER_DOMAIN` + display From).
- Idempotency keys use karenge har trigger site par to duplicate send na ho.
- RLS: HR / heads ke pass already `admin_role_permissions` hai; new email trigger sirf existing mutation ke andar chalega, koi new client-side privilege nahi.
- Deploy: har template add/edit ke baad `deploy_edge_functions` for `send-transactional-email`, `process-email-queue`.
