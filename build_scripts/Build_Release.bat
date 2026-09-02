@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo   SafeRail.AI - Easy Packaging Script
echo ===========================================
echo.

:: Detect Python command
set "PYTHON_CMD="

:: 1. Try 'python'
python --version >nul 2>&1
if !errorlevel! equ 0 (
    set "PYTHON_CMD=python"
) else (
    :: 2. Try 'python3'
    python3 --version >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python3"
    ) else (
        :: 3. Try 'py' (Windows Launcher)
        py --version >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_CMD=py"
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found on your system.
    echo Please install Python 3.10+ and ensure it is in your PATH.
    pause
    exit /b
)

echo [INFO] Using Python command: %PYTHON_CMD%
echo [INFO] Running package.py...
%PYTHON_CMD% package.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Packaging failed. Please check the errors above.
    pause
    exit /b
)

echo.
echo [SUCCESS] Your downloadable solution is ready in the 'dist_release' folder.
echo.
pause
