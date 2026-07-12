# Aurelix Admin OS — Phase 1.2: Application Architecture

> Status: Foundational architecture document. No business features implemented in this phase.
> Owner: Aurelix Core. Depends on: [Phase 1.1 — Vision](./phase-1.1-vision.md).

---

## 1. Objective

Design the core application architecture of Aurelix Admin OS to ensure long-term scalability, modular development, high security, and maintainability. The architecture must support future expansion **without requiring major redesign**.

---

## 2. Architecture Strategy

Aurelix uses a **Single Application Architecture**.

The same application serves:

- Normal Users
- Creators
- Organizations
- Employees
- Founder Office

Users never install separate apps. The system automatically loads the correct experience after authentication.

---

## 3. Application Flow

```text
Unauthenticated User
        ↓
      Login
        ↓
   Authentication
        ↓
   Role Detection
        ↓
  Permission Engine
        ↓
  Interface Loader
        ↓
Load Correct Workspace
```

---

## 4. Workspace Types

The application supports independent workspaces:

1. **Consumer Workspace**
2. **Creator Workspace**
3. **Organization Workspace**
4. **Admin OS Workspace**

Each workspace remains **isolated**. Modules from one workspace must never automatically load into another.

---

## 5. Workspace Switching

Only users with **multiple roles** can switch workspaces.

```text
Founder
   ↓
Social App
   ↓
Switch Workspace
   ↓
Admin OS
   ↓
Founder Console
   ↓
Switch Back
   ↓
Social App
```

- No logout required to switch.
- Employees without consumer access must never see consumer navigation.

---

## 6. Module Architecture

Every major feature exists as an **independent module**. Examples:

- Authentication
- People Operations
- Support
- Trust & Safety
- Verification
- Finance
- Engineering
- Organizations
- Creator Success
- Security
- Analytics
- ADOS
- Ads
- Settings
- Knowledge Center
- Internal Tickets
- Audit Center

Each module is independently maintainable.

---

## 7. Module Rules

Every module must contain:

- UI
- Business Logic
- Database Layer
- API Layer
- Permission Rules
- Audit Rules
- Notifications

No module directly depends on another module. Communication happens through **defined services and workflows** only.

---

## 8. Navigation Architecture

```text
Global Navigation
        ↓
Workspace Navigation
        ↓
Department Navigation
        ↓
  Module Navigation
        ↓
 Feature Navigation
```

Navigation changes **automatically according to permissions**.

---

## 9. Layout System

Every workspace follows the same layout system:

```text
        Top Header
            ↓
       Left Sidebar
            ↓
     Workspace Content
            ↓
Right Utility Panel (future)
            ↓
     Footer (optional)
```

This keeps the experience consistent across departments.

---

## 10. Routing

Every workspace has **protected routes**:

```text
   Authentication
        ↓
Permission Validation
        ↓
Workspace Validation
        ↓
   Route Access
```

Unauthorized users must never access restricted routes.

---

## 11. Configuration-Driven Architecture

No hardcoded values. The system supports configurable:

- Departments
- Roles
- Navigation
- Feature Visibility
- Permissions
- Settings

Future changes require **configuration, not code changes**.

---

## 12. Feature Loading

Modules load **only when required**.

- Normal users must never load Admin OS modules.
- Admin OS loads only after employee authentication.

This improves security and performance.

---

## 13. Plugin-Ready Architecture

The system supports adding future modules **without changing existing architecture**. Examples:

- AI Platform
- Workflow Builder
- Business Manager
- Developer Platform
- Enterprise APIs

Additional modules plug into the existing architecture.

---

## 14. Scalability Requirements

Architecture must support, without structural redesign:

- Thousands of employees
- Millions of users
- Multiple regions
- Multiple organizations
- Future international expansion

---

## 15. Security Requirements

- Protected routes
- Permission validation
- Session validation
- Device validation
- Workspace isolation
- Secure module loading

> Implementation will occur in later phases.

---

## 16. Future Expansion

Architecture must allow, without affecting existing workflows:

- Desktop applications
- Mobile applications
- Internal APIs
- External APIs
- AI services
- Microservice migration in future

---

## 17. Reference Directory Shape (non-binding)

Indicative layout for when modules begin to land in later phases:

```text
src/
  app/                  # shell, providers, router
  workspaces/
    consumer/
    creator/
    organization/
    admin-os/
  modules/
    <module-name>/
      ui/
      services/
      api/
      permissions/
      audit/
      notifications/
      routes.ts
      module.config.ts
  platform/
    auth/
    permissions/
    navigation/
    audit/
    config/
    routing/
```

Each `module.config.ts` declares the module's routes, required permissions, navigation entries, and audit events — enabling configuration-driven loading.

---

## 18. Acceptance Criteria

Phase 1.2 is complete when:

- [x] Single Application Architecture is defined.
- [x] Workspace architecture is finalized.
- [x] Module architecture is documented.
- [x] Navigation architecture is finalized.
- [x] Routing strategy is defined.
- [x] Configuration-driven architecture is established.
- [x] Plugin-ready architecture is documented.
- [x] Future scalability requirements are completed.

**No business features are implemented in this phase.**
