import type { PlasmoMessaging } from "@plasmohq/messaging"
import complianceRules from "data-text:../../assets/compliance_rules.txt"

// --- CONFIGURATION ---
const GEMINI_MODEL = "gemini-2.5-flash" 
const API_KEY = process.env.PLASMO_PUBLIC_GEMINI_KEY
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`

// Keep Presidio Local (Port 3000)
const PRESIDIO_ENDPOINT = "http://localhost:3000/analyze"

// --- HELPER: Call Presidio ---
const checkConfidentiality = async (text: string) => {
  try {
    const response = await fetch(PRESIDIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })

    if (!response.ok) return [] 
    return await response.json() 
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
  // 1. PRESIDIO CHECK (Local Python Server)
  // -------------------------------------------------------
  const piiResults = await checkConfidentiality(text)

  if (piiResults.length > 0) {
    const foundTypes = [...new Set(piiResults.map((r: any) => r.type))].join(", ")
    
    res.send({
      status: "clear_warn",
      confidential: true,
      explanation: `Sensitive data detected: ${foundTypes}. \n\nThis violates confidentiality protocols.`
    })
    return 
  }

  // -------------------------------------------------------
  // 2. GEMINI CHECK (Cloud API)
  // -------------------------------------------------------
  try {
    const prompt = `
      You are a strict Compliance Officer.
      Evaluate the INPUT_TEXT against the RULESET.

      RULESET:
      ${complianceRules}

      INPUT_TEXT:
      "${text}"
      
      INSTRUCTIONS:
      1. If the text violates a rule (especially financial promises/guarantees), status is "clear_warn".
      2. If the text is ambiguous, risky, or has poor tone, status is "warn".
      3. Otherwise, status is "green".
      
      Respond with this JSON structure only:
      {
        "status": "green" | "warn" | "clear_warn",
        "explanation": "Very short reason citing the specific rule."
      }
    `

    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: "application/json", // Enforces JSON
          temperature: 0
        }
      })
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || response.statusText)
    }

    const data = await response.json()
    
    // Parse Gemini Response
    // Structure: candidates[0].content.parts[0].text
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
    const result = JSON.parse(rawText)

    res.send({
      status: result.status || "grey",
      explanation: result.explanation || "Error parsing response.",
      confidential: false
    })

  } catch (error) {
    console.error("Gemini Analysis Error:", error)
    res.send({ 
      status: "grey", 
      explanation: "Compliance check failed (API Error).", 
      confidential: false 
    })
  }
}

export default handler