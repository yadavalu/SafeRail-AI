import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const MODEL_NAME = "saferail-llama"
const DEFAULT_OLLAMA = "http://localhost:11434/api/chat"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text } = req.body

  if (!text || text.length < 2) {
    res.send({ rewrittenText: text })
    return
  }

  try {
    const modelType = await storage.get("modelType") || "gemini"
    const endpoint = await storage.get("ollamaEndpoint") || (modelType === "gemini" ? "https://llm.safeseal.xyz/gemini/chat" : DEFAULT_OLLAMA)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelType === "llama" ? MODEL_NAME : "gemini-1.5-flash",
        stream: false,
        messages: [
          { role: "user", content: `REWRITE: ${text}` }
        ],
      })
    }).catch(e => {
        throw new Error("LLM_SERVER_DOWN");
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) errorMsg = errorData.error;
        } catch (e) {}
        throw new Error(`LLM server error: ${errorMsg || response.status}`);
    }
    
    const data = await response.json()
    
    if (!data.message || !data.message.content) {
        throw new Error("Invalid response from LLM server");
    }

    const rewrittenText = data.message.content.trim()

    res.send({
      rewrittenText: rewrittenText
    })

  } catch (error) {
    res.send({ error: error.message })
  }
}

export default handler
