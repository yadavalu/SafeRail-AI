import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()
const DEFAULT_LLM_REWRITE = "https://llm.safeseal.xyz/rewrite"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text } = req.body

  if (!text || text.length < 2) {
    res.send({ rewrittenText: text })
    return
  }

  try {
    const endpoint = await storage.get("llmRewriteEndpoint") || DEFAULT_LLM_REWRITE
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }).catch(e => {
        throw new Error("LLM_SERVER_DOWN");
    });

    if (!response.ok) {
        throw new Error(`LLM server error: ${response.statusText}`);
    }
    
    const data = await response.json()
    const rewrittenText = data.rewrittenText || ""

    res.send({
      rewrittenText: rewrittenText
    })

  } catch (error) {
    res.send({ error: error.message })
  }
}

export default handler
