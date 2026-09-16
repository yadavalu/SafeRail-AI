#!/bin/bash

echo "==========================================="
echo "  SafeRail.AI - Cloudflare Tunnel Starter"
echo "==========================================="

if ! command -v cloudflared &> /dev/null
then
    echo "[ERROR] cloudflared could not be found."
    echo "Please install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Check if tunnel ID was replaced
if grep -q "<REPLACE_WITH_TUNNEL_ID>" cloudflared.yaml; then
    echo "[WARNING] Tunnel ID not set in scripts/cloudflared.yaml"
    echo "[INFO] Attempting to run as a quick tunnel instead..."
    echo "[INFO] Note: Quick tunnels use random subdomains and do not support llm.saferail.io"
    cloudflared tunnel --url http://localhost:3000
else
    echo "[INFO] Starting named tunnel for llm.saferail.io..."
    cloudflared tunnel --config cloudflared.yaml run
fi
