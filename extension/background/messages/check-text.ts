import type { PlasmoMessaging } from "@plasmohq/messaging"

// Configuration for your local server
// If using LM Studio, change to: "http://localhost:1234/v1/chat/completions"
const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate"
const MODEL_NAME = "llama3.2:3b" // or "llama3.1", "mistral", etc.

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const text = req.body.text

  if (!text || text.length < 2) {
    res.send({ status: "grey", explanation: "" })
    return
  }

  try {
    // We use standard fetch. No SDK needed for local API.
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        // "format: json" is an Ollama specific feature that enforces JSON syntax
        format: "json", 
        stream: false, // Important! We don't want a stream of data, just the final result
        prompt: `
          Analyze the professionalism of this text: "${text}"
          
          Respond with a JSON object containing exactly two keys:
          1. "status": "green" (professional), "orange" (casual), or "red" (rude).
          2. "explanation": A very short sentence explaining why.
        `
      })
    })

    if (!response.ok) {
      throw new Error(`Local server error: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Ollama returns the result in a field called 'response'
    // Since we requested format: "json", we parse that string object
    const result = JSON.parse(data.response)

    console.log("Local Llama Result:", result)

    res.send({
      status: result.status || "grey",
      explanation: result.explanation || "No explanation provided."
    })

  } catch (error) {
    console.error("Local Llama Error:", error)
    
    // Helpful error for debugging connection issues
    let errorMsg = "Could not connect to Localhost."
    if (error.message.includes("Failed to fetch")) {
      errorMsg = "Is Ollama running? (try 'ollama serve' in terminal)"
    }

    res.send({ status: "grey", explanation: errorMsg })
  }
}

export default handler