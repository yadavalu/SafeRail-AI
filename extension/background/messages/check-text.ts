import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import localComplianceRules from "data-text:../../assets/compliance_rules.txt"
import { getBackendUrl } from "../../utils/api"

const storage = new Storage()
const MODEL_NAME = "saferail-llama"

const DEFAULT_OLLAMA = "http://localhost:11434/api/chat"
const DEFAULT_PRESIDIO = "https://llm.safeseal.xyz/analyze"

// --- ANALYTICS ---
// --- ANALYTICS ---
export const reportAnalytics = async (type: "scanned" | "warning" | "violation" | "confidential", rule?: string, email?: string) => {
  try {
    const backendUrl = await getBackendUrl("/api/analytics/report")

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, rule, email })
    })
    if (!response.ok) {
      console.error("Failed to report analytics to backend:", response.statusText)
    }
  } catch (e) {
    console.error("Analytics Error:", e);
  }
}

// --- CONFIG FETCHING ---
export const getRules = async () => {
  try {
    const backendUrl = await getBackendUrl("/api/config/settings")

    const response = await fetch(backendUrl)
    if (response.ok) {
      const data = await response.json()
      if (data.compliance_rules) {
        return data.compliance_rules
      }
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
  const { text, platform, senderEmail, recipientEmails } = req.body

  if (!text || text.length < 2) {
    res.send({ status: "grey", explanation: "", confidential: false })
    return
  }

  await reportAnalytics("scanned");

  // 1. PRESIDIO CHECK (TEMPORARILY DISABLED)
  try {
    const piiResults: any[] = []; // await checkConfidentiality(text)
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
  } catch (error: any) {
    res.send({ status: "grey", explanation: `ERROR: ${error.message}`, confidential: false });
    return;
  }

  // 2. LLM CHECK
  try {
    const modelType = await storage.get("modelType") || "gemini"
    const endpoint = await getBackendUrl("/api/analyze/llm")

    const user = await storage.get("adminUser") as any
    if (!user || !user.token) {
      throw new Error("User not authenticated. Please log in through the SafeRail dashboard.");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({
        provider: modelType,
        messages: [
          { role: "user", content: `EVALUATE: ${text}\n\nNote: If status is 'warn' or 'clear_warn', please specify the exact rule text that was violated in a "rule_violated" key in the JSON response.` }
        ]
      })
    }).catch(e => {
      throw new Error("LLM_SERVER_DOWN");
    });

    if (!response.ok) {
      let errorMsg = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) errorMsg = errorData.error;
      } catch (e) { }

      if (response.status === 401) {
        throw new Error("Unauthorized. Please log in through the SafeRail dashboard.");
      }
      throw new Error(`LLM server error: ${errorMsg || response.status}`);
    }

    const data = await response.json()
    console.log("LLM Raw Response:", data);

    let content = "";

    if (!data.message || !data.message.content) {
      throw new Error("Invalid response from SafeRail backend: message.content is missing");
    }
    content = data.message.content;

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