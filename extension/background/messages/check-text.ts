import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { db } from "../../firebase-config"
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore/lite"
import localComplianceRules from "data-text:../../assets/compliance_rules.txt"

const storage = new Storage()
const MODEL_NAME = "saferail-llama"

const DEFAULT_OLLAMA = "http://localhost:11434/api/chat"
const DEFAULT_PRESIDIO = "https://llm.safeseal.xyz/analyze"

// --- ANALYTICS ---
// --- ANALYTICS ---
export const reportAnalytics = async (type: "scanned" | "warning" | "violation" | "confidential", rule?: string, email?: string) => {
    try {
        const ref = doc(db, "config", "analytics");
        const docSnap = await getDoc(ref);
        let data: any = { scanned: 0, warning: 0, violation: 0, confidential: 0, rule_triggers: {}, recent_incidents: [] };
        if (docSnap.exists()) {
            data = docSnap.data();
        }
        
        data[type] = (data[type] || 0) + 1;
        
        if (rule) {
            const cleanRule = rule.trim();
            if (cleanRule) {
                if (!data.rule_triggers) data.rule_triggers = {};
                data.rule_triggers[cleanRule] = (data.rule_triggers[cleanRule] || 0) + 1;
            }
        }

        if (type === "warning" || type === "violation") {
            const newIncident = {
                id: Math.random().toString(36).substring(2, 9),
                email: email || "sender@company.com",
                rule: rule || "Compliance policy trigger",
                severity: type === "violation" ? "violation" : "warning",
                date: new Date().toISOString()
            };
            
            if (!data.recent_incidents) {
                data.recent_incidents = [];
            }
            data.recent_incidents.unshift(newIncident);
            if (data.recent_incidents.length > 10) {
                data.recent_incidents = data.recent_incidents.slice(0, 10);
            }
        }
        
        await setDoc(ref, data, { merge: true });
    } catch (e) {
        console.error("Analytics Error:", e);
    }
}

// --- CONFIG FETCHING ---
export const getRules = async () => {
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

export const matchRule = async (ruleViolated: string | null | undefined): Promise<string | null> => {
  if (!ruleViolated) return null;
  try {
    const rulesText = await getRules();
    const configuredRules = rulesText
      .split("\n")
      .map((r: string) => r.replace(/^\s*\d+[.)-]?\s*/, "").trim())
      .filter(Boolean);

    const llmRule = ruleViolated.trim().replace(/^\s*\d+[.)-]?\s*/, "");
    
    // 1. Try exact match (case-insensitive)
    let matched = configuredRules.find((r: string) => r.toLowerCase() === llmRule.toLowerCase());
    if (matched) return matched;

    // 2. Try substring match (case-insensitive)
    matched = configuredRules.find((r: string) => 
      r.toLowerCase().includes(llmRule.toLowerCase()) || 
      llmRule.toLowerCase().includes(r.toLowerCase())
    );
    if (matched) return matched;

    // 3. Fallback to the llmRule itself
    return llmRule;
  } catch (e) {
    console.error("Error matching rule:", e);
    return ruleViolated;
  }
}

// --- HELPER: Call Presidio ---
export const checkConfidentiality = async (text: string) => {
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
  const { text, platform, senderEmail } = req.body

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
      const piiRule = await matchRule("No disguised personal data leakages, explicit and inexplicit.");
      await reportAnalytics("violation", piiRule || undefined, senderEmail);
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
          { role: "user", content: `EVALUATE: ${text}\n\nNote: If status is 'warn' or 'clear_warn', please specify the exact rule text that was violated in a "rule_violated" key in the JSON response.` }
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


    let matchedRule = null;
    if (result.status === "clear_warn" || result.status === "warn") {
      matchedRule = await matchRule(result.rule_violated);
    }

    if (result.status === "clear_warn") await reportAnalytics("violation", matchedRule || undefined, senderEmail);
    if (result.status === "warn") await reportAnalytics("warning", matchedRule || undefined, senderEmail);
    if (result.explanation == "") result.explanation = " ";

    res.send({
      status: result.status || "grey",
      explanation: result.explanation || "Error parsing response.",
      highlight: result.highlight || null,
      confidential: false
    })

  } catch (error) {
    let msg = error.message;
    if (msg === "LLM_SERVER_DOWN") msg = "LLM Server (Ollama) is down. Please ensure Ollama is running.";
    res.send({ status: "grey", explanation: `ERROR: ${msg}`, confidential: false })
  }
}

export default handler