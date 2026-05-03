import os
import subprocess
import sys
import venv
from pathlib import Path

# Try to import structlog for beautiful logging, fallback to print if not available
try:
    import structlog
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ]
    )
    logger = structlog.get_logger()
except ImportError:
    class FallbackLogger:
        def info(self, msg, **kwargs): print(f"[INFO] {msg} {kwargs if kwargs else ''}")
        def warning(self, msg, **kwargs): print(f"[WARN] {msg} {kwargs if kwargs else ''}")
        def error(self, msg, **kwargs): print(f"[ERROR] {msg} {kwargs if kwargs else ''}")
    logger = FallbackLogger()

# Configuration
VENV_DIR = "venv"
REQUIREMENTS_FILE = "requirements.txt"

def create_venv():
    """Creates a virtual environment if it doesn't exist."""
    if not os.path.exists(VENV_DIR):
        logger.info("Creating virtual environment", path=VENV_DIR)
        venv.create(VENV_DIR, with_pip=True)
    else:
        logger.info("Virtual environment already exists", path=VENV_DIR)

def get_pip_path():
    """Returns the path to the pip executable inside the venv."""
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    else:
        return os.path.join(VENV_DIR, "bin", "pip")

def install_requirements():
    """Installs dependencies from requirements.txt."""
    pip_path = get_pip_path()
    
    if not os.path.exists(pip_path):
        logger.error("pip not found in virtual environment. Setup failed.")
        return

    logger.info("Installing dependencies from requirements.txt", file=REQUIREMENTS_FILE)
    try:
        subprocess.check_call([pip_path, "install", "-r", REQUIREMENTS_FILE])
    except subprocess.CalledProcessError:
        logger.error("Failed to install requirements")
        sys.exit(1)

def install_extension_deps():
    """Installs npm dependencies for the browser extension."""
    extension_dir = Path("extension")
    if extension_dir.exists():
        logger.info("Installing extension dependencies")
        # Try pnpm first, then npm
        try:
            subprocess.check_call(["pnpm", "install"], cwd=extension_dir, shell=(sys.platform == "win32"))
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                subprocess.check_call(["npm", "install"], cwd=extension_dir, shell=(sys.platform == "win32"))
            except (subprocess.CalledProcessError, FileNotFoundError):
                logger.warning("Node.js/npm not found. Please install extension dependencies manually in the /extension folder.")

def main():
    # 1. Check if requirements.txt exists
    if not os.path.exists(REQUIREMENTS_FILE):
        logger.error("Requirements file not found", file=REQUIREMENTS_FILE)
        return

    # 2. Create Venv
    create_venv()

    # 3. Install Python Libraries
    install_requirements()

    # 4. Install Extension Dependencies
    install_extension_deps()

    logger.info("Setup complete")
    print("\nTo start your server:")
    if sys.platform == "win32":
        print(f"  {VENV_DIR}\\Scripts\\python server.py")
    else:
        print(f"  source {VENV_DIR}/bin/activate && python server.py")
    
    print("\nTo develop the extension:")
    print("  cd extension")
    print("  npm run dev")

if __name__ == "__main__":
    main()
