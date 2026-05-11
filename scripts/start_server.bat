@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   SafeRail.AI - Backend Starter
echo ===========================================

:: Detect Python command
set "PYTHON_CMD="
python --version >nul 2>&1
if !errorlevel! equ 0 ( set "PYTHON_CMD=python" ) else (
  python3 --version >nul 2>&1
  if !errorlevel! equ 0 ( set "PYTHON_CMD=python3" ) else (
    py --version >nul 2>&1
    if !errorlevel! equ 0 ( set "PYTHON_CMD=py" )
  )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found. Please install Python 3.10+.
    pause
    exit /b
)

echo [INFO] Running environment setup...
%PYTHON_CMD% setup.py

echo [INFO] Starting Ollama server in the background...
ollama serve > ollama.log 2>&1 &

echo [INFO] Starting SafeRail Backend...
if exist venv\Scripts\python.exe (
    venv\Scripts\python server.py
) else (
    echo [ERROR] Virtual environment not found. Setup may have failed.
)
pause
