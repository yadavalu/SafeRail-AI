#!/bin/bash

echo "==========================================="
echo "  SafeRail.AI - Backend Starter"
echo "==========================================="

# Detect Python command
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "[ERROR] Python was not found. Please install Python 3.10+."
    exit 1
fi

echo "[INFO] Running environment setup..."
"$PYTHON_CMD" setup.py

echo "[INFO] Starting SafeRail Backend..."
if [ -f "venv/bin/python" ]; then
    echo "[INFO] Starting Cloudflare Tunnel..."
    cloudflared tunnel --protocol http2 --config ".cloudflared/config.yml" run safeseal_tunnel &
    ./venv/bin/python server.py
else (
    echo "[ERROR] Virtual environment not found. Setup may have failed."
fi
