import os
import subprocess
import threading
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Attempt to load spacy and presidio
try:
    import spacy
    from presidio_analyzer import AnalyzerEngine
except ImportError:
    print("❌ Error: Dependencies not found. Please run 'pip install -r requirements.txt'")
    sys.exit(1)

app = Flask(__name__)
CORS(app) 

# Configuration
SPACY_MODEL = "en_core_web_lg"
OLLAMA_MODEL = "llama3.1:8b-instruct-q4_K_M"

def ensure_spacy_model():
    """Checks if the spaCy model is installed, downloads it if not."""
    try:
        spacy.load(SPACY_MODEL)
        print(f"✅ SpaCy model '{SPACY_MODEL}' is already installed.")
    except (OSError, ImportError):
        print(f"⬇️ Downloading SpaCy model '{SPACY_MODEL}' (this may take a few minutes)...")
        subprocess.check_call([sys.executable, "-m", "spacy", "download", SPACY_MODEL])
        print(f"✅ SpaCy model '{SPACY_MODEL}' downloaded successfully.")

def ensure_ollama_model():
    """Checks if the Ollama model is available, pulls it if not."""
    print(f"🦙 Checking for Ollama model '{OLLAMA_MODEL}'...")
    try:
        # Check if ollama is in PATH first
        subprocess.run(["ollama", "--version"], check=True, capture_output=True)
        # Pull the model (Ollama handles it if already exists)
        subprocess.Popen(["ollama", "pull", OLLAMA_MODEL])
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("⚠️ Warning: 'ollama' command not found. Please install Ollama from https://ollama.com")

# Ensure environment is ready
ensure_spacy_model()
ensure_ollama_model()

# Initialize the engine (loads the NLP model once at startup)
analyzer = AnalyzerEngine()

def kill_existing_ollama():
    """Kills any existing Ollama processes to prevent port conflicts."""
    print("🦙 Checking for existing Ollama processes...")
    try:
        if sys.platform == "win32":
            # Kill both the CLI and the App if they are running
            subprocess.run(["taskkill", "/F", "/IM", "ollama.exe", "/T"], capture_output=True)
            subprocess.run(["taskkill", "/F", "/IM", "ollama app.exe", "/T"], capture_output=True)
        else:
            subprocess.run(["pkill", "-f", "ollama"], capture_output=True)
        
        # Give it a moment to release the port
        import time
        time.sleep(2)
    except Exception:
        pass # Ignore errors if no process is found

def start_ollama():
    """
    Sets the required environment variable and starts Ollama 
    in a separate subprocess.
    """
    try:
        # 0. Kill existing instances first
        kill_existing_ollama()

        # 1. Set the Environment Variable (Cross-platform)
        # Using '*' is more robust for local development/extension use
        os.environ["OLLAMA_ORIGINS"] = "*"
        
        print("🦙 Launching Ollama with OLLAMA_ORIGINS='*'...")

        # 2. Start 'ollama serve' as a non-blocking subprocess
        subprocess.Popen(
            ["ollama", "serve"], 
            env=os.environ,
            shell=False
        )
        
    except FileNotFoundError:
        print("❌ Error: Could not find 'ollama'. Please ensure it is installed and added to your PATH.")
    except Exception as e:
        print(f"❌ Failed to start Ollama: {e}")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    text = data.get("text", "")
    
    if not text:
        return jsonify([])

    # Analyze text for PII entities
    results = analyzer.analyze(text=text, language='en')
    
    response = []
    for r in results:
        if r.score > 0.4:
            response.append({
                "type": r.entity_type,
                "start": r.start,
                "end": r.end,
                "score": r.score
            })
            
    return jsonify(response)

if __name__ == "__main__":
    # Start Ollama on a separate thread/process logic so it doesn't block Flask
    ollama_thread = threading.Thread(target=start_ollama)
    ollama_thread.start()

    print("🛡️ Presidio PII Server running on http://localhost:3000")
    app.run(port=3000, host="0.0.0.0") # Allow external connections if needed