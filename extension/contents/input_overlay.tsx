import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import styleText from "data-text:./input_overlay.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

// ---------------------------------------------------------
// Helper to detect if an element is a text field
// ---------------------------------------------------------
const isTextField = (element: HTMLElement | null): boolean => {
  if (!element) return false

  // 1. NEW: Check for specific Aria Label (e.g. Gmail Compose)
  if (element.getAttribute("aria-label") === "Message body") return true

  // 2. Check for specific class names (current element OR parent)
  const hasEditableClass = (el: HTMLElement) => 
    el.classList.contains("editable") || el.classList.contains("textarea")

  if (hasEditableClass(element)) return true
  if (element.parentElement && hasEditableClass(element.parentElement)) return true

  // 3. Check Standard HTML Tags
  const tagName = element.tagName
  if (tagName === "TEXTAREA") return true
  if (tagName === "INPUT") {
    const type = element.getAttribute("type")?.toLowerCase() || "text"
    const ignoredTypes = ["checkbox", "radio", "button", "submit", "hidden", "range", "color", "file"]
    return !ignoredTypes.includes(type)
  }

  // 4. Check for "Content Editable" attribute
  return element.isContentEditable
}

// Helper to extract text
const getTextFromElement = (element: HTMLElement): string => {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return (element as HTMLInputElement).value || ""
  }
  // Fallback for divs/spans
  return element.innerText || ""
}

const TrafficLightOverlay = () => {
  const [status, setStatus] = useState<"grey" | "green" | "orange" | "red">("grey")
  const [explanation, setExplanation] = useState<string | null>(null)
  
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  
  const isHovering = useRef(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)

  const checkProfessionalism = async (text: string) => {
    if (!text.trim()) {
      setStatus("grey")
      setExplanation(null)
      return
    }

    setLoading(true)
    setShowPopup(false) 

    const response = await sendToBackground({
      name: "check-text",
      body: { text }
    })

    setLoading(false)
    setStatus(response.status)
    setExplanation(response.explanation)
  }

  const handleIconClick = () => {
    if (explanation && status !== "grey") {
      setShowPopup(!showPopup)
    }
  }

  useEffect(() => {
    const handleInput = (e: Event) => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        const target = e.target as HTMLElement
        // Only run if the input event came from a valid text field
        if (isTextField(target)) { 
             const text = getTextFromElement(target)
             checkProfessionalism(text)
        }
      }, 1000) 
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
            checkProfessionalism(getTextFromElement(activeEl))
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
        <div className="explanation-bubble">
           {explanation}
        </div>
      )}

      <div 
        className={`indicator-light ${status} ${loading ? "pulsing" : ""}`}
        onClick={handleIconClick}
        title={explanation ? "Click for explanation" : ""}
      >
        {status === "grey" && !loading && <span className="icon">?</span>}
      </div>
    </div>
  )
}

export default TrafficLightOverlay