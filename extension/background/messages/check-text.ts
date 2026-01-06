import type { PlasmoMessaging } from "@plasmohq/messaging"
import complianceRules from "data-text:../../assets/compliance_rules.txt"

const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate"
const PRESIDIO_ENDPOINT = "http://localhost:3000/analyze"
const MODEL_NAME = "llama3.2:3b"

// --- HELPER: Call Presidio ---
const checkConfidentiality = async (text: string) => {
  try {
    const response = await fetch(PRESIDIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })

    if (!response.ok) return [] // Fail safe (assume no PII if server down, or handle error)
    
    return await response.json() // Returns array of found entities
  } catch (error) {
    console.error("Presidio Connection Error:", error)
    return []
  }
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text, platform } = req.body

  if (!text || text.length < 2) {
    res.send({ status: "grey", explanation: "", confidential: false })
    return
  }

  // -------------------------------------------------------
  // 1. PRESIDIO CHECK (Fast & Deterministic)
  // -------------------------------------------------------
  const piiResults = await checkConfidentiality(text)

  console.log("Presidio Results:", piiResults)

  if (piiResults.length > 0) {
    // Map the found entities to a readable string (e.g. "PHONE_NUMBER, CREDIT_CARD")
    const foundTypes = [...new Set(piiResults.map((r: any) => r.type))].join(", ")
    
    res.send({
      status: "clear_warn",
      confidential: true,
      explanation: `Sensitive data detected: ${foundTypes}. \n\nThis violates confidentiality protocols.`
    })
    return // STOP HERE. Do not call LLM.
  }

  // -------------------------------------------------------
  // 2. LLM CHECK (Tone & Compliance)
  // -------------------------------------------------------
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        format: "json",
        stream: false,
        options: { temperature: 0 }, 
        
        // Note: We removed the "confidentiality" instruction from the prompt
        // because Presidio handles it better.
        prompt: `
          Evaluate INPUT_TEXT against RULESET thoroughly.

          Output EXACTLY:
          <GREEN|WARN|CLEAR_WARN>|<RULE_ID|->|<START..END|->

          - CLEAR_WARN only for direct rule violations with a supporting span.
          - WARN only if a span indicates a possible rule violation.
          - Otherwise GREEN.
          - Do NOT default to WARN.

          RULESET:
          ${complianceRules}

          INPUT_TEXT:
          ${text}
          
          Respond with JSON:
          {
            "status": "green" | "warn" | "clear_warn",
            "explanation": "Short reason for the rating."
          }
        `
      })
    })

    if (!response.ok) throw new Error(`Local server error: ${response.statusText}`)

    const data = await response.json()
    const result = JSON.parse(data.response)

    res.send({
      status: result.status || "grey",
      explanation: result.explanation || "Error parsing response.",
      confidential: false // Presidio already cleared this
    })

  } catch (error) {
    console.error("LLM Analysis Error:", error)
    res.send({ status: "grey", explanation: "Compliance check failed.", confidential: false })
  }
}

export default handler