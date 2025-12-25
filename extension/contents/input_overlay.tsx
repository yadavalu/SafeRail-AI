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

// --- COMPONENT ---

const TrafficLightOverlay = () => {
  const [status, setStatus] = useState<"grey" | "green" | "orange" | "red">("grey")
  const [explanation, setExplanation] = useState<string | null>(null)
  
  // State for Confidentiality Flag (Triggers the '!' icon)
  const [isConfidential, setIsConfidential] = useState(false)

  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  
  const isHovering = useRef(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>("")

  const checkCompliance = async (text: string) => {
    if (!text.trim()) {
      setStatus("grey")
      setExplanation(null)
      setIsConfidential(false)
      lastAnalyzedText.current = ""
      return
    }

    // A. SECURITY CHECK (Unsafe Domain)
    // We keep this in frontend to warn user BEFORE sending data anywhere
    const unsafeMatch = isCurrentSiteUnsafe()
    let securityMsg = ""
    
    if (unsafeMatch) {
        securityMsg = `⚠️ SECURITY ALERT: Usage of ${unsafeMatch} is prohibited.`
        setStatus("red")
    }

    // B. OPTIMIZATION: Skip API if text hasn't changed
    if (text.trim() === lastAnalyzedText.current.trim()) return

    setLoading(true)
    if (!unsafeMatch) setShowPopup(false) 

    const platform = getPlatformContext()

    // C. BACKGROUND CHECK (Presidio + LLM)
    const response = await sendToBackground({
      name: "check-text",
      body: { text, platform }
    })

    setLoading(false)

    // D. MERGE RESULTS
    let finalStatus = response.status
    let finalExplanation = response.explanation
    
    // IMPORTANT: Read the flag from the background (Presidio result)
    const confidentialDetected = response.confidential || false
    setIsConfidential(confidentialDetected)

    // If Unsafe Domain, pre-pend that warning
    if (unsafeMatch) {
        finalStatus = "red"
        finalExplanation = `${securityMsg}\n\n${finalExplanation}`
    }
    
    // If Confidential, force status to Red (if not already)
    if (confidentialDetected) {
        finalStatus = "red"
    }

    setStatus(finalStatus)
    setExplanation(finalExplanation)
    lastAnalyzedText.current = text
  }

  const handleIconClick = () => {
    if (explanation && status !== "grey") {
      setShowPopup(!showPopup)
    }
  }

  // --- LISTENERS ---
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

  useEffect(() => {
    const handleFocusChange = () => {
      setTimeout(() => {
        if (isHovering.current) return
        const activeEl = document.activeElement as HTMLElement
        if (isTextField(activeEl)) {
            setIsVisible(true)
            checkCompliance(getTextFromElement(activeEl))
        } else {
            setIsVisible(false)
            setShowPopup(false)
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

  return (
    <div 
      className="housing-container"
      onMouseEnter={() => { isHovering.current = true }}
      onMouseLeave={() => { isHovering.current = false }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {showPopup && explanation && (
        <div className="explanation-bubble" style={{ whiteSpace: "pre-wrap" }}>
           {explanation}
        </div>
      )}

      {/* LIGHT COMPONENT */}
      <div 
        className={`indicator-light ${status} ${loading ? "pulsing" : ""}`}
        onClick={handleIconClick}
        title={explanation ? "Click for explanation" : ""}
      >
        {/* Priority Logic: Loading > Confidential (!) > Status Color */}
        
        {/* 1. Show '!' if Presidio detected something (and not loading) */}
        {!loading && isConfidential && (
            <span className="icon" style={{ fontSize: "24px", fontWeight: "900" }}>!</span>
        )}
        
        {/* 2. Show '?' if Grey/Idle */}
        {!loading && !isConfidential && status === "grey" && (
            <span className="icon">?</span>
        )}
      </div>
    </div>
  )
}

export default TrafficLightOverlay