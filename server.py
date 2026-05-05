import os
import subprocess
import threading
import sys
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
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

# Attempt to load spacy and presidio
try:
    import spacy
    from presidio_analyzer import AnalyzerEngine
except ImportError:
    logger.error("Dependencies not found", instruction="Please run 'pip install -r requirements.txt'")
    sys.exit(1)

import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
# Expects serviceAccountKey.json in the same directory or parent
db = None
def initialize_firebase():
    global db
    possible_paths = [
        "serviceAccountKey.json",
        os.path.join("..", "serviceAccountKey.json"),
        os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    ]
    
    key_path = None
    for path in possible_paths:
        if os.path.exists(path):
            key_path = path
            break

    if key_path:
        try:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            logger.info("Firebase Admin initialized successfully", path=key_path)
        except Exception as e:
            logger.error("Failed to initialize Firebase", error=str(e))
    else:
        logger.warning("'serviceAccountKey.json' not found", 
                       action="Firebase features disabled. Please place the key in the server directory.")

initialize_firebase()

app = Flask(__name__)
CORS(app) 

# Configuration
SPACY_MODEL = "en_core_web_lg"
BASE_MODEL = "llama3.1:8b-instruct-q4_K_M"
OLLAMA_MODEL = "saferail-llama"

def ensure_spacy_model():
    """Checks if the spaCy model is installed, downloads it if not."""
    try:
        spacy.load(SPACY_MODEL)
        logger.info("SpaCy model already installed", model=SPACY_MODEL)
    except (OSError, ImportError):
        logger.info("Downloading SpaCy model", model=SPACY_MODEL)
        subprocess.check_call([sys.executable, "-m", "spacy", "download", SPACY_MODEL])
        logger.info("SpaCy model downloaded successfully", model=SPACY_MODEL)

def ensure_ollama_model():
    """
    Checks if the Ollama model is available. 
    Pulls rules from Firebase (if available) or local file to generate Modelfile.
    """
    logger.info("Checking for Ollama model", model=OLLAMA_MODEL)
    try:
        # Check if ollama is in PATH first
        subprocess.run(["ollama", "--version"], check=True, capture_output=True)
        
        # 1. Fetch compliance rules
        rules_content = None
        
        # Try Firebase first
        if db:
            try:
                logger.info("Fetching compliance rules from Firebase")
                doc_ref = db.collection("config").document("settings")
                doc = doc_ref.get()
                if doc.exists:
                    rules_content = doc.to_dict().get("compliance_rules")
                    if rules_content:
                        logger.info("Rules fetched from Firebase")
            except Exception as e:
                logger.warning("Firebase fetch failed", error=str(e))

        # Fallback to local file
        if not rules_content:
            logger.info("Falling back to local compliance rules")
            rules_path = os.path.join("extension", "assets", "compliance_rules.txt")
            if os.path.exists(rules_path):
                with open(rules_path, "r") as f:
                    rules_content = f.read().strip()
            else:
                rules_content = "1. No promises of specific financial returns."
                logger.warning("Local rules file not found, using default rules")

        # 2. Generate the Modelfile dynamically
        modelfile_content = f"""FROM {BASE_MODEL}
PARAMETER num_ctx 4096
PARAMETER temperature 0
PARAMETER num_predict 256
PARAMETER top_k 10
PARAMETER top_p 0.5

SYSTEM \"\"\"
You are a STRICT COMPLIANCE OFFICER for a financial institution. Your job is to flag ANY violation of the RULESET, no matter how subtle or rephrased.

DEFINITIONS:
- "status": "green" -> No violations.
- "status": "warn" -> Subtle or borderline violation, or missing required disclaimer.
- "status": "clear_warn" -> BLATANT violation (e.g., guaranteed returns, absolute claims like "best", or negative competitor mentions).

RULESET:
{rules_content}

INSTRUCTIONS:
1. Analyze the INPUT_TEXT line-by-line.
2. If a user deletes a violating line, do NOT mention it in the new analysis.
3. Respond ONLY with JSON: {{ "status": "green" | "warn" | "clear_warn", "explanation": "Short reason." }}
4. If there is ANY mention of investment without 'Capital at risk', it is a "clear_warn".
5. If there is ANY promise of returns, it is a "clear_warn".
\"\"\"
"""
        with open("Modelfile", "w") as f:
            f.write(modelfile_content)

        # 3. Create/Update the custom model
        logger.info("Synchronizing custom model", model=OLLAMA_MODEL)
        subprocess.run(["ollama", "create", OLLAMA_MODEL, "-f", "Modelfile"], check=True)
        logger.info("Custom model synchronized successfully", model=OLLAMA_MODEL)
        
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        logger.warning("Ollama setup failed", error=str(e))
        logger.warning("Please ensure Ollama is installed and the 'ollama' command is in your PATH")

# Ensure environment is ready
ensure_spacy_model()
ensure_ollama_model()

# Initialize the engine (loads the NLP model once at startup)
analyzer = AnalyzerEngine()

def kill_existing_ollama():
    """Kills any existing Ollama processes to prevent port conflicts."""
    logger.info("Checking for existing Ollama processes")
    try:
        if sys.platform == "win32":
            subprocess.run(["taskkill", "/F", "/IM", "ollama.exe", "/T"], capture_output=True)
            subprocess.run(["taskkill", "/F", "/IM", "ollama app.exe", "/T"], capture_output=True)
        elif sys.platform == "darwin": # macOS
            subprocess.run(["pkill", "-9", "Ollama"], capture_output=True)
        else: # Linux
            subprocess.run(["pkill", "-f", "ollama"], capture_output=True)
        
        time.sleep(2)
    except Exception:
        pass 

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
        
        logger.info("Launching Ollama", OLLAMA_ORIGINS="*")

        # 2. Start 'ollama serve' as a non-blocking subprocess
        subprocess.Popen(
            ["ollama", "serve"], 
            env=os.environ,
            shell=False
        )
        
    except FileNotFoundError:
        logger.error("Could not find 'ollama'", action="Please ensure it is installed and added to your PATH")
    except Exception as e:
        logger.error("Failed to start Ollama", error=str(e))

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    text = data.get("text", "")
    
    if not text:
        return jsonify([])

    # Fetch denied entities from Firestore
    denied_entities = []
    if db:
        try:
            doc_ref = db.collection("config").document("settings")
            doc = doc_ref.get()
            if doc.exists:
                denied_entities = doc.to_dict().get("denied_entities", [])
        except Exception as e:
            logger.warning("Failed to fetch denied entities for analysis", error=str(e))

    # Analyze text for PII entities
    results = analyzer.analyze(text=text, language='en')
    
    response = []
    for r in results:
        # Skip results that are in the denied list
        if r.entity_type in denied_entities:
            continue
            
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

    from waitress import serve
    logger.info("SafeRail Production Server (Waitress) running", url="http://localhost:3000")
    serve(app, host="0.0.0.0", port=3000)
