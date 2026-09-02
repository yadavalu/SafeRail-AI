# SafeRail.AI — Implement Employee Authentication, Rule Groups, and Multi-Model Routing

I need to make a significant architectural change to the existing SafeRail.AI codebase. Before modifying anything, inspect the current project structure and understand the existing authentication, Firebase, rule management, Llama/Ollama, Gemini, API server, and Chrome extension flows.

Do not unnecessarily rewrite working components. Adapt the existing architecture to support the design below.

## Current Architecture

SafeRail.AI is a Chrome extension that checks email/communication text for compliance with company policies.

Currently:

- An admin dashboard allows an administrator to create/edit compliance rules.
- Rules are stored in Firebase.
- The backend/server retrieves the rules from Firebase.
- For local inference, the backend creates a Llama/Ollama Modelfile containing the rules in the system prompt.
- The resulting model is used for compliance inference.
- Gemini is also available as an alternative/test inference provider.
- For Gemini, the rules are supplied through its system prompt.
- The Chrome extension communicates with the SafeRail backend over HTTP/HTTPS.
- Firebase operations and LLM inference must remain server-side. The Chrome extension must remain a thin client.

The current assumption that every employee uses the same rules must now be removed.

# New Architecture

Employees belong to one of the following policy groups:

- Engineering
- Finance
- Administrative

There is also a special rule scope:

- All

"All" is NOT an employee group/model.

Rules assigned to "All" apply to every employee regardless of their department.

Therefore, the effective policy for each group is:

Engineering model:
GLOBAL/ALL rules + ENGINEERING rules

Finance model:
GLOBAL/ALL rules + FINANCE rules

Administrative model:
GLOBAL/ALL rules + ADMINISTRATIVE rules

For example:

```text
ALL:
- Never disclose confidential customer information.

ENGINEERING:
- Do not disclose unreleased technical architecture.

FINANCE:
- Transactions over X require approval.

ADMINISTRATIVE:
- ...
```

An Engineering employee should be checked against:

```text
ALL rules
+
ENGINEERING rules
```

They should NOT receive Finance or Administrative rules.

# 1. Employee Authentication

Implement/modify the login architecture so every employee has their own authenticated account.

Authentication must happen through the SafeRail backend.

The Chrome extension must NOT directly access Firebase.

Target flow:

```text
Chrome Extension
      |
      | credentials / authentication request
      v
SafeRail Backend
      |
      v
Firebase Authentication
      |
      v
Authenticated SafeRail session/token
      |
      v
Chrome Extension
```

Subsequent compliance requests should contain the authentication/session token.

Example conceptually:

```http
POST /check-compliance
Authorization: Bearer <token>

{
    "text": "email content..."
}
```

The backend must verify the token and determine the authenticated employee.

IMPORTANT SECURITY REQUIREMENT:

Do NOT trust a group, employee ID, or model supplied by the Chrome extension.

For example, the extension must NOT be able to request:

```json
{
    "group": "engineering",
    "model": "saferail-engineering"
}
```

and have the backend trust it.

Instead:

```text
token
  ↓
backend validates identity
  ↓
employee UID
  ↓
backend determines employee group
  ↓
backend selects model/policies
```

The server is the security boundary.

# 2. Employee Data

Each employee needs a policy group.

Use the existing Firebase architecture where possible.

Conceptually, an employee should have data similar to:

```json
{
    "uid": "...",
    "email": "employee@company.com",
    "group": "engineering"
}
```

Valid groups:

```text
engineering
finance
administrative
```

Do not hardcode employee identity into the Chrome extension.

# 3. Admin Dashboard

Modify the existing rule-management UI so an administrator can assign each rule to one of:

```text
ALL
ENGINEERING
FINANCE
ADMINISTRATIVE
```

Preserve the existing rule editing functionality where possible.

Each rule therefore needs a scope/group property.

Conceptually:

```json
{
    "id": "SR-017",
    "name": "Four Eye Contract Rule",
    "description": "Contracts above EUR 5000 require four-eye approval.",
    "scope": "finance",
    "enabled": true
}
```

or:

```json
{
    "id": "SR-001",
    "description": "...",
    "scope": "all",
    "enabled": true
}
```

Adapt this to the existing Firebase schema rather than creating unnecessary duplicate structures.

# 4. Local Llama/Ollama Architecture

Replace the current single ruleset-based Llama configuration with THREE SafeRail model configurations:

```text
saferail-engineering
saferail-finance
saferail-administrative
```

They should all use the same underlying/base Llama model.

Do NOT train or duplicate model weights.

The difference between the models is their SafeRail system prompt/rules.

Generate the effective rules as:

```text
engineering_rules =
    all_rules + engineering_specific_rules

finance_rules =
    all_rules + finance_specific_rules

administrative_rules =
    all_rules + administrative_specific_rules
```

Then generate/update the corresponding Ollama Modelfiles.

Conceptually:

```text
FROM <existing llama model>

SYSTEM """
You are SafeRail.AI, an enterprise communication compliance engine.

Evaluate the communication against the following company policies.

GLOBAL POLICIES:
...

ENGINEERING POLICIES:
...

Return the compliance result using the existing SafeRail response format.
"""
```

Equivalent Modelfiles should exist for Finance and Administrative.

Preserve the current inference prompt/response behavior unless changes are required for this architecture.

# 5. Model Creation

Use Ollama to create/update:

```bash
ollama create saferail-engineering -f <engineering-modelfile>
ollama create saferail-finance -f <finance-modelfile>
ollama create saferail-administrative -f <administrative-modelfile>
```

Reuse the same base model.

Do NOT create a separate model for "all".

"All" rules are incorporated into all three departmental Modelfiles.

# 6. Model Router

Add a clean server-side abstraction responsible for selecting the correct inference configuration.

Conceptually:

```python
GROUP_MODELS = {
    "engineering": "saferail-engineering",
    "finance": "saferail-finance",
    "administrative": "saferail-administrative",
}
```

Compliance request flow:

```text
Chrome extension
       ↓
SafeRail API
       ↓
verify authentication
       ↓
get authenticated UID
       ↓
determine employee group
       ↓
model router
       ↓
appropriate SafeRail model
       ↓
compliance result
```

Example:

```python
user = authenticate(token)

group = get_employee_group(user.uid)

model = GROUP_MODELS[group]

result = run_compliance_check(
    model=model,
    text=email_text
)
```

Use the actual abstractions/frameworks already present in the project instead of blindly copying this pseudocode.

# 7. Gemini Architecture

Gemini must follow exactly the same policy-group behavior.

However, Gemini does not require separate persistent models.

Resolve:

```text
authenticated employee
       ↓
group
       ↓
ALL rules + GROUP rules
       ↓
Gemini system instruction
       ↓
email
```

For example:

```python
effective_rules = get_effective_rules(group)

system_prompt = build_system_prompt(effective_rules)

gemini_response = ...
```

The Chrome extension should not know which policies were inserted into Gemini's prompt.

The server handles everything.

# 8. Rules Cache

Do NOT unnecessarily query Firebase for every compliance check.

Implement a server-side cache for:

- rules
- employee → group mappings where appropriate
- effective group policy sets

Since there are only three groups, effective policy sets can be represented conceptually as:

```text
engineering → ALL + ENGINEERING
finance → ALL + FINANCE
administrative → ALL + ADMINISTRATIVE
```

The exact implementation should fit the current backend architecture.

For the current MVP, an in-memory server cache is acceptable if appropriate.

Design the cache abstraction so it could later be replaced with Redis if SafeRail runs multiple backend instances.

# 9. Rule Updates

When an administrator changes a rule, determine which effective policy sets/models are affected.

If an Engineering-only rule changes:

```text
rebuild:
saferail-engineering
```

If a Finance-only rule changes:

```text
rebuild:
saferail-finance
```

If an Administrative-only rule changes:

```text
rebuild:
saferail-administrative
```

If an ALL rule changes:

```text
rebuild:
saferail-engineering
saferail-finance
saferail-administrative
```

Also invalidate/update the corresponding Gemini policy cache.

Do this safely so that compliance requests do not start using partially generated Modelfiles.

# 10. Policy Versioning

Add lightweight policy version tracking.

Each effective group policy should have a version/hash so we can identify which policy configuration produced a compliance result.

Conceptually:

```text
engineering: version/hash X
finance: version/hash Y
administrative: version/hash Z
```

A hash of normalized rule IDs/content is acceptable and may be preferable to manually incrementing numbers.

Where appropriate, compliance logs/results should internally retain:

```text
employee UID
employee group
policy version/hash
inference provider
model
timestamp
result
violated rule IDs
```

Do not expose sensitive internal information unnecessarily to the Chrome extension.

# 11. Concurrency

Do NOT instantiate a new Llama process/model for every employee.

The architecture must support many employees making simultaneous requests.

Conceptually:

```text
Employee A ─┐
Employee B ─┤
Employee C ─┼── SafeRail Backend
Employee D ─┤
Employee E ─┘
                  |
                  v
             Model Router
             /     |     \
            /      |      \
           v       v       v
         ENG      FIN     ADMIN
```

Employees within the same group use the same SafeRail model configuration.

Use the existing Ollama HTTP/inference mechanism where possible.

The backend should be asynchronous/non-blocking where the existing framework supports it.

Do not create one model or Modelfile per employee.

# 12. Chrome Extension Responsibilities

Keep the Chrome extension as thin as possible.

It should primarily:

1. Allow employee login.
2. Securely maintain the resulting session/authentication state using the existing extension architecture.
3. Extract/receive the communication text that needs checking.
4. Send the authenticated compliance request to SafeRail.
5. Display the returned result.

It should NOT:

- access Firebase directly
- retrieve company rules
- determine its own policy group
- choose the Llama model
- construct LLM system prompts
- contain Gemini credentials
- contain Firebase administrative credentials
- contain company policy databases

# 13. Maintain Provider Abstraction

If the current project supports switching between Llama and Gemini, preserve this.

Ideally the higher-level compliance flow should resemble:

```text
check_compliance(user, text)
          |
          v
     resolve group
          |
          v
 resolve effective policy
          |
          v
  selected provider
      /        \
     v          v
   Ollama     Gemini
```

Avoid duplicating authentication, group resolution, or policy resolution logic separately inside the Gemini and Llama implementations.

# 14. Future-Proofing

For now an employee belongs to one primary group:

```text
engineering
finance
administrative
```

Do NOT overengineer a complex RBAC/policy engine yet.

However, avoid coupling Firebase employee data directly to specific Ollama model names.

Bad:

```json
{
    "model": "saferail-engineering"
}
```

Better:

```json
{
    "group": "engineering"
}
```

Then the backend model router maps:

```text
engineering → saferail-engineering
```

This allows us to change the inference architecture later without migrating every employee record.

# Implementation Process

Before making changes:

1. Inspect the entire relevant codebase.
2. Identify the existing:
   - Firebase initialization
   - Firebase authentication
   - admin dashboard
   - rule schema
   - rule retrieval
   - Modelfile generation
   - Ollama startup/model creation
   - Llama inference endpoint
   - Gemini integration
   - Chrome extension API calls
   - current authentication/session handling
3. Produce a concise implementation plan showing which files/modules need modification or creation.
4. Point out any architectural conflicts between this requested design and the existing code.
5. Then implement the changes incrementally.

Prefer refactoring existing functionality over duplicating it.

Preserve existing SafeRail functionality unless it directly conflicts with the new architecture.

# Expected End State

The final system should behave like this:

```text
                       FIREBASE
                 ┌────────┴────────┐
                 │                 │
             Employees           Rules
             UID + group       scope + content
                 │                 │
                 └────────┬────────┘
                          │
                          v
                  SAFERAIL BACKEND
                  ┌───────────────┐
                  │ Auth          │
                  │ Policy Cache  │
                  │ Policy Resolver│
                  │ Model Router  │
                  └───────┬───────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              v                       v
           OLLAMA                   GEMINI
              │
       ┌──────┼──────┐
       │      │      │
       v      v      v
      ENG    FIN    ADMIN

Effective policies:

ENG   = ALL + ENGINEERING
FIN   = ALL + FINANCE
ADMIN = ALL + ADMINISTRATIVE
```

The Chrome extension only authenticates with the SafeRail backend and submits communication for analysis. All Firebase access, authorization, rule resolution, model selection, and inference configuration remain server-side.

After implementation, provide:

1. A summary of the architecture changes.
2. A list of files changed/created.
3. Any Firebase schema changes required.
4. Any migration needed for existing rules/users.
5. Instructions for creating/starting the three Ollama model configurations.
6. Required environment variables.
7. Instructions for testing each employee group.
8. Security assumptions or remaining concerns.
9. Any concurrency/scaling limitations of the current Ollama implementation.