import os
import subprocess
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from presidio_analyzer import AnalyzerEngine

app = Flask(__name__)
CORS(app)

# Initialize the engine
analyzer = AnalyzerEngine()

# --- CONFIGURATION ---
# 1. IGNORE these entities. They create too much noise.
# DATE_TIME: Flags "Monday", "Weekly", "Tomorrow" (Not confidential)
# NRP: Flags nationalities/religions (Not usually a leak)
ENTITIES_TO_IGNORE = ["DATE_TIME", "PERSON", "NRP"]

# 2. CONFIDENCE THRESHOLD
# Only report if the AI is 75% sure or higher.
# 0.4 was too low and caught words like "Team" as People.
MIN_SCORE = 0.75

def start_ollama():
    """Sets environment and starts Ollama."""
    try:
        os.environ["OLLAMA_ORIGINS"] = "chrome-extension://*"
        print("🦙 Launching Ollama with OLLAMA_ORIGINS='chrome-extension://*'...")
        subprocess.Popen(["ollama", "serve"], env=os.environ, shell=False)
    except Exception as e:
        print(f"❌ Failed to start Ollama: {e}")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    text = data.get("text", "")
    
    if not text:
        return jsonify([])

    # Run Analysis
    results = analyzer.analyze(text=text, language='en')
    
    response = []
    for r in results:
        # FILTERING LOGIC
        if r.entity_type in ENTITIES_TO_IGNORE:
            continue

        if r.score < MIN_SCORE:
            continue

        response.append({
            "type": r.entity_type,
            "start": r.start,
            "end": r.end,
            "score": r.score
        })
            
    return jsonify(response)
"""
if __name__ == "__main__":
    #ollama_thread = threading.Thread(target=start_ollama)
    #ollama_thread.start()

    print(f"🛡️ Presidio Server running. Threshold: {MIN_SCORE}, Ignoring: {ENTITIES_TO_IGNORE}")
    app.run(port=3000)
"""