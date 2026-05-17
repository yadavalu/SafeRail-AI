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
    const endpoint = await storage.get("ollamaEndpoint") || DEFAULT_OLLAMA
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        stream: false,
        messages: [
          { role: "user", content: `REWRITE: ${text}` }
        ],
      })
    }).catch(e => {
        throw new Error("LLM_SERVER_DOWN");
    });

    if (!response.ok) {
        throw new Error(`LLM server error: ${response.statusText}`);
    }
    
    const data = await response.json()
    const rewrittenText = data.message.content.trim()

    res.send({
      rewrittenText: rewrittenText
    })

  } catch (error) {
    res.send({ error: error.message })
  }
}

export default handler
