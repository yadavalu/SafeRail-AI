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
SCRIPTS_DIR = ROOT_DIR / "scripts"
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

    # Files to include
    creds_to_copy = [
        "serviceAccountKey.json"
    ]

    src_files_to_copy = [
        "server.py", 
        "requirements.txt", 
        "setup.py", 
        "Modelfile",
        "start_server.bat",
        "start_server.sh",
        "Makefile"
    ]

    venv_folder_to_copy = [
        "venv"
    ]

    for f in src_files_to_copy:
        src = SCRIPTS_DIR / f
        if src.exists():
            logger.info("Copying server file", file=f)
            shutil.copy(src, server_dist / f)
        else:
            logger.error("Source file not found (skipping)", file=f)

    for f in creds_to_copy:
        src = ROOT_DIR / f
        if src.exists():
            logger.info("Copying credential file", file=f)
            shutil.copy(src, server_dist / f)
        else:
            logger.error("Credential file not found (skipping)", file=f)

    
    for f in venv_folder_to_copy:
        src = ROOT_DIR / f
        if src.exists():
            logger.info("Copying venv folder", file=f)
            shutil.copytree(src, server_dist / f, dirs_exist_ok=True)
        else:
            logger.warning("Venv folder not found (skipping)", file=f)

    # Copy assets for compliance rules
    assets_src = ROOT_DIR / "extension" / "assets"
    assets_dest = server_dist / "extension" / "assets"
    if assets_src.exists():
        logger.info("Copying assets directory")
        shutil.copytree(assets_src, assets_dest, dirs_exist_ok=True)

    # Copy Cloudflare config
    cf_src = ROOT_DIR / ".cloudflared"
    cf_dest = server_dist / ".cloudflared"
    if cf_src.exists():
        logger.info("Copying Cloudflare config")
        shutil.copytree(cf_src, cf_dest, dirs_exist_ok=True)

    # Ensure shell script is executable
    sh_script = server_dist / "start_server.sh"
    if sh_script.exists() and os.name != 'nt':
        os.chmod(sh_script, 0o755)

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
