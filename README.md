# SafeRail AI

Keep Your Communication Secure and Professional

## What is SafeRail AI

### Problem

Security and Compliance Breaches cost Companies Millions in Legal and Reputational Damages, and spend thousands per employee to protect form this.

74% of the Issues don't originate from outside, but from Human Error. For fact 1 in 20 emails contains compliance Risk. 

Although there are sophisticated cyber security tools, human risk is largely un accounted for, and handled by slow auditing processes after the mistake has happened. 

### Solution

SafeRail screens where breaches occur, where employees communicate and submit data, from outbound emails, slack messages to inputs in llms. As text is typed, it is evaluated in real-time by a context-aware AI rule engine. This ensures sensitive data, regulatory obligations, and internal policies are consistently upheld.

If the System detects risk it notifies the employee before the mistake is finalised, making them aware of the issue and offering an Compliant Rewrite. Essentially, like a Security and Compliance Consultant at your Fingertips. 

## Setup

### 1. Backend Setup (Python & Ollama)
The backend handles PII analysis (Presidio) and coordinates the custom Llama model via Ollama.

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Ollama Configuration**:
    Install [Ollama](https://ollama.com/) and ensure it's in your PATH. The server will automatically pull the base model and create the custom `saferail-llama` model.
3.  **Firebase Service Account**:
    - Obtain a `serviceAccountKey.json` from your Firebase Project Settings (Service Accounts > Generate new private key).
    - Place `serviceAccountKey.json` in the root directory. This allows the backend to sync compliance rules from Firestore.
4.  **Run Server**:
    ```bash
    python server.py
    ```

### 2. Browser Extension Setup (Plasmo)
The extension provides the real-time UI overlay.

1.  **Install Dependencies**:
    ```bash
    cd extension
    npm install
    ```
2.  **Firebase Client Configuration**:
    - Create a file at `extension/firebase-config.ts`.
    - Populate it with your Firebase Web App configuration:
      ```typescript
      import { initializeApp } from "firebase/app";
      import { getAuth } from "firebase/auth";
      import { getFirestore } from "firebase/firestore/lite";

      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_ID",
        appId: "YOUR_APP_ID"
      };

      const app = initializeApp(firebaseConfig);
      export const auth = getAuth(app);
      export const db = getFirestore(app);
      ```
3.  **Run Development Mode**:
    ```bash
    npm run dev
    ```
    - Load the `extension/build/chrome-mv3-dev` folder as an unpacked extension in Chrome.


### 3. Build
To build easily on Windows
```ps
.\Build_Release.bat
```

Likewise, on Linux or MacOS
```bash
./build_release.sh
```


### 4. Admin Dashboard
Access the dashboard via the extension's dashboard tab (usually reachable at `chrome-extension://[ID]/tabs/dashboard.html`) to configure compliance rules and monitor analytics.


