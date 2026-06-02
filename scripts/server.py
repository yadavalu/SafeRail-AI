import os
import subprocess
import threading
import sys
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
import structlog
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)
logger = structlog.get_logger()

# Attempt to load spacy, presidio and google-generativeai
try:
    import spacy
    from presidio_analyzer import AnalyzerEngine
    import google.generativeai as genai
except ImportError:
    logger.error("Dependencies not found", instruction="Please run 'pip install -r requirements.txt'")
    sys.exit(1)

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API initialized")
else:
    logger.warning("GEMINI_API_KEY not found in .env")

import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
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

def get_system_prompt(rules_content):
    return f"""# Definition
You are a compliance expert for a company with compliance rules RULESET. You have two functions with your INPUT_TEXT: EVALUATE and REWRITE. EVALUATE takes the INPUT_TEXT and evaluates whether the text is compliant with the RULESET. REWRITE rewrites the INPUT_TEXT such that it is compliant with the RULESET

# RULESET:
{rules_content}

# Modes:
- If input starts with 'EVALUATE:', evaluate the INPUT_TEXT against the RULESET. Respond ONLY with JSON: {{"status": "green" | "warn" | "clear_warn", "explanation": "Short reason."}}
- If input starts with 'REWRITE:', rewrite the INPUT_TEXT to be fully compliant with the RULESET. Return ONLY the rewritten text, no preamble or explanation.

## INSTRUCTIONS FOR EVALUATE:
1. Analyze the INPUT_TEXT line-by-line.
2. If a user deletes a violating line, do NOT mention it in the new analysis.
3. Any violation of the RULESET by the text should be flagged based on intensity of the violation as "warn" or "clear_warn". Otherwise "green" if no violations found

## INSTRUCTIONS FOR REWRITE:
1. Identify all violations in the input.
2. The rewritten text should be compliant with the RULESET.
3. Provide ONLY the final rewritten text. DO NOT provide explanations, preamble, or any conversational filler."""

def get_compliance_rules():
    rules_content = None
    if db:
        try:
            doc_ref = db.collection("config").document("settings")
            doc = doc_ref.get()
            if doc.exists:
                rules_content = doc.to_dict().get("compliance_rules")
        except Exception:
            pass
    if not rules_content:
        rules_path = os.path.join("extension", "assets", "compliance_rules.txt")
        if os.path.exists(rules_path):
            with open(rules_path, "r") as f:
                rules_content = f.read().strip()
        else:
            rules_content = "1. No promises of specific financial returns."
    return rules_content

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
    """Checks if the Ollama model is available and synchronizes it."""
    logger.info("Checking for Ollama model", model=OLLAMA_MODEL)
    try:
        subprocess.run(["ollama", "--version"], check=True, capture_output=True)
        rules_content = get_compliance_rules()
        system_prompt = get_system_prompt(rules_content)
        
        modelfile_content = f"""FROM {BASE_MODEL}
PARAMETER num_ctx 4096
PARAMETER temperature 0
PARAMETER num_predict 512
PARAMETER top_k 10
PARAMETER top_p 0.5

SYSTEM \"\"\"{system_prompt}\"\"\"
"""
        with open("Modelfile", "w") as f:
            f.write(modelfile_content)
        
        subprocess.run(["ollama", "create", OLLAMA_MODEL, "-f", "Modelfile"], check=True)
        logger.info("Custom model synchronized successfully", model=OLLAMA_MODEL)
    except Exception as e:
        logger.warning("Ollama setup failed", error=str(e))

ensure_spacy_model()
ensure_ollama_model()
analyzer = AnalyzerEngine()

def kill_existing_ollama():
    try:
        if sys.platform == "win32":
            subprocess.run(["taskkill", "/F", "/IM", "ollama.exe", "/T"], capture_output=True)
            subprocess.run(["taskkill", "/F", "/IM", "ollama app.exe", "/T"], capture_output=True)
        else:
            subprocess.run(["pkill", "-f", "ollama"], capture_output=True)
        time.sleep(2)
    except Exception: pass

def start_ollama():
    try:
        kill_existing_ollama()
        os.environ["OLLAMA_ORIGINS"] = "*"
        os.environ["OLLAMA_HOST"] = "0.0.0.0"
        subprocess.Popen(["ollama", "serve"], env=os.environ, shell=False)
    except Exception as e:
        logger.error("Failed to start Ollama", error=str(e))

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "SafeRail Backend",
        "endpoints": ["/analyze", "/gemini/chat"]
    })

@app.route("/gemini/chat", methods=["POST"])
def gemini_chat():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured in .env"}), 500
    data = request.json
    messages = data.get("messages", [])
    if not messages: return jsonify({"error": "No messages"}), 400
    user_input = messages[-1]["content"]
    try:
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=get_system_prompt(get_compliance_rules()))
        response = model.generate_content(user_input)
        
        # Check if the response was blocked by safety filters
        if response.prompt_feedback and response.prompt_feedback.block_reason:
             return jsonify({"error": f"Gemini blocked the request: {response.prompt_feedback.block_reason}"}), 400
        
        try:
            return jsonify({"message": {"content": response.text}})
        except ValueError:
            # If response.text fails, it usually means it was blocked or empty
            return jsonify({"error": "Gemini returned an empty or blocked response."}), 400
            
    except Exception as e:
        logger.error("Gemini API error", error=str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    text = data.get("text", "")
    if not text: return jsonify([])
    denied_entities = []
    if db:
        try:
            doc = db.collection("config").document("settings").get()
            if doc.exists: denied_entities = doc.to_dict().get("denied_entities", [])
        except Exception: pass
    results = analyzer.analyze(text=text, language='en')
    response = []
    for r in results:
        if r.entity_type not in denied_entities and r.score > 0.4:
            response.append({"type": r.entity_type, "start": r.start, "end": r.end, "score": r.score})
    return jsonify(response)

if __name__ == "__main__":
    threading.Thread(target=start_ollama).start()
    from waitress import serve
    logger.info("SafeRail Production Server running", health_check="http://localhost:3000/")
    serve(app, host="0.0.0.0", port=3000)
