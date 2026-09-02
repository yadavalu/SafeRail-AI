import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { getBackendUrl } from "../../utils/api"

const storage = new Storage()

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const backendUrl = await getBackendUrl("/api/config/settings")

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
