import os
import subprocess
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from presidio_analyzer import AnalyzerEngine

app = Flask(__name__)
CORS(app) 

# Initialize the engine (loads the NLP model once at startup)
analyzer = AnalyzerEngine()

def start_ollama():
    """
    Sets the required environment variable and starts Ollama 
    in a separate subprocess.
    """
    try:
        # 1. Set the Environment Variable (Cross-platform)
        # This applies to this process and any child process (like Ollama)
        os.environ["OLLAMA_ORIGINS"] = "chrome-extension://*"
        
        print("🦙 Launching Ollama with OLLAMA_ORIGINS='chrome-extension://*'...")

        # 2. Start 'ollama serve' as a non-blocking subprocess
        # logic: Popen starts the process and lets Python continue immediately
        subprocess.Popen(
            ["ollama", "serve"], 
            env=os.environ,  # Pass the modified environment
            shell=False      # False is safer and usually works if ollama is in PATH
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
    app.run(port=3000)