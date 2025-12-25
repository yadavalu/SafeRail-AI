from flask import Flask, request, jsonify
from flask_cors import CORS
from presidio_analyzer import AnalyzerEngine

app = Flask(__name__)
CORS(app) # Allow Chrome Extension to talk to us

# Initialize the engine (loads the NLP model once at startup)
analyzer = AnalyzerEngine()

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    text = data.get("text", "")
    
    if not text:
        return jsonify([])

    # Analyze text for PII entities
    # You can configure 'entities' list to be specific or leave empty for all
    results = analyzer.analyze(text=text, language='en')
    
    # Convert Presidio objects to simple JSON
    response = []
    for r in results:
        # Filter: Only care if confidence is > 0.4 (40%)
        if r.score > 0.4:
            response.append({
                "type": r.entity_type,
                "start": r.start,
                "end": r.end,
                "score": r.score
            })
            
    return jsonify(response)

if __name__ == "__main__":
    print("🛡️ Presidio PII Server running on http://localhost:3000")
    app.run(port=3000)
