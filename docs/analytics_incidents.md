# Analytics & Incident Tracking

SafeRail continuously monitors and logs compliance events to provide deep visibility into organizational data security.

## Incident Logging
When the LLM engine detects a compliance violation in a user's communication, the backend immediately writes a new document to the `incidents` Firestore collection. 

Each incident contains:
- The email address of the employee who triggered the event.
- The specific compliance rule that was violated.
- A severity rating (e.g., `warning`, `violation`, `confidential`).
- A UTC timestamp.

## Dashboard View (`/api/analytics`)
The backend provides a unified analytics endpoint that dynamically scopes the returned data based on the caller's role.

### Admin View
When an Admin requests analytics, the backend aggregates data from all incidents across the entire company.
- Displays total scanned messages, warnings, and hard violations.
- Renders a breakdown chart of which specific rules are being triggered the most.
- Lists a feed of the most recent incidents globally.

### Employee View
When a standard Employee requests analytics, the backend strictly filters the `incidents` collection to only return documents where `email == user.email`.
- This ensures employees can review their personal track record.
- It prevents employees from accessing confidential compliance data belonging to their coworkers or the company at large.
