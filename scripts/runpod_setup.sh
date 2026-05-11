#!/bin/bash

echo "==========================================="
echo "  SafeRail.AI - RunPod Setup"
echo "==========================================="

# Check for curl
if ! command -v curl >/dev/null 2>&1; then
    echo "[ERROR] curl was not found. Please install curl."
    exit 1
fi

echo "[INFO] Downloading and installing NVM..."
if ! curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash; then
    echo "[ERROR] Failed to download or execute NVM installer."
    exit 1
fi

echo "[INFO] Loading NVM..."
# in lieu of restarting the shell
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    \. "$HOME/.nvm/nvm.sh"
else
    echo "[ERROR] NVM installation directory not found at $HOME/.nvm"
    exit 1
fi

echo "[INFO] Installing Node.js 24..."
if ! nvm install 24; then
    echo "[ERROR] Failed to install Node.js 24."
    exit 1
fi

echo "[INFO] Verifying Node.js version:"
if ! node -v; then
    echo "[ERROR] Node.js verification failed."
    exit 1
fi

echo "[INFO] Verifying npm version:"
if ! npm -v; then
    echo "[ERROR] npm verification failed."
    exit 1
fi

echo "[INFO] Setup complete."
echo
echo "[INFO] Please write file serviceAccountKey.json (for Firebase integration)."
echo "[INFO] Run start_server.sh to launch the application."
