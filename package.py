import os
import shutil
import subprocess
import zipfile
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent
EXTENSION_DIR = ROOT_DIR / "extension"
BUILD_DIR = ROOT_DIR / "dist_release"
EXTENSION_BUILD_DIR = EXTENSION_DIR / "build" / "chrome-mv3-prod"

def clean():
    """Removes previous build artifacts."""
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(exist_ok=True)

def build_extension():
    """Builds the Plasmo extension."""
    print("📦 Building Browser Extension...")
    try:
        # Determine if pnpm or npm should be used
        base_cmd = "pnpm" if shutil.which("pnpm") else "npm"
        # On Windows, we need shell=True for .cmd files like npm/pnpm
        is_windows = os.name == "nt"
        
        print(f"  > Running {base_cmd} install...")
        subprocess.check_call([base_cmd, "install"], cwd=EXTENSION_DIR, shell=is_windows)
        
        print(f"  > Running {base_cmd} run build...")
        subprocess.check_call([base_cmd, "run", "build"], cwd=EXTENSION_DIR, shell=is_windows)
        
        # Verify build directory exists
        if not EXTENSION_BUILD_DIR.exists():
            print(f"❌ Error: Build directory not found at {EXTENSION_BUILD_DIR}")
            print("Check if 'plasmo build' succeeded and outputted to the correct folder.")
            return

        # Zip the build
        zip_path = BUILD_DIR / "SafeRail_Extension.zip"
        print(f"  > Creating zip at {zip_path}...")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(EXTENSION_BUILD_DIR):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, EXTENSION_BUILD_DIR)
                    zipf.write(file_path, arcname)
        print(f"✅ Extension packaged: {zip_path}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Subprocess failed: {e}")
    except Exception as e:
        print(f"❌ Failed to build extension: {e}")
        import traceback
        traceback.print_exc()

def package_server():
    """Copies server files to the release directory."""
    print("📦 Packaging Backend Server...")
    server_dist = BUILD_DIR / "backend"
    server_dist.mkdir(exist_ok=True)
    
    # Files to include
    files_to_copy = ["server.py", "requirements.txt", "setup.py"]
    for f in files_to_copy:
        shutil.copy(ROOT_DIR / f, server_dist / f)
    
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

    print(f"✅ Backend files prepared in: {server_dist}")

def create_readme():
    """Creates a README for the release."""
    readme_content = """# SafeRail.AI Release

## Quick Start

### 1. Backend Setup
- Ensure you have **Python 3.10+** installed.
- Ensure you have **Ollama** installed from [ollama.com](https://ollama.com).
- Go to the `backend` folder.
- Run `start_server.bat`. 
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
    print(f"\n🎉 Packaging complete! Your release is ready in '{BUILD_DIR.name}'")

if __name__ == "__main__":
    main()
