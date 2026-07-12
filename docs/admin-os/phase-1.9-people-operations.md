# AURELIX ADMIN OS

# PHASE 1.9 — People Operations (HR) & Employee Management

## Objective

Design a modern enterprise-grade People Operations (HR) system that manages the complete employee lifecycle, onboarding, employee records, transfers, promotions, documentation, and workforce management while ensuring security, accountability, and scalability.

---

# People Operations Philosophy

People Operations is responsible for managing employees throughout their employment lifecycle.

- HR manages processes.
- HR does NOT own technical authority.
- Technical decisions remain with Department Heads.

---

# Department Mission

Build, manage and support a world-class workforce through secure, standardized and scalable HR operations.

---

# Primary Responsibilities

- Recruitment
- Offer Management
- Employee Creation
- Employee Onboarding
- Employee Records
- Employee Passport
- Department Transfers
- Promotion Processing
- Employee Documents
- Leave Management
- Exit Management
- Employee Directory
- Workforce Reports
- HR Analytics
- Policy Distribution

---

# HR Dashboard

Dashboard Widgets:
- Today's Joining
- Pending Offers
- Pending Onboarding
- Employees on Leave
- Pending Transfers
- Promotion Requests
- Resignation Requests
- Employee Status Summary
- Recent Activities
- HR Calendar
- Company Announcements
- Quick Actions
- Department Statistics

---

# Employee Creation Workflow

```
Interview Completed
   ↓
Offer Approved
   ↓
Offer Sent
   ↓
Offer Accepted
   ↓
Background Verification (Optional)
   ↓
Joining Date Confirmed
   ↓
HR Creates Employee Profile
   ↓
Employee Passport Created
   ↓
Department Assigned
   ↓
Reporting Manager Assigned
   ↓
Level Assigned
   ↓
Temporary Password Generated
   ↓
Employee ID Generated
   ↓
HR Quality Check
   ↓
Manual Welcome Email Sent
   ↓
Employee First Login
   ↓
Password Change
   ↓
2FA Setup
   ↓
Active Employee
```

---

# Offer Letter Management

HR can:
- Create Offer Letter
- Preview
- Edit Draft
- Generate PDF
- Send Email
- Track Status
- Expire Offer
- Cancel Offer

Accepted offers become part of the employee record.

---

# Employee Passport

HR manages passport records.

Passport includes:
- Employee ID
- Photo
- Department History
- Team History
- Promotion History
- Skills
- Verified Skills
- Certifications
- Awards
- Projects
- Performance Trend
- Audit History
- Training History
- Employment Timeline
- Current Status
- Reporting Manager
- Emergency Contact
- Documents

Passport history cannot be deleted.

---

# Employee Directory

Search by:
- Employee ID
- Name
- Department
- Role
- Level
- Status
- Manager
- Skill
- Joining Date
- Location (Future)

Every employee profile must remain searchable.

---

# Employee Profile

- Basic Information
- Employment Information
- Passport
- Reporting Structure
- Skills
- Training
- Documents
- Performance Summary
- Promotion History
- Department History
- System Activity
- Audit History

---

# Employee Status

Supported Status:
- Candidate
- Offer Sent
- Offer Accepted
- Pre-Onboarding
- Joining Today
- Active
- On Leave
- Suspended
- Resigned
- Exited
- Archived

Status changes only through approved workflows.

---

# Promotion Processing

```
Department Head → Promotion Recommendation → HR Validation →
Founder Office (when policy requires) → Employee Record Updated →
Employee Passport Updated → Notification
```

HR manages the process but does not decide technical promotions.

---

# Department Transfer

```
Department Head Request → Receiving Department Approval →
HR Review → Employee Record Update → Passport Update →
Notification → Audit Log
```

---

# Leave Management

```
Employee submits request → Team Lead Review →
Department Head (if required) → HR Validation →
Leave Approved → Calendar Updated → Workload Reassigned
```

---

# Resignation Management

```
Employee submits resignation → Department Review →
Knowledge Transfer → Asset Return → HR Exit Process →
Founder Office (critical roles if required) → Exited → Archived
```

---

# Employee Documents

Store:
- Offer Letter
- Appointment Letter
- NDA
- Employee Agreement
- Government Documents
- Educational Certificates
- Experience Certificates
- Promotion Letters
- Warning Letters
- Salary Revision Letters
- Resignation Letter
- Exit Documents

Every document supports:
- Version History
- Audit Logs
- Download History
- Access Control

---

# Employee ID Generation

- Employee ID generated only by HR.
- Employee IDs cannot be manually edited after creation.
- Format must be configurable.

---

# Temporary Password

- Generated only by HR.
- Sent manually by HR after final onboarding review.
- Employee changes password during first login.

---

# Reporting Manager

Every employee must have:
- Reporting Manager
- Department
- Team
- Level

Manager history must be preserved.

---

# HR Analytics

- Employee Growth
- Department Distribution
- Joining Trends
- Exit Trends
- Promotion Trends
- Transfer Trends
- Leave Statistics
- Open Positions
- Workforce Distribution
- Future Hiring Forecast

---

# HR Permissions

**HR Can**
- Create Employee
- Update Employee Records
- Generate Employee ID
- Generate Temporary Password
- Manage Documents
- Manage Lifecycle
- Manage Leave
- Manage Transfers
- Manage Onboarding
- Manage Offboarding
- View Employee Passport

**Cannot**
- Promote without approval
- Verify Technical Skills
- Create Department
- Appoint Department Head
- Modify Founder Office
- Delete Audit Logs
- Override Security Policies

---

# Notifications

Notify:
- Employee
- Reporting Manager
- Department Head
- Founder Office (critical events)
- HR Team

for all major HR activities.

---

# Audit Logs

Record:
- Employee Created
- Offer Sent
- Offer Accepted
- Joining Completed
- Transfer
- Promotion Process
- Leave
- Document Upload
- Resignation
- Exit
- Archive
- Employee Record Updated

Logs cannot be modified.

---

# Future Expansion

Architecture must support:
- International Hiring
- Contract Employees
- Consultants
- Payroll
- Attendance
- Recruitment Portal
- Employee Benefits
- Performance Reviews
- Learning Management

without redesign.

---

# Acceptance Criteria

Phase 1.9 is complete when:
- HR responsibilities are documented.
- Employee creation workflow is finalized.
- Offer management is documented.
- Employee Passport is finalized.
- Promotion processing is documented.
- Transfer workflow is documented.
- Leave management is documented.
- Employee document management is finalized.
- HR permissions are documented.
- Audit requirements are completed.

No frontend, backend or database implementation was performed during this phase.
