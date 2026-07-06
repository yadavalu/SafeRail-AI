import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const baseHost = await storage.get("baseHost") || "https://llm.safeseal.xyz"
    const cleanHost = baseHost.replace(/\/$/, "")
    const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1") || !cleanHost.startsWith("http")
    const backendUrl = isLocal ? `${cleanHost}:3000/api/config/settings` : `${cleanHost}/api/config/settings`

    const response = await fetch(backendUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch settings from backend: ${response.statusText}`)
    }
    const data = await response.json()
    res.send({ settings: data })
  } catch (error) {
    console.error("Error in get-settings handler:", error)
    res.send({ error: error.message })
  }
}

export default handler
