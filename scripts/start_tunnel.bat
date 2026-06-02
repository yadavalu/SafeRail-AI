@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   SafeRail.AI - Cloudflare Tunnel Starter
echo ===========================================

where cloudflared >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] cloudflared could not be found.
    echo Please install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    pause
    exit /b 1
)

:: Check if tunnel ID was replaced
findstr /C:"<REPLACE_WITH_TUNNEL_ID>" cloudflared.yaml >nul
if !errorlevel! equ 0 (
    echo [WARNING] Tunnel ID not set in scripts/cloudflared.yaml
    echo [INFO] Attempting to run as a quick tunnel instead...
    echo [INFO] Note: Quick tunnels use random subdomains and do not support llm.safeseal.xyz
    cloudflared tunnel --url http://localhost:3000
) else (
    echo [INFO] Starting named tunnel for llm.safeseal.xyz...
    cloudflared tunnel --config cloudflared.yaml run
)
pause
