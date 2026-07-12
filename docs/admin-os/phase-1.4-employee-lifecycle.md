# AURELIX ADMIN OS

# PHASE 1.4 — Employee Lifecycle & Employment Management

## Objective

Design a complete employee lifecycle management system that governs every stage of an employee's journey inside the company, from candidate creation to archived records after exit. The lifecycle must ensure secure onboarding, controlled access, complete auditability, and smooth transitions without disrupting company operations.

---

## Employee Lifecycle Philosophy

Every employee must always have exactly one lifecycle status.

Permissions, dashboards, approvals, notifications, and responsibilities are automatically determined based on the employee's current status.

No employee should bypass any lifecycle stage.

---

# Employee Lifecycle

```
Candidate
   ↓
Offer Sent
   ↓
Offer Accepted
   ↓
Pre-Onboarding
   ↓
Joining Today
   ↓
Active Employee
   ↓
On Leave (Optional)
   ↓
Suspended (Optional)
   ↓
Resigned (Optional)
   ↓
Exited
   ↓
Archived
```

---

## Status Definitions

### Candidate
The person has entered the recruitment pipeline.

Allowed:
- HR Record
- Interview Process

Not Allowed:
- Login
- Employee ID
- Employee Passport
- Company Access

---

### Offer Sent
Offer letter has been generated and sent.

Allowed:
- Offer Tracking
- Offer Expiry
- HR Communication

Not Allowed:
- Login
- Employee Account

---

### Offer Accepted
Candidate has accepted the offer.

Allowed:
- Background Verification
- HR Preparation

Still Not Allowed:
- Login
- Employee Dashboard

---

### Pre-Onboarding
Joining has been confirmed.

HR prepares:
- Employee Profile
- Employee Passport
- Department
- Reporting Manager
- Employee Level
- Initial Permissions

Account remains inactive.

---

### Joining Today
HR manually completes onboarding.

Generate:
- Employee ID
- Temporary Password

HR manually sends:
- Welcome Email
- Employee ID
- Temporary Password
- Login Instructions

Employee performs first login.

System forces:
- Password Change
- 2FA Setup
- Policy Acceptance

After completion: Status automatically changes to Active Employee.

---

### Active Employee
Employee receives access according to:
- Department
- Role
- Level
- Permissions

Employee can now perform assigned work.

---

### On Leave
Employee remains employed.

Possible policies:
- Maintain Login
- Restricted Login
- Read Only

Department workload should automatically shift according to leave policy.

---

### Suspended
Account immediately blocked.

No login allowed. Employee records remain intact. Suspension reason must be mandatory. Only authorized personnel may remove suspension.

---

### Resigned
Employee has submitted resignation.

System starts Exit Workflow.

Required:
- Knowledge Transfer
- Asset Return
- Pending Task Transfer
- Manager Review
- HR Review

Employee access follows company policy.

---

### Exited
Employment officially ends.

System automatically:
- Disable Login
- Revoke Permissions
- Close Sessions
- Recover Assets
- Lock Employee Passport

Employee data becomes read-only.

---

### Archived
Employee record permanently stored. Cannot login. Cannot modify employment history. Visible only to authorized roles.

---

# Lifecycle Ownership

**People Operations (HR)** — Owns lifecycle transitions.

**Founder Office** — Approves critical lifecycle actions where company policy requires.

**Department Heads** — Provide recommendations during: Joining, Transfers, Promotions, Exit.

---

# Lifecycle Transition Rules

Every status change requires:
- Authorized User
- Timestamp
- Reason
- Audit Log

No silent transitions.

---

# Employee Creation Workflow

```
Candidate → Interview → Offer Sent → Offer Accepted →
HR Verification → Pre-Onboarding → Joining Today → Active Employee
```

---

# Employee Exit Workflow

```
Employee Resigns → Department Head Review → Knowledge Transfer →
HR Review → Asset Recovery → Access Revoked → Employee Exited → Archived
```

---

# Suspension Workflow

```
Violation Report → Department Recommendation → HR Review →
Founder Office (if required by policy) → Suspension → Audit Log
```

---

# Rejoining Workflow

```
Archived Employee → HR Review → Founder Approval (if policy requires) →
New Employee Record or Reactivation Policy → Fresh Onboarding Process
```

Old employment history must remain preserved.

---

# Employee Passport Integration

Employee Passport automatically updates when:
- Joined
- Promoted
- Department Changed
- Team Changed
- Skills Verified
- Awards Added
- Suspension
- Leave
- Resignation
- Exit

Passport becomes the permanent employment history.

---

# Notifications

Automatically notify:
- Employee
- Department Head
- Reporting Manager
- HR
- Founder Office (critical events)

for major lifecycle changes.

---

# Audit Logs

Log every lifecycle event. Examples:
- Candidate Created
- Offer Sent
- Offer Accepted
- Joining Completed
- Promotion
- Transfer
- Leave
- Suspension
- Resignation
- Exit
- Archive

Audit logs are immutable.

---

# Security Rules

No employee may:
- Change their own lifecycle status.
- Reactivate themselves.
- Restore deleted permissions.
- Modify employment history.

Only authorized workflows may change lifecycle states.

---

# Future Expansion

Architecture must support future additions such as:
- Probation
- Contract Employees
- Consultants
- Freelancers
- International Employees
- Multiple Company Branches

without redesigning the lifecycle engine.

---

# Acceptance Criteria

Phase 1.4 is complete when:
- Employee lifecycle is fully documented.
- Every status is defined.
- Transition rules are documented.
- Exit workflow is documented.
- Rejoin workflow is documented.
- Employee Passport integration is defined.
- Notifications are documented.
- Audit requirements are finalized.

No frontend, backend, or database implementation was performed in this phase.
