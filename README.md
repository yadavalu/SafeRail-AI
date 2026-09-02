# SafeRail AI

Keep Your Communication Secure and Professional

## What is SafeRail AI

### Problem

Security and Compliance Breaches cost Companies Millions in Legal and Reputational Damages, and spend thousands per employee to protect from this.

74% of the Issues don't originate from outside, but from Human Error. For fact, 1 in 20 emails contains compliance Risk. 

Although there are sophisticated cyber security tools, human risk is largely unaccounted for, and handled by slow auditing processes after the mistake has happened. 

### Solution

SafeRail screens where breaches occur, where employees communicate and submit data, from outbound emails, slack messages to inputs in llms. As text is typed, it is evaluated in real-time by a context-aware AI rule engine. This ensures sensitive data, regulatory obligations, and internal policies are consistently upheld.

If the System detects risk it notifies the employee before the mistake is finalized, making them aware of the issue and offering a Compliant Rewrite. Essentially, like a Security and Compliance Consultant at your Fingertips. 

## System Architecture

The SafeRail AI system consists of 3 core components:
1. **Browser Extension (Frontend)**: A Plasmo/React based extension that provides the real-time UI overlay.
2. **Backend Server (Python)**: A Flask server that runs AI analysis via Ollama, handles Employee Authentication, manages Rule Groups, and reports analytics.
3. **Cloudflare Tunnel (Networking)**: A secure tunnel that exposes the local Python backend to the outside world, allowing extensions installed on any PC to communicate securely with the backend.

---

## Setup Guide

Follow these steps to deploy your SafeRail AI instance.

### Prerequisites
- **Python 3.10+** (Added to PATH)
- **Node.js v18+ & pnpm**
- **Ollama** (Install from [ollama.com](https://ollama.com/) and ensure it's in your PATH)
- **Cloudflared** (Install from [Cloudflare Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/))

### 1. Firebase Credentials Setup
The backend and frontend both use Firebase for authentication and remote configuration.

1. **Backend Service Account**: 
   - Obtain a `serviceAccountKey.json` from your Firebase Project Settings (Service Accounts > Generate new private key).
   - Place `serviceAccountKey.json` in the `scripts/` directory. This allows the backend to sync compliance rules from Firestore.
2. **Frontend Config**: 
   - Ensure your Firebase Web App configuration is properly exported in `extension/firebase.ts`.

### 2. Automated Installation
We provide an automated script to install all dependencies for both the Python backend and the browser extension.

Run the setup script:
```bash
python scripts/setup.py
```
*(This will create a Python virtual environment, download necessary AI dependencies, and run `pnpm install` in the extension folder).*

### 3. Starting the Backend Server
The backend coordinates the Ollama models and handles analytical/authentication requests.

**On Windows:**
```bat
cd scripts
.\start_server.bat
```

**On Linux/Mac:**
```bash
cd scripts
./start_server.sh
```

*(Note: The server script will automatically download the necessary SpaCy models, start Ollama, create your group-specific LLMs like `saferail-engineering`, and start the Python server on port 3000).*

### 4. Starting the Cloudflare Tunnel
For the extension on any machine to securely reach your backend without complex port-forwarding, run the Cloudflare Tunnel.

**On Windows:**
```bat
cd scripts
.\start_tunnel.bat
```
This script reads from `scripts/cloudflared.yaml` to securely expose your local `127.0.0.1:3000` (Python Backend) and `127.0.0.1:11434` (Ollama Engine) to the internet under your `.safeseal.xyz` subdomain.

### 5. Building & Loading the Extension
To deploy the extension for your users, you need to build the production package.

**On Windows:**
```bat
.\Build_Release.bat
```

**On Linux/Mac:**
```bash
chmod 777 ./build_release.sh
./build_release.sh
```
This builds a production-ready extension package inside the `dist_release/` directory.

- Go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `dist_release/SafeRail_Extension` folder.

### 6. Usage & Admin Dashboard
Once installed and running:
1. Open the extension popup from your browser toolbar.
2. Ensure your backend endpoint is correctly set (e.g. `https://dev.safeseal.xyz`).
3. Click "Open Dashboard" to access the Admin Panel where you can configure compliance rules per-department, view real-time violation analytics, and manage users.
