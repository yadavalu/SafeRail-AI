# SafeRail Architecture Overview

SafeRail is a comprehensive compliance and security system designed to scan communications in real-time. This document provides a high-level overview of the main system components.

## System Components

### 🖥️ Frontend: Browser Extension
The frontend is built using **Plasmo**, a framework for browser extensions (React + TypeScript). 
- **Dashboard (`extension/tabs/dashboard.tsx`)**: The central hub for users. Its UI changes depending on whether the authenticated user is an `Admin` or an `Employee`.
- **Local Storage**: Uses Plasmo's `useStorage` hook to cache the user's session (`adminUser`), meaning the frontend remembers the user's role and credentials between sessions to avoid constant logins.

### ⚙️ Backend: Python / Flask Server
The backend (`scripts/server.py`) acts as the secure intermediary between the extension and the database. 
- **LLM Engine**: Uses tools like `spacy` and `ollama` (via `saferail-llama`) to analyze text for compliance.
- **REST API**: Exposes endpoints for authentication, fetching configurations, saving rules, and submitting analytics.

### 🗄️ Database: Firebase Firestore
A NoSQL database used to persist all application state across four primary collections:
- `users`: User profiles and role assignments (`isAdmin` flag).
- `rules`: Custom LLM compliance prompts.
- `incidents`: Logs of triggered compliance violations.
- `config`: Global settings like blocked domains and overall analytics.

For details on the database schema, please refer to the `DB.md` file in the root directory.
