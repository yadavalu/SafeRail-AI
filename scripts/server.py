import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import structlog
import json

from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai

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
GEMINI_MODEL_NAME = "gemini-2.5-pro"

# Configure Gemini
api_key = os.environ.get("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    logger.info("Gemini initialized with API key")
else:
    logger.warning("GOOGLE_API_KEY environment variable not found. Gemini calls will fail.")

def ensure_spacy_model():
    """Checks if the spaCy model is installed, downloads it if not."""
    try:
        spacy.load(SPACY_MODEL)
        logger.info("SpaCy model already installed", model=SPACY_MODEL)
    except (OSError, ImportError):
        logger.info("Downloading SpaCy model", model=SPACY_MODEL)
        import subprocess
        subprocess.check_call([sys.executable, "-m", "spacy", "download", SPACY_MODEL])
        logger.info("SpaCy model downloaded successfully", model=SPACY_MODEL)

def get_compliance_rules():
    rules_content = None
    if db:
        try:
            doc_ref = db.collection("config").document("settings")
            doc = doc_ref.get()
            if doc.exists:
                rules_content = doc.to_dict().get("compliance_rules")
        except Exception as e:
            logger.warning("Firebase fetch failed", error=str(e))

    if not rules_content:
        rules_path = os.path.join("extension", "assets", "compliance_rules.txt")
        # Try finding it relative to different base dirs
        if not os.path.exists(rules_path):
            rules_path = os.path.join("..", "extension", "assets", "compliance_rules.txt")
        if os.path.exists(rules_path):
            with open(rules_path, "r") as f:
                rules_content = f.read().strip()
        else:
            rules_content = "1. No promises of specific financial returns."
            logger.warning("Local rules file not found, using default rules")
            
    return rules_content

def get_gemini_model():
    rules_content = get_compliance_rules()
    system_instruction = f"""# Definition
You are a compliance expert for a company with compliance rules RULESET. You have two functions with your INPUT_TEXT: EVALUATE and REWRITE. EVALUATE takes the INPUT_TEXT and evaluates whether the text is compliant with the RULESET. REWRITE rewrites the INPUT_TEXT such that it is compliant with the RULESET

# RULESET:
{rules_content}
Four-eye principle for commitments above EUR 5,000
Trigger when the email appears to approve, accept, order, renew, amend, or commit to something with a value above EUR 5,000, and there is no clear authorized countersigner in cc                                                                                       Legal review trigger above EUR 150,000 or high-risk contract type
Trigger when the email appears to send, approve, sign, accept, renew, amend, or negotiate a contract with total value above EUR 150,000, or when the email involves legal-review triggers such as personal data processing or uncertain clauses.
Circumvention or threshold-splitting language
Trigger when the email suggests splitting contracts, purchase orders, scopes, or invoices to avoid approval, Legal review, signing thresholds, or procurement process.

# Modes:
- If input starts with 'EVALUATE:', evaluate the INPUT_TEXT against the RULESET. Respond ONLY with JSON: {{"status": "green" | "warn" | "clear_warn", "explanation": "Short reason.", "highlight": "exact problematic text from INPUT_TEXT to underline"}}
- If input starts with 'REWRITE:', rewrite the INPUT_TEXT to be fully compliant with the RULESET. Return ONLY the rewritten text, no preamble or explanation.

## INSTRUCTIONS FOR EVALUATE:
1. Analyze the INPUT_TEXT line-by-line.
2. Identify the exact text segment that causes the violation.
3. If multiple violations exist, pick the most critical one for the "highlight" field.
4. If no violations exist, "highlight" should be an empty string "".
5. The "highlight" field MUST contain text that exists exactly as-is within the INPUT_TEXT.
6. Any violation of the RULESET by the text should be flagged based on intensity of the violation as "warn" or "clear_warn". Otherwise "green" if no violations found.


## INSTRUCTIONS FOR REWRITE:
1. Identify all violations in the input.
2. The rewritten text should be compliant with the RULESET.
3. Provide ONLY the final rewritten text. DO NOT provide explanations, preamble, or any conversational filler.
"""
    return genai.GenerativeModel(
        model_name=GEMINI_MODEL_NAME,
        system_instruction=system_instruction,
        generation_config=genai.types.GenerationConfig(
            temperature=0,
            top_p=0.5,
            top_k=10,
            max_output_tokens=8192,
        ),
        safety_settings={
            genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai.types.HarmBlockThreshold.BLOCK_NONE,
            genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH: genai.types.HarmBlockThreshold.BLOCK_NONE,
            genai.types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: genai.types.HarmBlockThreshold.BLOCK_NONE,
            genai.types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: genai.types.HarmBlockThreshold.BLOCK_NONE,
        }
    )

# Ensure environment is ready
ensure_spacy_model()
analyzer = AnalyzerEngine()

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "service": "SafeRail Backend",
        "endpoints": ["/analyze", "/evaluate", "/rewrite"]
    })

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    text = data.get("text", "")
    
    if not text:
        return jsonify([])

    denied_entities = []
    if db:
        try:
            doc_ref = db.collection("config").document("settings")
            doc = doc_ref.get()
            if doc.exists:
                denied_entities = doc.to_dict().get("denied_entities", [])
        except Exception as e:
            logger.warning("Failed to fetch denied entities for analysis", error=str(e))

    results = analyzer.analyze(text=text, language='en')
    
    response = []
    for r in results:
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

@app.route("/evaluate", methods=["POST"])
def evaluate():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"status": "grey", "explanation": "No text provided."})

    try:
        model = get_gemini_model()
        # Enforce JSON output for evaluate
        response = model.generate_content(
            f"EVALUATE: {text}",
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        if response.candidates and response.candidates[0].finish_reason != 1: # 1 is STOP
             logger.warning("Gemini Evaluate finished with non-stop reason", 
                            reason=response.candidates[0].finish_reason,
                            text=getattr(response, 'text', 'N/A'))
        
        return response.text
    except Exception as e:
        logger.error("Gemini Evaluate Error", error=str(e))
        return jsonify({"status": "grey", "explanation": f"LLM Error: {str(e)}"})

@app.route("/rewrite", methods=["POST"])
def rewrite():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"rewrittenText": ""})

    try:
        model = get_gemini_model()
        response = model.generate_content(f"REWRITE: {text}")
        
        # Robust handling for potential blocked or limited responses
        if response.candidates and response.candidates[0].finish_reason != 1:
            logger.warning("Gemini Rewrite finished with non-stop reason", 
                           reason=response.candidates[0].finish_reason)
            
        # Try to extract text safely
        try:
            return jsonify({"rewrittenText": response.text.strip()})
        except ValueError:
            # If response.text fails, it might be due to safety filters even with BLOCK_NONE
            # or reaching token limit before any part is returned
            if response.candidates:
                candidate = response.candidates[0]
                return jsonify({
                    "error": f"Model failed to generate valid text. Finish reason: {candidate.finish_reason}",
                    "rewrittenText": text # Fallback to original text
                })
            raise

    except Exception as e:
        logger.error("Gemini Rewrite Error", error=str(e))
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    from waitress import serve
    logger.info("SafeRail Production Server (Waitress) running", 
                health_check="http://localhost:3000/",
                analyze_endpoint="http://localhost:3000/analyze",
                evaluate_endpoint="http://localhost:3000/evaluate",
                rewrite_endpoint="http://localhost:3000/rewrite")
    serve(app, host="0.0.0.0", port=3000)
