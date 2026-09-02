# Authentication & Role-Based Access Control (RBAC)

SafeRail relies on a combination of **Firebase Authentication** and **Firestore** to determine user identity and permissions. There are two primary roles:
- **Admin**: Full access to global configuration, rule creation, and company-wide analytics.
- **Employee**: Read-only access to personal assigned rules and personal incident analytics.

## Login Flow
1. **User Submits Credentials**: The user enters their email and password into the extension's dashboard UI.
2. **Backend Proxy (`/api/auth/login`)**: The extension posts these credentials to the Python backend server.
3. **Firebase Auth**: The Python server forwards the credentials to the Google Identity Toolkit REST API to verify the password. If successful, Firebase returns a secure ID token.
4. **Role Resolution**: 
   - The server queries the `users` Firestore collection for a document matching the user's email.
   - It extracts the `isAdmin` boolean flag from the document.
   - If the user doesn't exist in Firestore yet, it automatically provisions a default Employee profile (`isAdmin: false`) in the database.
5. **Session Delivery**: The server responds to the extension with the ID token and the user's profile data (including the `isAdmin` status).
6. **Frontend Rendering**: The extension caches this profile in its local storage. If `isAdmin` is true, the React components render the full Configuration Management UI. If false, it renders a restricted, read-only dashboard.

## Caveats
Because the extension aggressively caches the `adminUser` profile, if an administrator's permissions are modified directly in the database (e.g., using a manual seed script), the user must explicitly click **Logout** and log in again on the frontend to pull the fresh `isAdmin` flag from the backend.
