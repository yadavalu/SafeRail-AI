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
from firebase_admin import credentials, firestore, auth as admin_auth
import requests

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyCjpAamIyD0g0_daGWX9SiB_aEa_yP1ExE")

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

def get_authenticated_user():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    id_token = auth_header.split("Bearer ")[1]
    try:
        decoded_token = admin_auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error("Token verification failed", error=str(e))
        return None

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
- If input starts with 'EVALUATE:', evaluate the INPUT_TEXT against the RULESET. Respond ONLY with JSON: {{"status": "green" | "warn" | "clear_warn", "explanation": "Short reason.", "highlight": "exact problematic substring from INPUT_TEXT or null", "rule_violated": "exact text of the rule from the RULESET that was violated (without the leading number), or null"}}
- If input starts with 'REWRITE:', rewrite the INPUT_TEXT to be fully compliant with the RULESET. Return ONLY the rewritten text, no preamble or explanation.

## INSTRUCTIONS FOR EVALUATE:
1. Analyze the INPUT_TEXT line-by-line.
2. If a user deletes a violating line, do NOT mention it in the new analysis.
3. Any violation of the RULESET by the text should be flagged based on intensity of the violation as "warn" or "clear_warn". Otherwise "green" if no violations found.
4. In the "highlight" field, extract the exact offending substring from the INPUT_TEXT exactly as it appears (even if misspelled, grammatically incorrect, or with incorrect punctuation). Do not correct or alter the text in any way. If status is green, "highlight" must be null.
5. In the "rule_violated" field, extract the exact text of the rule from the RULESET that was violated (without the leading number). If status is green, "rule_violated" must be null.

## INSTRUCTIONS FOR REWRITE:
1. Identify all violations in the input.
2. The rewritten text should be compliant with the RULESET.
3. Provide ONLY the final rewritten text. DO NOT provide explanations, preamble, or any conversational filler."""

def is_recipient_external(sender_email, recipient_emails):
    if not sender_email or "@" not in sender_email:
        return False
    try:
        sender_domain = sender_email.split("@")[1].strip().lower()
        for rec in recipient_emails:
            if "@" in rec:
                rec_domain = rec.split("@")[1].strip().lower()
                if rec_domain != sender_domain:
                    return True
    except Exception:
        pass
    return False

def get_compliance_rules_for_context(sender_email=None, recipient_emails=None):
    if not db:
        return get_compliance_rules()
    try:
        sender_role = None
        if sender_email:
            user_doc = db.collection("users").document(sender_email.lower()).get()
            if user_doc.exists:
                sender_role = user_doc.to_dict().get("role")

        rules_ref = db.collection("rules").stream()
        filtered_rules = []
        is_external = is_recipient_external(sender_email, recipient_emails) if (sender_email and recipient_emails) else False
        
        for r_doc in rules_ref:
            r = r_doc.to_dict()
            if r.get("status") == "inactive":
                continue
            
            # Check externalOnly
            if r.get("externalOnly", False) and not is_external:
                continue
                
            # Check email
            applied_emails = r.get("appliedTo", [])
            if applied_emails and isinstance(applied_emails, str) and applied_emails == "all":
                pass
            elif applied_emails and "all" not in [em.lower() for em in applied_emails]:
                if not sender_email or sender_email.lower() not in [em.lower() for em in applied_emails]:
                    continue
            
            title = r.get("title", "").strip()
            rule_text = r.get("rule", "").strip()
            if title and rule_text:
                filtered_rules.append(f"{title}: {rule_text}")
            elif rule_text:
                filtered_rules.append(rule_text)
                
        if filtered_rules:
            return "\n".join([f"{i}. {fr}" for i, fr in enumerate(filtered_rules, 1)])
        
    except Exception as e:
        logger.error("Failed to filter compliance rules", error=str(e))
    return get_compliance_rules()

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
    
    sender_email = data.get("senderEmail")
    recipient_emails = data.get("recipientEmails", [])
    
    try:
        rules_content = get_compliance_rules_for_context(sender_email, recipient_emails)
        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=get_system_prompt(rules_content))
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

@app.route("/send-blocked-email", methods=["POST"])
def send_blocked_email():
    data = request.json or {}
    sender_email = data.get("sender_email", "employee@company.com")
    original_content = data.get("original_content", "")
    reason = data.get("reason", "Violation of compliance rules.")
    
    subject = "COMPLIANCE ALERT: Outgoing Email Blocked"
    body = f"""Dear Sender,

Your outgoing email has been blocked because it failed our compliance checks.

Reason for block:
--------------------------------------------------
{reason}
--------------------------------------------------

Original Email Content:
--------------------------------------------------
{original_content}
--------------------------------------------------

This is an automated security notification from SafeRail AI. Please revise your email content to comply with our compliance policies.

Best regards,
SafeRail AI Compliance Team"""

    # 1. Log the notification
    logger.warning("Email Blocked. Notification sent to sender.", sender=sender_email, reason=reason)
    
    # 2. Save the blocked email to a local file in the workspace for user verification/auditing
    blocked_dir = os.path.join(os.path.dirname(__file__), "..", "blocked_emails")
    os.makedirs(blocked_dir, exist_ok=True)
    filename = f"blocked_{int(time.time())}_{sender_email.replace('@', '_').replace('.', '_')}.txt"
    filepath = os.path.join(blocked_dir, filename)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"To: {sender_email}\n")
            f.write(f"Subject: {subject}\n")
            f.write(f"Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*50 + "\n")
            f.write(body)
        logger.info("Blocked email saved to disk for verification", path=filepath)
    except Exception as e:
        logger.error("Failed to save blocked email to disk", error=str(e))

    # 3. Attempt to send real email using SMTP if configured
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    
    sent_via_smtp = False
    smtp_error = None
    if smtp_host and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = sender_email
            
            server = smtplib.SMTP(smtp_host, int(smtp_port))
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, [sender_email], msg.as_string())
            server.quit()
            sent_via_smtp = True
            logger.info("Notification email sent successfully via SMTP", to=sender_email)
        except Exception as e:
            smtp_error = str(e)
            logger.error("Failed to send email via SMTP", error=smtp_error)
            
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    try:
        res = requests.post(url, json=payload)
        res_data = res.json()
        if res.status_code != 200:
            error_msg = res_data.get("error", {}).get("message", "Authentication failed")
            return jsonify({"error": error_msg}), res.status_code
            
        user_info = {"isAdmin": False, "role": "Employee", "name": email.split("@")[0], "email": email}
        if db:
            user_doc = db.collection("users").document(email.lower()).get()
            if user_doc.exists:
                user_info.update(user_doc.to_dict())
            else:
                if email.lower() == "admin@saferail.com":
                    user_info["isAdmin"] = True
                db.collection("users").document(email.lower()).set(user_info)

        res_data["user"] = user_info
        return jsonify(res_data)
    except Exception as e:
        logger.error("Auth REST API error", error=str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    user = get_authenticated_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    if not db:
        return jsonify({"error": "Firebase database not initialized"}), 500

    try:
        email = user.get("email", "").lower()
        user_doc = db.collection("users").document(email).get()
        is_admin = False
        if user_doc.exists:
            is_admin = user_doc.to_dict().get("isAdmin", False)
            
        analytics_data = {
            "scanned": 0,
            "warning": 0,
            "violation": 0,
            "confidential": 0,
            "recent_incidents": []
        }

        if is_admin:
            doc_ref = db.collection("config").document("analytics")
            doc_snap = doc_ref.get()
            if doc_snap.exists:
                analytics_data.update(doc_snap.to_dict())
                
            incidents_ref = db.collection("incidents").stream()
            recent_incidents = [doc.to_dict() for doc in incidents_ref]
            recent_incidents.sort(key=lambda x: x.get("date", ""), reverse=True)
            analytics_data["recent_incidents"] = recent_incidents[:10]
        else:
            incidents_ref = db.collection("incidents").where("email", "==", email).stream()
            incidents = [doc.to_dict() for doc in incidents_ref]
            incidents.sort(key=lambda x: x.get("date", ""), reverse=True)
            
            for inc in incidents:
                severity = inc.get("severity")
                if severity == "warning": analytics_data["warning"] += 1
                elif severity == "violation": analytics_data["violation"] += 1
                
            analytics_data["recent_incidents"] = incidents[:10]
            
        return jsonify(analytics_data)
    except Exception as e:
        logger.error("Failed to load analytics", error=str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/config/settings", methods=["GET"])
def get_settings():
    if not db:
        rules_path = os.path.join("extension", "assets", "compliance_rules.txt")
        domains_path = os.path.join("extension", "assets", "unsafe_domains.txt")
        rules = ""
        domains = ""
        if os.path.exists(rules_path):
            with open(rules_path, "r") as f:
                rules = f.read().strip()
        if os.path.exists(domains_path):
            with open(domains_path, "r") as f:
                domains = f.read().strip()
        return jsonify({
            "compliance_rules": rules,
            "unsafe_domains": domains,
            "denied_entities": [],
            "rules_list": [],
            "employees": []
        })

    try:
        settings_data = {"unsafe_domains": "", "compliance_rules": "", "denied_entities": []}
        doc_snap = db.collection("config").document("settings").get()
        if doc_snap.exists:
            settings_data.update(doc_snap.to_dict())
            
        rules_list = []
        for doc in db.collection("rules").stream():
            rule = doc.to_dict()
            rule["id"] = doc.id
            rules_list.append(rule)
        settings_data["rules_list"] = rules_list
        
        employees = []
        for doc in db.collection("users").stream():
            user_data = doc.to_dict()
            user_data["email"] = doc.id
            employees.append(user_data)
        settings_data["employees"] = employees
        
        return jsonify(settings_data)
    except Exception as e:
        logger.error("Failed to load settings", error=str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/config/settings", methods=["POST"])
def save_settings():
    user = get_authenticated_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if not db:
        return jsonify({"error": "Firebase database not initialized"}), 500
        
    email = user.get("email", "").lower()
    user_doc = db.collection("users").document(email).get()
    if not user_doc.exists or not user_doc.to_dict().get("isAdmin"):
         return jsonify({"error": "Forbidden: Admins only"}), 403

    data = request.json or {}
    unsafe_domains = data.get("unsafe_domains")
    compliance_rules = data.get("compliance_rules")
    denied_entities = data.get("denied_entities")
    rules_list = data.get("rules_list")
    employees = data.get("employees")

    update_payload = {}
    if unsafe_domains is not None:
        update_payload["unsafe_domains"] = unsafe_domains
    if compliance_rules is not None:
        update_payload["compliance_rules"] = compliance_rules
    if denied_entities is not None:
        update_payload["denied_entities"] = denied_entities
        
    try:
        if update_payload:
            db.collection("config").document("settings").set(update_payload, merge=True)
            
        if rules_list is not None:
            # Delete old rules not in the new list
            new_rule_ids = [r.get("id") for r in rules_list if r.get("id")]
            for doc in db.collection("rules").stream():
                if doc.id not in new_rule_ids:
                    db.collection("rules").document(doc.id).delete()
                    
            for rule in rules_list:
                rule_id = rule.get("id") or str(int(time.time() * 1000))
                rule["id"] = rule_id
                db.collection("rules").document(rule_id).set(rule)
                
            formatted_rules = []
            for i, r in enumerate(rules_list, 1):
                title = r.get("title", "").strip()
                rule_text = r.get("rule", "").strip()
                if title and rule_text:
                    formatted_rules.append(f"{i}. {title}: {rule_text}")
                elif rule_text:
                    formatted_rules.append(f"{i}. {rule_text}")
            db.collection("config").document("settings").set({"compliance_rules": "\n".join(formatted_rules)}, merge=True)
                
        if employees is not None:
            for emp in employees:
                emp_email = emp.get("email", "").lower()
                if emp_email:
                    emp["isAdmin"] = False # ensure they are not admin
                    db.collection("users").document(emp_email).set(emp, merge=True)

        return jsonify({"status": "success", "message": "Settings updated"})
    except Exception as e:
        logger.error("Failed to save settings", error=str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/analytics/report", methods=["POST"])
def report_analytics_endpoint():
    if not db:
        return jsonify({"error": "Firebase database not initialized"}), 500

    data = request.json or {}
    report_type = data.get("type")
    rule = data.get("rule")
    email = data.get("email")

    if report_type not in ["scanned", "warning", "violation", "confidential"]:
        return jsonify({"error": "Invalid report type"}), 400

    try:
        doc_ref = db.collection("config").document("analytics")
        doc_snap = doc_ref.get()
        
        analytics_data = {
            "scanned": 0,
            "warning": 0,
            "violation": 0,
            "confidential": 0,
            "rule_triggers": {},
            "recent_incidents": []
        }
        
        if doc_snap.exists:
            analytics_data.update(doc_snap.to_dict())

        analytics_data[report_type] = analytics_data.get(report_type, 0) + 1

        if rule:
            clean_rule = rule.strip()
            if clean_rule:
                rule_triggers = analytics_data.setdefault("rule_triggers", {})
                rule_triggers[clean_rule] = rule_triggers.get(clean_rule, 0) + 1

        if report_type in ["warning", "violation"]:
            incident_id = str(int(time.time() * 1000))
            new_incident = {
                "id": incident_id,
                "email": email or "unknown@company.com",
                "rule": rule or "Compliance policy trigger",
                "severity": report_type,
                "date": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
            }
            db.collection("incidents").document(incident_id).set(new_incident)
            
            recent_incidents = analytics_data.setdefault("recent_incidents", [])
            recent_incidents.insert(0, new_incident)
            if len(recent_incidents) > 10:
                analytics_data["recent_incidents"] = recent_incidents[:10]

        doc_ref.set(analytics_data, merge=True)
        return jsonify({"status": "success", "message": "Analytics reported"})
    except Exception as e:
        logger.error("Failed to report analytics", error=str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    threading.Thread(target=start_ollama).start()
    from waitress import serve
    logger.info("SafeRail Production Server running", health_check="http://localhost:3000/")
    serve(app, host="0.0.0.0", port=3000)

