import type { PlasmoMessaging } from "@plasmohq/messaging"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.PLASMO_PUBLIC_GEMINI_KEY!)

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const text = req.body.text

  if (!text || text.length < 2) {
    res.send({ status: "grey", explanation: "" })
    return
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // We ask for a strict JSON response
    const prompt = `
      Analyze the professionalism of the following text: "${text}"
      
      Return a pure JSON object (no markdown formatting) with exactly two keys:
      1. "status": Must be exactly "green" (professional), "orange" (casual), or "red" (rude/unprofessional).
      2. "explanation": A 1-sentence reason why you gave that rating.
    `

    const result = await model.generateContent(prompt)
    let responseText = result.response.text()

    // Clean up potential markdown code blocks (Gemini sometimes adds ```json ... ```)
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()

    const data = JSON.parse(responseText)

    res.send({
      status: data.status || "grey",
      explanation: data.explanation || "No explanation provided."
    })

  } catch (error) {
    console.error("Gemini Error:", error)
    // Fallback if JSON parsing fails
    res.send({ status: "grey", explanation: "Error analyzing text." })
  }
}

export default handler