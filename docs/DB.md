# SafeRail Database Architecture (Firebase)

This document outlines the architecture and structure of the SafeRail Firebase database. We migrated from a flat, monolithic JSON configuration document to a dynamic, scalable, multi-collection architecture to support role-based rules, individual employee tracking, and robust analytics.

## Collections

### 1. `users`
**Purpose**: Acts as the primary directory for all individuals interacting with the SafeRail system. Each user has a unique document.
**Document ID**: The user's lowercase email address (e.g., `alice.johnson@company.com`).
**Fields**:
- `email` *(string)*: The user's email address.
- `name` *(string)*: The user's full name.
- `role` *(string)*: The user's job title or department (e.g., "Sales", "Engineering").
- `isAdmin` *(boolean)*: A critical flag that explicitly differentiates an administrator from a standard employee. 
  - If `true`, the user has access to the full Admin Dashboard (editing rules, viewing the employee directory, modifying global settings).
  - If `false`, the user is restricted to the Employee Dashboard (read-only view of personal assigned rules and personal analytics).

*Note*: The backend `/api/auth/login` endpoint automatically creates a user document if one does not exist. The `admin@saferail.com` account is automatically seeded with `isAdmin: true`.

---

### 2. `rules`
**Purpose**: Stores all active compliance rules that the LLM uses to analyze outgoing emails.
**Document ID**: A unique, generated alphanumeric string.
**Fields**:
- `title` *(string)*: A short, descriptive name for the rule (e.g., "M&A discussion").
- `rule` *(string)*: The full, descriptive prompt text of the compliance rule that the LLM will enforce.
- `status` *(string)*: Either `"active"` or `"inactive"`. Inactive rules are ignored during analysis.
- `externalOnly` *(boolean)*: If `true`, this rule is *only* evaluated if the recipient's email domain differs from the sender's email domain.
- `appliedTo` *(array of strings | string)*: 
  - If `"all"`, the rule applies universally to every employee.
  - If an array of emails (e.g., `["alice.johnson@company.com"]`), the backend strictly enforces this rule *only* if the sender's email is present in this array. This allows administrators to craft individualized compliance rulesets.

---

### 3. `incidents`
**Purpose**: An append-only log of every time an email violates a compliance rule.
**Document ID**: A timestamp-based string.
**Fields**:
- `email` *(string)*: The email address of the employee who triggered the incident.
- `rule` *(string)*: The specific compliance rule that was violated.
- `severity` *(string)*: E.g., `"warning"`, `"violation"`, `"confidential"`.
- `date` *(ISO 8601 Timestamp)*: When the incident occurred.

*Note*: By keeping incidents in a dedicated collection, we can easily query and filter analytics. For example, an employee's dashboard simply queries `incidents` where `email == user.email` to generate their personal history without exposing company-wide violations.

---

### 4. `config`
**Purpose**: Stores global, application-wide settings that apply to all users regardless of role.
**Document ID**: `settings` and `analytics`
**Fields (in `settings`)**:
- `unsafe_domains` *(string)*: A newline-separated list of domains that are globally blocked (e.g., `competitor.com`).
- `denied_entities` *(array of strings)*: A list of Presidio PII entities (e.g., `["CREDIT_CARD", "US_SSN"]`) that the system should actively scan for and block.

## Access Flow
1. **Authentication**: The extension posts credentials to `/api/auth/login`. The server verifies with Firebase Auth, then fetches the document from the `users` collection to check the `isAdmin` flag.
2. **Analysis**: When an employee sends an email, the backend checks the `users` collection for their profile, then queries the `rules` collection to assemble a custom LLM prompt containing only the rules where `appliedTo == "all"` or the employee's email is explicitly listed.
3. **Dashboard Sync**: Admin changes to the rule list or employee directory are posted to `/api/config/settings`, which performs a batch write across the `rules`, `users`, and `config` collections to keep everything in sync.
