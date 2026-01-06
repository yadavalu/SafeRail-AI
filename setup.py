import os
import subprocess
import sys
import venv
from pathlib import Path

# Configuration
VENV_DIR = "venv"
REQUIREMENTS_FILE = "requirements.txt"

def create_venv():
    """Creates a virtual environment if it doesn't exist."""
    if not os.path.exists(VENV_DIR):
        print(f"📦 Creating virtual environment in '{VENV_DIR}'...")
        venv.create(VENV_DIR, with_pip=True)
    else:
        print(f"✅ Virtual environment '{VENV_DIR}' already exists.")

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
        print("❌ Error: pip not found in virtual environment. Setup failed.")
        return

    print("⬇️  Installing dependencies from requirements.txt...")
    try:
        subprocess.check_call([pip_path, "install", "-r", REQUIREMENTS_FILE])
    except subprocess.CalledProcessError:
        print("❌ Failed to install requirements.")
        sys.exit(1)

def main():
    # 1. Check if requirements.txt exists
    if not os.path.exists(REQUIREMENTS_FILE):
        print(f"❌ Error: '{REQUIREMENTS_FILE}' not found.")
        return

    # 2. Create Venv
    create_venv()

    # 3. Install Libraries & Model
    install_requirements()

    print("\n🎉 Setup complete!")
    print("\nTo start your server, run:")
    
    if sys.platform == "win32":
        print(f"  {VENV_DIR}\\Scripts\\python server.py")
    else:
        print(f"  {VENV_DIR}/bin/python server.py")

if __name__ == "__main__":
    main()