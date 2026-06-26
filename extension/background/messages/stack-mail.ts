import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { checkConfidentiality, reportAnalytics } from "./check-text"

const storage = new Storage()
const MODEL_NAME = "saferail-llama"
const DEFAULT_OLLAMA = "http://localhost:11434/api/chat"

interface StackedMail {
  id: string
  text: string
  senderEmail: string
  platform: string
  timestamp: string
  status: "checking" | "approved" | "blocked" | "error"
  explanation: string
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text, senderEmail, platform } = req.body

  if (!text || text.length < 2) {
    res.send({ status: "green" })
    return
  }

  // 1. STACK MAIL IN BACKGROUND STORAGE
  const mailId = Math.random().toString(36).substring(2, 9)
  const stackedMails = await storage.get<StackedMail[]>("stackedMails") || []
  const newMail: StackedMail = {
    id: mailId,
    text,
    senderEmail: senderEmail || "employee@company.com",
    platform: platform || "General Web",
    timestamp: new Date().toISOString(),
    status: "checking",
    explanation: ""
  }
  
  stackedMails.push(newMail)
  await storage.set("stackedMails", stackedMails)
  console.log(`Stacked mail ${mailId} for checking. Current queue size: ${stackedMails.length}`)

  await reportAnalytics("scanned")

  let finalStatus: "green" | "warn" | "clear_warn" | "error" | "grey" = "green"
  let finalExplanation = ""
  let isConfidential = false

  try {
    // 2. RUN PRESIDIO CHECK
    try {
      const piiResults = await checkConfidentiality(text)
      if (piiResults.length > 0) {
        const foundTypes = [...new Set(piiResults.map((r: any) => r.type))].join(", ")
        await reportAnalytics("confidential")
        finalStatus = "clear_warn"
        isConfidential = true
        finalExplanation = `Sensitive data detected: ${foundTypes}. \n\nThis violates confidentiality protocols.`
      }
    } catch (error) {
      console.error("Presidio check error in background stack:", error)
      // Log error but proceed to LLM or handle gracefully
      throw new Error(`Presidio analysis failed: ${error.message}`)
    }

    // 3. RUN LLM CHECK (Only if not already flagged by Presidio)
    if (finalStatus === "green") {
      const modelType = await storage.get("modelType") || "gemini"
      const endpoint = await storage.get("ollamaEndpoint") || (modelType === "gemini" ? "https://llm.safeseal.xyz/gemini/chat" : DEFAULT_OLLAMA)
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelType === "llama" ? MODEL_NAME : "gemini-1.5-flash",
          format: modelType === "llama" ? "json" : undefined,
          stream: false,
          messages: [
            { role: "user", content: `EVALUATE: ${text}` }
          ],
        })
      }).catch(e => {
          throw new Error("LLM_SERVER_DOWN")
      })

      if (!response.ok) {
          let errorMsg = response.statusText
          try {
              const errorData = await response.json()
              if (errorData && errorData.error) errorMsg = errorData.error
          } catch (e) {}
          throw new Error(`LLM server error: ${errorMsg || response.status}`)
      }
      
      const data = await response.json()
      let content = data.message?.content || ""

      // Attempt to parse JSON result
      let result
      try {
          const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim()
          result = JSON.parse(cleanContent)
      } catch (e) {
          console.error("JSON Parse Error in background stack:", e, "Content:", content)
          throw new Error("Failed to parse compliance evaluation result.")
      }

      finalStatus = result.status || "grey"
      finalExplanation = result.explanation || ""
      
      if (finalStatus === "clear_warn") await reportAnalytics("violation")
      if (finalStatus === "warn") await reportAnalytics("warning")
    }

    // 4. PROCESS EVALUATION RESULT
    if (finalStatus === "warn" || finalStatus === "clear_warn") {
      // Compliance failed!
      console.log(`Mail ${mailId} failed compliance. Status: ${finalStatus}. Reason: ${finalExplanation}`)
      
      // Update stacked mail status to blocked
      const currentQueue = await storage.get<StackedMail[]>("stackedMails") || []
      const targetMail = currentQueue.find(m => m.id === mailId)
      if (targetMail) {
        targetMail.status = "blocked"
        targetMail.explanation = finalExplanation
        await storage.set("stackedMails", currentQueue)
      }

      // Notify the backend and send/simulate the blocked email
      const baseHost = await storage.get("baseHost") || "https://llm.safeseal.xyz"
      const cleanHost = baseHost.replace(/\/$/, "")
      const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1") || !cleanHost.startsWith("http")
      const backendUrl = isLocal ? `${cleanHost}:3000/send-blocked-email` : `${cleanHost}/send-blocked-email`

      try {
        const notifyRes = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_email: newMail.senderEmail,
            original_content: text,
            reason: finalExplanation
          })
        })
        const notifyData = await notifyRes.json()
        console.log("Backend notification response:", notifyData)
      } catch (notifyErr) {
        console.error("Failed to notify backend of blocked email:", notifyErr)
      }

      res.send({ status: "blocked", explanation: finalExplanation })
    } else {
      // Compliance passed!
      console.log(`Mail ${mailId} passed compliance checks.`)
      
      // Update stacked mail status to approved
      const currentQueue = await storage.get<StackedMail[]>("stackedMails") || []
      const targetMail = currentQueue.find(m => m.id === mailId)
      if (targetMail) {
        targetMail.status = "approved"
        await storage.set("stackedMails", currentQueue)
      }

      res.send({ status: "green" })
    }

  } catch (error) {
    let msg = error.message
    if (msg === "LLM_SERVER_DOWN") msg = "LLM Server (Ollama) is down. Please ensure Ollama is running."
    console.error(`Error during stacked check for ${mailId}:`, msg)
    
    const currentQueue = await storage.get<StackedMail[]>("stackedMails") || []
    const targetMail = currentQueue.find(m => m.id === mailId)
    if (targetMail) {
      targetMail.status = "error"
      targetMail.explanation = msg
      await storage.set("stackedMails", currentQueue)
    }

    res.send({ status: "error", explanation: `ERROR: ${msg}` })
  }
}

export default handler
