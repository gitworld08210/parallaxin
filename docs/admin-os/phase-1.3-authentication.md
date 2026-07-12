# Aurelix Admin OS — Phase 1.3: Authentication & Identity Management

> Status: Foundational specification. No authentication UI or backend implementation in this phase.
> Owner: Aurelix Core · People Operations · Security. Depends on: [Phase 1.1](./phase-1.1-vision.md), [Phase 1.2](./phase-1.2-architecture.md).

---

## 1. Objective

Design a secure, enterprise-grade authentication and identity management system for Aurelix Admin OS. The system must protect company resources, support multiple employee roles, and provide a secure onboarding experience while remaining scalable for future growth.

---

## 2. Authentication Philosophy

Authentication is the **first security layer** of Aurelix Admin OS.

- No employee receives access before completing the official onboarding process managed by People Operations (HR).
- Every authenticated user must have: verified identity, assigned role, department, permission set, and current employment status.

---

## 3. Login Methods

**Supported now**

- Email Address
- Password
- Two-Factor Authentication (2FA)

**Future**

- Passkeys
- Hardware Security Keys
- Enterprise SSO
- Biometric Authentication

---

## 4. Authentication Flow

```text
Employee opens application
            ↓
       Login Screen
            ↓
     Email Validation
            ↓
    Password Validation
            ↓
     2FA Verification
            ↓
Employment Status Validation
            ↓
    Permission Engine
            ↓
    Workspace Detection
            ↓
    Admin OS Dashboard
```

---

## 5. User Types

- Founder
- Co-Founder
- Employee
- Future Contractor
- Future Temporary Staff

Each user type may have different authentication rules.

---

## 6. Identity Management

Every employee must have:

- Employee ID
- Full Name
- Company Email
- Department
- Level
- Role
- Current Employment Status
- Reporting Manager
- Profile Photo (optional)
- Employee Passport
- Unique Internal Identifier

---

## 7. Account Creation

Employee accounts are **never self-created**.

```text
Interview Completed
        ↓
Offer Letter Sent
        ↓
Offer Accepted
        ↓
HR Verification
        ↓
Joining Date Confirmed
        ↓
HR Creates Employee Account
        ↓
Employee ID Generated
        ↓
Temporary Password Generated
        ↓
Employee Passport Created
        ↓
HR Reviews Information
        ↓
HR Manually Sends Welcome Email
        ↓
Employee First Login
        ↓
Force Password Change
        ↓
Enable 2FA
        ↓
Account Activated
```

---

## 8. Temporary Password Rules

Temporary passwords:

- Automatically generated
- High entropy
- Single use
- Expire automatically
- Invalid after first login

After first login the employee must:

- Change password
- Configure Two-Factor Authentication
- Accept company policies

Only then is the account activated.

---

## 9. Password Policy

Passwords must include:

- Minimum length
- Uppercase
- Lowercase
- Numbers
- Special characters

Password history must be maintained. Old passwords cannot be reused immediately.

---

## 10. Password Reset

Employees cannot directly reset passwords.

```text
Employee Request
        ↓
HR Verification
        ↓
Temporary Password Generated
        ↓
HR Sends Temporary Credentials
        ↓
Employee Logs In
        ↓
Mandatory Password Change
        ↓
   2FA Validation
```

---

## 11. Two-Factor Authentication

**Supported now**

- Authenticator Apps

**Future**

- Security Keys
- Enterprise Tokens

**Mandatory for**

- Founder Office
- Department Heads
- HR
- Finance
- Security

**Recommended** for all employees.

---

## 12. Employment Status Validation

Login depends on employment status.

| Status            | Access                                              |
| ----------------- | --------------------------------------------------- |
| Candidate         | ❌ No access                                        |
| Offer Sent        | ❌ No access                                        |
| Offer Accepted    | ❌ No access                                        |
| Pre-Onboarding    | ❌ No access                                        |
| Joining Today     | ✅ Login after HR releases credentials              |
| Active Employee   | ✅ Full role-based access                           |
| On Leave          | ✅ Access according to policy                       |
| Suspended         | ❌ Login blocked                                    |
| Resigned          | ❌ Login blocked                                    |
| Exited            | ❌ Login blocked                                    |
| Archived          | ❌ No access                                        |

---

## 13. Session Management

**Now**

- Active Sessions
- Device Tracking
- Login History
- Last Login
- Last Active Time

**Future**

- Remote Session Revocation
- Force Logout
- Trusted Devices

---

## 14. Device Management

Track:

- Device Name
- Browser
- Operating System
- Login Time
- Approximate Region
- IP Address (security logs)

Users can view their active sessions. Founder Office and Security can revoke sessions when required.

---

## 15. Login Security

Protection against:

- Brute Force Attacks
- Credential Stuffing
- Session Hijacking
- Suspicious Login Attempts
- Multiple Failed Logins

**Future**

- Risk-Based Authentication
- Adaptive Authentication

---

## 16. Authentication Audit Logs

Every authentication event must be logged. Examples:

- Login Success
- Login Failure
- Password Changed
- Password Reset
- 2FA Enabled
- 2FA Disabled
- Device Added
- Device Removed
- Session Revoked

**Logs cannot be modified.**

---

## 17. Notifications

Notify employee when:

- New Login
- Password Changed
- Password Reset
- New Device Login
- 2FA Changed

Founder Office and Security receive alerts for high-risk authentication events.

---

## 18. Permissions

- **Owner:** People Operations (HR)
- **Security Oversight:** Security Department
- **Critical Overrides:** Founder Office

---

## 19. Future Expansion

Support future integration, without redesign, with:

- Enterprise Identity Providers
- Single Sign-On (SSO)
- LDAP
- OAuth
- OpenID Connect
- SCIM Provisioning

---

## 20. Acceptance Criteria

Phase 1.3 is complete when:

- [x] Authentication flow is fully documented.
- [x] Identity management rules are finalized.
- [x] Employee onboarding authentication is defined.
- [x] Password policies are documented.
- [x] Session management is defined.
- [x] Device management is documented.
- [x] Employment status validation is completed.
- [x] Authentication audit requirements are finalized.

**No authentication UI or backend implementation is developed in this phase.**
