import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import styleText from "data-text:./input_overlay.css"
import unsafeDomainsText from "data-text:../assets/unsafe_domains.txt"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

// --- CONFIGURATION ---
const UNSAFE_DOMAINS = unsafeDomainsText.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean)

// --- HELPERS ---
const isCurrentSiteUnsafe = (): string | null => {
  const currentHost = window.location.hostname.toLowerCase()
  return UNSAFE_DOMAINS.find(d => currentHost.includes(d)) || null
}

const getPlatformContext = (): string => {
  const host = window.location.hostname.toLowerCase()
  if (host.includes("mail.google.com")) return "Gmail"
  if (host.includes("outlook")) return "Outlook"
  if (host.includes("slack")) return "Slack"
  if (host.includes("teams")) return "Teams"
  if (host.includes("linkedin")) return "LinkedIn"
  return "General Web"
}

// Robust Text Field Detection
const isTextField = (element: HTMLElement | null): boolean => {
  if (!element) return false
  if (element.getAttribute("class") === "elementToProof") return true
  if (element.getAttribute("aria-label") === "Message body") return true 
  const hasEditableClass = (el: HTMLElement) => el.classList.contains("editable") || el.classList.contains("textarea")
  if (hasEditableClass(element) || (element.parentElement && hasEditableClass(element.parentElement))) return true
  if (element.tagName === "TEXTAREA") return true
  if (element.tagName === "INPUT") {
    const type = element.getAttribute("type")?.toLowerCase() || "text"
    return !["checkbox", "radio", "button", "submit", "hidden", "range", "color", "file"].includes(type)
  }
  return element.isContentEditable
}

const getTextFromElement = (element: HTMLElement): string => {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") return (element as HTMLInputElement).value || ""
  return element.innerText || ""
}

// --- MAIN COMPONENT ---

const ComplianceWidget = () => {
  const [status, setStatus] = useState<"grey" | "green" | "warn" | "clear_warn">("grey")
  const [explanation, setExplanation] = useState<string | null>("Ready to check.")
  
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConfidential, setIsConfidential] = useState(false)
  
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>("")
  const isHovering = useRef(false) 

  const checkCompliance = async (text: string) => {
    // 1. If empty, show "Ready" state but KEEP VISIBLE
    if (!text.trim()) {
      setStatus("grey")
      setExplanation("Waiting for input...")
      lastAnalyzedText.current = ""
      return
    }

    // 2. Security Check (Frontend)
    const unsafeMatch = isCurrentSiteUnsafe()
    let securityMsg = ""
    
    if (unsafeMatch) {
        securityMsg = `SECURITY ALERT: ${unsafeMatch} is prohibited.`
        setStatus("clear_warn")
        setExplanation(securityMsg)
        // We continue to allow LLM check in background if you want, 
        // or return here to block it.
    } 

    // 3. Skip LLM if text is duplicate (Optimization)
    if (text.trim() === lastAnalyzedText.current.trim()) return

    setLoading(true)
    setExplanation("Analyzing compliance...") // Immediate feedback

    const platform = getPlatformContext()

    // 4. Call Background
    const response = await sendToBackground({
      name: "check-text",
      body: { text, platform }
    })

    setLoading(false)

    // 5. Process Results
    let finalStatus = response.status
    let finalExplanation = response.explanation
    const confidentialDetected = response.confidential || false
    setIsConfidential(confidentialDetected)

    // Overrides
    if (unsafeMatch) {
        finalStatus = "clear_warn"
        finalExplanation = `${securityMsg}\n${response.explanation}`
    }
    
    if (confidentialDetected) {
        finalStatus = "clear_warn"
    }

    setStatus(finalStatus)
    setExplanation(finalExplanation)
    lastAnalyzedText.current = text
  }

  // --- LISTENERS ---
  
  // 1. INPUT LISTENER (Typing)
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement
      if (!isTextField(target)) return
      const text = getTextFromElement(target)
      
      if (typingTimer.current) clearTimeout(typingTimer.current)
      
      const lastChar = text.trim().slice(-1)
      const isSentenceEnd = [".", "!", "?", "\n"].includes(lastChar)
      const delay = isSentenceEnd ? 800 : 2000

      typingTimer.current = setTimeout(() => checkCompliance(text), delay) 
    }
    document.addEventListener("input", handleInput)
    return () => document.removeEventListener("input", handleInput)
  }, [])

  // 2. FOCUS LISTENER (Show/Hide) - THIS WAS MISSING
  useEffect(() => {
    const handleFocusChange = () => {
      setTimeout(() => {
        // If we are hovering the widget itself, don't hide it
        if (isHovering.current) return
        
        const activeEl = document.activeElement as HTMLElement
        
        if (isTextField(activeEl)) {
            // User clicked a text field -> Show Widget
            setIsVisible(true)
            const text = getTextFromElement(activeEl)
            if (!text.trim()) {
                setStatus("grey")
                setExplanation("Ready to check.")
            } else {
                // If field already has text, check it
                checkCompliance(text)
            }
        } else {
            // User clicked away -> Hide Widget
            setIsVisible(false)
        }
      }, 100)
    }

    document.addEventListener("focusin", handleFocusChange)
    document.addEventListener("focusout", handleFocusChange)
    return () => {
        document.removeEventListener("focusin", handleFocusChange)
        document.removeEventListener("focusout", handleFocusChange)
    }
  }, [])

  if (!isVisible) return null

  // --- RENDER HELPERS ---
  const getHeaderTitle = () => {
    if (loading) return "Checking..."
    if (status === "clear_warn") return isConfidential ? "Data Leak Detected" : "Violation Detected"
    if (status === "warn") return "Warning"
    if (status === "green") return "Compliant"
    return "Compliance"
  }

  const getIcon = () => {
    if (loading) return "⏳"
    if (status === "clear_warn") return "⛔"
    if (status === "warn") return "⚠️"
    if (status === "green") return "✅"
    return "🛡️"
  }

  return (
    <div 
      className={`compliance-widget ${status} ${loading ? "pulsing" : ""}`}
      onMouseEnter={() => { isHovering.current = true }}
      onMouseLeave={() => { isHovering.current = false }}
      // Prevent clicking the widget from causing a "blur" event on the input
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div className="widget-header">
        <span className="status-icon">{getIcon()}</span>
        <span>{getHeaderTitle()}</span>
      </div>
      
      <div className="widget-content">
        {explanation}
      </div>
    </div>
  )
}

export default ComplianceWidget