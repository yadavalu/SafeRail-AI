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

const getTextFromElement = (element: HTMLElement): string => {
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    return (element as HTMLInputElement).value || ""
  }
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

  // 1. Single Function to get Color AND Explanation
  const checkProfessionalism = async (text: string) => {
    if (!text.trim()) {
      setStatus("grey")
      setExplanation(null)
      return
    }

    setLoading(true)
    // Hide popup while re-analyzing to avoid showing old explanation for new text
    setShowPopup(false) 

    const response = await sendToBackground({
      name: "check-text",
      body: { text }
    })

    setLoading(false)
    setStatus(response.status)
    setExplanation(response.explanation)
  }

  // 2. Click Handler is now instant (no async)
  const handleIconClick = () => {
    // Only toggle if we actually have an explanation to show
    if (explanation && status !== "grey") {
      setShowPopup(!showPopup)
    }
  }

  // 3. Typing Listener
  useEffect(() => {
    const handleInput = (e: Event) => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        const target = e.target as HTMLElement
        const text = getTextFromElement(target)
        checkProfessionalism(text)
      }, 1000) 
    }
    document.addEventListener("input", handleInput)
    return () => document.removeEventListener("input", handleInput)
  }, [])

  // 4. Focus Listener
  useEffect(() => {
    const handleFocusChange = () => {
      setTimeout(() => {
        if (isHovering.current) return
        
        const activeEl = document.activeElement as HTMLElement
        const isInput = activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable
        
        if (isInput) {
            setIsVisible(true)
            // Check existing text immediately on focus
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
      {/* Explanation Bubble */}
      {showPopup && explanation && (
        <div className="explanation-bubble">
           {explanation}
        </div>
      )}

      {/* Indicator Light */}
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