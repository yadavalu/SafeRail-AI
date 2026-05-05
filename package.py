import os
import shutil
import subprocess
import zipfile
from pathlib import Path
import structlog

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)
logger = structlog.get_logger()

# Paths
ROOT_DIR = Path(__file__).parent
EXTENSION_DIR = ROOT_DIR / "extension"
BUILD_DIR = ROOT_DIR / "dist_release"
EXTENSION_BUILD_DIR = EXTENSION_DIR / "build" / "chrome-mv3-prod"

def clean():
    """Removes previous build artifacts."""
    if BUILD_DIR.exists():
        logger.info("Cleaning previous build artifacts", path=str(BUILD_DIR))
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(exist_ok=True)

def build_extension():
    """Builds the Plasmo extension."""
    logger.info("Building Browser Extension")
    try:
        # Determine if pnpm or npm should be used
        base_cmd = "pnpm" if shutil.which("pnpm") else "npm"
        # On Windows, we need shell=True for .cmd files like npm/pnpm
        is_windows = os.name == "nt"
        
        logger.info("Installing extension dependencies", command=f"{base_cmd} install")
        subprocess.check_call([base_cmd, "install"], cwd=EXTENSION_DIR, shell=is_windows)
        
        logger.info("Running extension build", command=f"{base_cmd} run build")
        subprocess.check_call([base_cmd, "run", "build"], cwd=EXTENSION_DIR, shell=is_windows)
        
        # Verify build directory exists
        if not EXTENSION_BUILD_DIR.exists():
            logger.error("Build directory not found", path=str(EXTENSION_BUILD_DIR))
            return

        # Zip the build
        zip_path = BUILD_DIR / "SafeRail_Extension.zip"
        logger.info("Packaging extension into zip", zip_path=str(zip_path))
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(EXTENSION_BUILD_DIR):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, EXTENSION_BUILD_DIR)
                    zipf.write(file_path, arcname)
        logger.info("Extension packaged successfully", zip_path=str(zip_path))
    except subprocess.CalledProcessError as e:
        logger.error("Subprocess failed", error=str(e))
    except Exception as e:
        logger.error("Failed to build extension", error=str(e))

def package_server():
    """Copies server files to the release directory."""
    logger.info("Packaging Backend Server")
    server_dist = BUILD_DIR / "backend"
    server_dist.mkdir(exist_ok=True)
    
    # Files to include (explicitly excluding serviceAccountKey.json)
    files_to_copy = ["server.py", "requirements.txt", "setup.py", "Modelfile"]
    for f in files_to_copy:
        src = ROOT_DIR / f
        if src.exists():
            shutil.copy(src, server_dist / f)
    
    # Create a start script for the server with robust python detection
    with open(server_dist / "start_server.bat", "w") as f:
        f.write("@echo off\n")
        f.write("setlocal enabledelayedexpansion\n\n")
        f.write("echo ===========================================\n")
        f.write("echo   SafeRail.AI - Backend Starter\n")
        f.write("echo ===========================================\n\n")
        f.write(":: Detect Python command\n")
        f.write("set \"PYTHON_CMD=\"\n")
        f.write("python --version >nul 2>&1\n")
        f.write("if !errorlevel! equ 0 ( set \"PYTHON_CMD=python\" ) else (\n")
        f.write("  python3 --version >nul 2>&1\n")
        f.write("  if !errorlevel! equ 0 ( set \"PYTHON_CMD=python3\" ) else (\n")
        f.write("    py --version >nul 2>&1\n")
        f.write("    if !errorlevel! equ 0 ( set \"PYTHON_CMD=py\" )\n")
        f.write("  )\n")
        f.write(")\n\n")
        f.write("if \"%PYTHON_CMD%\"==\"\" (\n")
        f.write("    echo [ERROR] Python was not found. Please install Python 3.10+.\n")
        f.write("    pause\n")
        f.write("    exit /b\n")
        f.write(")\n\n")
        f.write("echo [INFO] Running environment setup...\n")
        f.write("%PYTHON_CMD% setup.py\n\n")
        f.write("echo [INFO] Starting SafeRail Backend...\n")
        f.write("if exist venv\\Scripts\\python.exe (\n")
        f.write("    venv\\Scripts\\python server.py\n")
        f.write(") else (\n")
        f.write("    echo [ERROR] Virtual environment not found. Setup may have failed.\n")
        f.write(")\n")
        f.write("pause\n")

    # Create a start script for macOS and Linux
    with open(server_dist / "start_server.sh", "w", newline='\n') as f:
        f.write("#!/bin/bash\n\n")
        f.write("echo \"===========================================\"\n")
        f.write("echo \"  SafeRail.AI - Backend Starter\"\n")
        f.write("echo \"===========================================\"\n\n")
        f.write("# Detect Python command\n")
        f.write("PYTHON_CMD=\"\"\n")
        f.write("if command -v python3 >/dev/null 2>&1; then\n")
        f.write("  PYTHON_CMD=\"python3\"\n")
        f.write("elif command -v python >/dev/null 2>&1; then\n")
        f.write("  PYTHON_CMD=\"python\"\n")
        f.write("fi\n\n")
        f.write("if [ -z \"$PYTHON_CMD\" ]; then\n")
        f.write("    echo \"[ERROR] Python was not found. Please install Python 3.10+.\"\n")
        f.write("    exit 1\n")
        f.write("fi\n\n")
        f.write("echo \"[INFO] Running environment setup...\"\n")
        f.write("\"$PYTHON_CMD\" setup.py\n\n")
        f.write("echo \"[INFO] Starting SafeRail Backend...\"\n")
        f.write("if [ -f \"venv/bin/python\" ]; then\n")
        f.write("    ./venv/bin/python server.py\n")
        f.write("else\n")
        f.write("    echo \"[ERROR] Virtual environment not found. Setup may have failed.\"\n")
        f.write("fi\n")
    
    # Make the shell script executable if on a POSIX system
    if os.name != 'nt':
        os.chmod(server_dist / "start_server.sh", 0o755)

    logger.info("Backend files prepared", destination=str(server_dist))

def create_readme():
    """Creates a README for the release."""
    readme_content = """# SafeRail.AI Release

## Quick Start

### 1. Backend Setup
- Ensure you have **Python 3.10+** installed.
- Ensure you have **Ollama** installed from [ollama.com](https://ollama.com).
- **Security Step**: Obtain your `serviceAccountKey.json` from your Firebase Project and place it in the `backend` folder. This is required for analytics and compliance rule synchronization.
- **Run the starter script:**
  - **Windows**: Run `start_server.bat`.
  - **macOS/Linux**: Run `chmod +x start_server.sh && ./start_server.sh`.
- This will create a virtual environment, install dependencies, and download the NLP model.
- It will also pull the Llama 3.1 model in Ollama.

### 2. Extension Installation
- Open Chrome or Edge.
- Go to `chrome://extensions`.
- Enable **Developer mode** (top right).
- Drag and drop `SafeRail_Extension.zip` into the page, OR extract it and use "Load unpacked".

## Requirements
- Internet connection (first run only) to download AI models.
- 8GB+ RAM recommended for local LLM.
"""
    with open(BUILD_DIR / "README_RELEASE.md", "w") as f:
        f.write(readme_content)

def main():
    clean()
    build_extension()
    package_server()
    create_readme()
    logger.info("Packaging complete", release_dir=str(BUILD_DIR))

if __name__ == "__main__":
    main()
