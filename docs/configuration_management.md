# Configuration Management

The Configuration Management system allows administrators to globally control the behavior of the SafeRail extension. It is only accessible to users with the `isAdmin: true` flag.

## Global Settings
Administrators can configure the following settings via the SafeRail dashboard:
- **Unsafe Domains**: A list of external recipient domains that the system should flag or block entirely.
- **Data Leak Filters (Presidio)**: A list of sensitive entities (e.g., `CREDIT_CARD`, `US_SSN`, `IP_ADDRESS`) that the local system should actively scan for and scrub.
- **Employee Directory**: Allows admins to view all provisioned users and explicitly assign them different job roles.

## Compliance Rules Engine
Admins can define arbitrary, natural-language rules that the LLM uses to analyze outgoing emails.
- Rules can be applied globally (to "All Employees") or selectively assigned to specific individuals.
- Rules can be marked to trigger *only* when the recipient domain is external.
- Administrators can seamlessly edit, toggle, or delete active rules without requiring an application redeployment.

## Data Flow
- **Fetching (`GET /api/config/settings`)**: When the admin dashboard loads, it pulls down all users, compliance rules, and blocked domains from Firestore.
- **Updating (`POST /api/config/settings`)**: When an admin clicks "Update Configuration", the extension posts the entire modified state to the server. The server strictly verifies the Bearer token to ensure the requester is an Admin. It then performs a batch update across the `config`, `rules`, and `users` Firestore collections to keep the system perfectly synced.
