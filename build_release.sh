#!/bin/bash

# SafeRail.AI - Easy Packaging Script for Linux/macOS

echo "==========================================="
echo "  SafeRail.AI - Easy Packaging Script"
echo "==========================================="
echo ""

# Detect Python command
PYTHON_CMD=""

if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "[ERROR] Python was not found on your system."
    echo "Please install Python 3.10+ and ensure it is in your PATH."
    exit 1
fi

echo "[INFO] Using Python command: $PYTHON_CMD"
echo "[INFO] Running package.py..."

$PYTHON_CMD package.py

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Packaging failed. Please check the errors above."
    exit 1
fi

echo ""
echo "[SUCCESS] Your downloadable solution is ready in the 'dist_release' folder."
echo ""
