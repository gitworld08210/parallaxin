# Hiring ka Payment + Finance Onboarding Flow

## Goal

Jab HR kisi ko hire kare, to payment (salary/joining bonus/allowances) HR khud decide na kare. Wo ek proposal Finance ko bhejegi. Finance department step-by-step approve kare, aur naye employee ke bank/documents Finance collect kare.

## User roles + authority


| Role                                     | Kya kar sakta hai                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| HR Head / HR Manager                     | Naye hire ka salary proposal banata hai (CTC, base, bonus, joining bonus, allowances, currency). Finance ko submit karta hai. |
| Finance L1 (analyst / associate)         | Proposal review kare. Approve → L2 par jaye. Reject/Reason ke saath return kar sake.                                          |
| Finance L2 (finance head / CFO delegate) | Final decision. Approve, Reject, ya Send-back-with-reason. L2 tak hi max approval hai.                                        |
| Founder / Co-Founder                     | Sab kuch dekh sakte hain, override kar sakte hain, but normal flow me involve nahi honge.                                     |
| Naya Employee                            | Apna bank account, PAN, Aadhaar, cancelled cheque etc. Finance ke secure form me upload kare (HR ke paas nahi jayegi).        |


## Data model (naye tables)

1. `hire_compensation_proposals`
  - employee_id, hiring_request_id (optional), candidate_id (optional)
  - currency, base_monthly, joining_bonus, variable_bonus, allowances (jsonb), notes
  - status: `draft` → `pending_finance_l1` → `pending_finance_l2` → `approved` / `rejected` / `sent_back`
  - submitted_by (HR user), submitted_at
  - l1_reviewer_id, l1_decision, l1_reason, l1_at
  - l2_reviewer_id, l2_decision, l2_reason, l2_at
2. `hire_finance_onboarding`
  - employee_id (unique), proposal_id
  - status: `awaiting_employee` → `submitted_by_employee` → `verified_by_finance` → `rejected`
  - Fields collected from the new employee:
    - bank_account_holder_name, bank_name, account_number (encrypted view), ifsc/swift, branch
    - pan_number, aadhaar_last4, tax_id (country agnostic)
    - address, emergency_contact
    - Documents (storage bucket, private): cancelled_cheque_path, pan_doc_path, aadhaar_doc_path, address_proof_path
  - finance_verified_by, finance_verified_at, rejection_reason
  - HR ke liye ye table read-only + masked hoga (sirf status dikhega, account number nahi).

## Access rules

- HR: `hire_compensation_proposals` me insert + update apne proposals; Finance approval fields readonly.
- Finance L1/L2: `hire_compensation_proposals` full read + update apne decision columns.
- `hire_finance_onboarding` par HR sirf status column dekhe (secure view use karenge, base table par HR ka SELECT deny).
- Employee: apna hi row read/update kar sakega jab tak `submitted_by_employee` na ho.
- Documents storage bucket private, RLS: Finance + owner-employee only.

Roles ka setup:

- 2 nayi admin roles: `finance_l1`, `finance_l2` (Finance department me jodenge).
- 4 nayi permissions: `finance.hire_comp.submit` (HR), `finance.hire_comp.review_l1`, `finance.hire_comp.approve_l2`, `finance.hire_onboarding.verify`.
- Auto-grant HR-permission wali roles ko `submit`; Finance L1 ko `review_l1`; L2 ko `approve_l2` + `verify`.

## UI additions

- **People Ops → Recruitment → Hire flow me “Salary proposal” step add**. HR fill karke Finance ko submit karega.
- **People Ops → Hire tracking**: HR ko status dikhta rahega (pending L1 / L2 / approved / rejected). Reject hone par edit karke resubmit kar sake.
- **Finance & Legal → Payroll → Hire Approvals** (nayi screen)
  - L1 tab: `pending_finance_l1` list, Approve/Reject/Reason.
  - L2 tab: `pending_finance_l2` list, Approve/Reject/Reason.
  - Sab decisions audit log me jayenge.
- **Finance & Legal → New Hire Bank Details** (nayi screen)
  - Approved proposals ki list.
  - Finance status dekhe, verify/reject kare.
  - Documents preview + download.
- **Naye employee ko first-login pe ek secure form**: “Complete your finance onboarding” — bank + PAN + document uploads. HR ko iska link/data nahi milega.

## Notifications

- Har state change par in-app notification: HR ko, L1 ko, L2 ko, employee ko.
- Audit log entry (module: `finance`) har transition par.

## Guardrails

- HR full appointment tabhi complete maani jayegi jab proposal `approved` + finance onboarding `verified_by_finance` ho. Warna employee ka status `pre_onboarding` par rahega, `active` nahi hoga.
- Founders/co-founders is flow se bypass — unke liye ye required na out)

- Actual salary disbursement / bank transfer integration — sirf approval + data collection tak.
- Payroll run / payslip generation — future step.

Approve karo to main sab kuch build kar deta hoon (migrations + UI + edge function for the employee-side secure form).