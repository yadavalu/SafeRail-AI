import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { db } from "../../firebase-config"
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore/lite"
import localComplianceRules from "data-text:../../assets/compliance_rules.txt"

const storage = new Storage()
const MODEL_NAME = "saferail-llama"

const DEFAULT_OLLAMA = "http://localhost:11434/api/chat"
const DEFAULT_PRESIDIO = "http://localhost:3000/analyze"

// --- ANALYTICS ---
const reportAnalytics = async (type: "scanned" | "warning" | "violation" | "confidential") => {
    try {
        const ref = doc(db, "config", "analytics");
        // Note: updateDoc in Lite works similarly but is more robust for one-offs
        await updateDoc(ref, {
            [type]: increment(1)
        }).catch(async (err) => {
            if (err.code === "not-found" || err.message?.includes("no entity")) {
                await setDoc(ref, { scanned: 0, warning: 0, violation: 0, confidential: 0 }, { merge: true });
                await updateDoc(ref, { [type]: increment(1) });
            }
        });
    } catch (e) {
        console.error("Analytics Error:", e);
    }
}

// --- CONFIG FETCHING ---
const getRules = async () => {
    try {
        const d = await getDoc(doc(db, "config", "settings"));
        if (d.exists() && d.data().compliance_rules) {
            return d.data().compliance_rules;
        }
    } catch (e) {
        console.error("Rules Fetch Error:", e);
    }
    return localComplianceRules;
}

// --- HELPER: Call Presidio ---
const checkConfidentiality = async (text: string) => {
  try {
    const endpoint = await storage.get("presidioEndpoint") || DEFAULT_PRESIDIO
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }).catch(e => {
        throw new Error("PRESIDIO_DOWN");
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`PRESIDIO_ERROR: 404 (Not Found). Please ensure your endpoint includes '/analyze' (e.g., ${DEFAULT_PRESIDIO}).`);
        }
        throw new Error(`PRESIDIO_ERROR: ${response.status}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error(`PRESIDIO_ERROR: Invalid response format from ${endpoint}. Expected an array.`);
    }
    return data;
  } catch (error) {
    if (error.message === "PRESIDIO_DOWN") {
        throw new Error("Presidio (PII) server is down. Please start the backend.");
    }
    throw error;
  }
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text, platform } = req.body

  if (!text || text.length < 2) {
    res.send({ status: "grey", explanation: "", confidential: false })
    return
  }

  await reportAnalytics("scanned");

  // 1. PRESIDIO CHECK
  try {
    const piiResults = await checkConfidentiality(text)
    if (piiResults.length > 0) {
      const foundTypes = [...new Set(piiResults.map((r: any) => r.type))].join(", ")
      await reportAnalytics("confidential");
      res.send({
        status: "clear_warn",
        confidential: true,
        explanation: `Sensitive data detected: ${foundTypes}. \n\nThis violates confidentiality protocols.`
      })
      return 
    }
  } catch (error) {
    res.send({ status: "grey", explanation: `ERROR: ${error.message}`, confidential: false });
    return;
  }

  // 2. LLM CHECK
  try {
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
        throw new Error("LLM_SERVER_DOWN");
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) errorMsg = errorData.error;
        } catch (e) {}

        if (response.status === 404) {
            throw new Error(`LLM Model not found: ${MODEL_NAME}. Please run 'ollama pull ${MODEL_NAME}'`);
        }
        if (response.status === 403) {
            throw new Error(`LLM server error: Forbidden (CORS). Please ensure server is started with proper origins. Try restarting the backend server.py.`);
        }
        throw new Error(`LLM server error: ${errorMsg || response.status}`);
    }
    
    const data = await response.json()
    console.log("LLM Raw Response:", data);
    
    let content = "";

    if (modelType === "gemini") {
        if (!data.message || !data.message.content) {
            throw new Error("Invalid response from Gemini server");
        }
        content = data.message.content;
    } else {
        if (!data.message || !data.message.content) {
            throw new Error("Invalid response from Ollama: message.content is missing");
        }
        content = data.message.content;
    }

    // Attempt to parse JSON result
    let result;
    try {
        // Clean markdown code blocks if present
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        result = JSON.parse(cleanContent);
    } catch (e) {
        console.error("JSON Parse Error:", e, "Content:", content);
        throw new Error("Failed to parse compliance evaluation result.");
    }
    
    console.log("Parsed LLM Result:", result);


    if (result.status === "clear_warn") await reportAnalytics("violation");
    if (result.status === "warn") await reportAnalytics("warning");
    if (result.explanation == "") result.explanation = " ";

    res.send({
      status: result.status || "grey",
      explanation: result.explanation || "Error parsing response.",
      confidential: false
    })

  } catch (error) {
    let msg = error.message;
    if (msg === "LLM_SERVER_DOWN") msg = "LLM Server (Ollama) is down. Please ensure Ollama is running.";
    res.send({ status: "grey", explanation: `ERROR: ${msg}`, confidential: false })
  }
}

export default handler