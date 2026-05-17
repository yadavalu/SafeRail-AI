import { useStorage } from "@plasmohq/storage/hook"
import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import styleText from "data-text:./input_overlay.css"
import localUnsafeDomainsText from "data-text:../assets/unsafe_domains.txt"
import { db } from "../firebase-config"
import { doc, getDoc } from "firebase/firestore/lite"

// Import SVG assets
import greenIcon from "data-base64:../assets/green.svg"
import orangeIcon from "data-base64:../assets/orange.svg"
import redIcon from "data-base64:../assets/red.svg"
import greyIcon from "data-base64:../assets/grey.svg"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

// --- MAIN COMPONENT ---

const ResetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const ComplianceWidget = () => {
  const [theme] = useStorage("theme", "system")
  const [status, setStatus] = useState<"grey" | "green" | "warn" | "clear_warn">("grey")
  const [explanation, setExplanation] = useState<string | null>("Ready to check.")
  const [unsafeDomains, setUnsafeDomains] = useState<string[]>([])

  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConfidential, setIsConfidential] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [snapCorner, setSnapCorner] = useState<"tl" | "tr" | "bl" | "br">("br")

  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 })
  const [isDragging, setIsDragging] = useState(false)
  const hasDragged = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const lastElement = useRef<HTMLElement | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>("")
  const isHovering = useRef(false) 

  // Determine actual theme
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    // Initial position: Bottom Right corner
    const initialX = window.innerWidth - 80
    const initialY = window.innerHeight - 80
    setPosition({ x: initialX > 0 ? initialX : 20, y: initialY > 0 ? initialY : 20 })
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemTheme(mediaQuery.matches ? "dark" : "light")

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light")
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler)
    } else {
      mediaQuery.addListener(handler)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [])

  const appliedTheme = theme === "system" ? systemTheme : theme

  // Load Unsafe Domains from Firebase or Local
  useEffect(() => {
    const fetchDomains = async () => {
        try {
            const d = await getDoc(doc(db, "config", "settings"))
            if (d.exists() && d.data().unsafe_domains) {
                const domains = d.data().unsafe_domains.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean)
                setUnsafeDomains(domains)
                return
            }
        } catch (e) {
            console.error("Failed to fetch remote domains:", e)
        }
        setUnsafeDomains(localUnsafeDomainsText.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean))
    }
    fetchDomains()
  }, [])

  const isCurrentSiteUnsafe = (): string | null => {
    const currentHost = window.location.hostname.toLowerCase()
    return unsafeDomains.find(d => currentHost.includes(d)) || null
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

  const setTextToElement = (element: HTMLElement, text: string) => {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      (element as HTMLInputElement).value = text
    } else {
      element.innerText = text
    }
    // Dispatch input event so site knows it changed
    element.dispatchEvent(new Event("input", { bubbles: true }))
  }

  const checkCompliance = async (text: string, force = false) => {
    if (!text.trim()) {
      setStatus("grey")
      setExplanation("Ready to check.")
      lastAnalyzedText.current = ""
      return
    }

    const unsafeMatch = isCurrentSiteUnsafe()
    let securityMsg = ""

    if (unsafeMatch) {
        securityMsg = `SECURITY ALERT: ${unsafeMatch} is prohibited.`
        setStatus("clear_warn")
        setExplanation(securityMsg)
    } 

    if (!force && text.trim() === lastAnalyzedText.current.trim() && !unsafeMatch) return

    setLoading(true)

    const platform = getPlatformContext()

    const response = await sendToBackground({
      name: "check-text",
      body: { text, platform }
    })

    setLoading(false)

    let finalStatus = response.status
    let finalExplanation = response.explanation
    const confidentialDetected = response.confidential || false
    setIsConfidential(confidentialDetected)

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

  const handleRewrite = async () => {
    if (!lastElement.current) return
    const text = getTextFromElement(lastElement.current)
    if (!text.trim()) return

    setIsRewriting(true)
    const response = await sendToBackground({
      name: "rewrite-text",
      body: { text }
    })
    setIsRewriting(false)

    if (response.rewrittenText) {
      setTextToElement(lastElement.current, response.rewrittenText)
      checkCompliance(response.rewrittenText)
    } else if (response.error) {
      setExplanation(`Rewrite Error: ${response.error}`)
    }
  }

  const handleManualCheck = () => {
    if (lastElement.current) {
      checkCompliance(getTextFromElement(lastElement.current), true)
    }
  }

  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement
      if (!isTextField(target)) return
      lastElement.current = target
      const text = getTextFromElement(target)

      if (typingTimer.current) clearTimeout(typingTimer.current)

      const lastChar = text.trim().slice(-1)
      const isSentenceEnd = [".", "!", "?", "\n"].includes(lastChar)
      const delay = isSentenceEnd ? 800 : 2000

      typingTimer.current = setTimeout(() => checkCompliance(text), delay) 
    }
    document.addEventListener("input", handleInput)
    return () => document.removeEventListener("input", handleInput)
  }, [unsafeDomains]) // Re-bind if domains change

  useEffect(() => {
    const handleFocusChange = () => {
      setTimeout(() => {
        if (isHovering.current) return
        const activeEl = document.activeElement as HTMLElement
        if (isTextField(activeEl)) {
            lastElement.current = activeEl
            setIsVisible(true)
            const text = getTextFromElement(activeEl)
            if (!text.trim()) {
                setStatus("grey")
                setExplanation("Ready to check.")
            } else {
                checkCompliance(text)
            }
        } else {
            // Only hide if not hovering the widget
            if (!isHovering.current) {
                setIsVisible(false)
                setIsExpanded(false)
            }
        }
      }, 100)
    }

    document.addEventListener("focusin", handleFocusChange)
    document.addEventListener("focusout", handleFocusChange)
    return () => {
        document.removeEventListener("focusin", handleFocusChange)
        document.removeEventListener("focusout", handleFocusChange)
    }
  }, [unsafeDomains])

  // Drag & Snap logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    hasDragged.current = false
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragStart.current.x
      const newY = e.clientY - dragStart.current.y
      
      // If moved more than 5px, it's a drag, not a click
      if (Math.abs(newX - position.x) > 5 || Math.abs(newY - position.y) > 5) {
        hasDragged.current = true
      }

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      if (!isDragging) return
      setIsDragging(false)

      if (!hasDragged.current) {
        // Toggle expansion if it was a click
        setIsExpanded(!isExpanded)
      } else {
        // Snap to nearest corner
        const margin = 20
        const w = window.innerWidth
        const h = window.innerHeight
        
        // Get actual dimensions
        const rect = widgetRef.current?.getBoundingClientRect() || { width: 48, height: 48 }
        const currentWidth = rect.width
        const currentHeight = rect.height
        
        const snapPoints: { x: number, y: number, corner: "tl" | "tr" | "bl" | "br" }[] = [
            { x: margin, y: margin, corner: "tl" }, // Top Left
            { x: w - currentWidth - margin, y: margin, corner: "tr" }, // Top Right
            { x: margin, y: h - currentHeight - margin, corner: "bl" }, // Bottom Left
            { x: w - currentWidth - margin, y: h - currentHeight - margin, corner: "br" } // Bottom Right
        ]

        let closest = snapPoints[0]
        let minDist = Infinity

        snapPoints.forEach(p => {
            const dist = Math.sqrt((position.x - p.x)**2 + (position.y - p.y)**2)
            if (dist < minDist) {
                minDist = dist
                closest = p
            }
        })

        setPosition({ x: closest.x, y: closest.y })
        setSnapCorner(closest.corner)
      }
    }

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isExpanded, position])

  // Re-snap on expansion/collapse
  useEffect(() => {
    if (!isVisible) return
    
    // Wait for the next frame to ensure the DOM has updated dimensions
    const timer = setTimeout(() => {
        const margin = 20
        const w = window.innerWidth
        const h = window.innerHeight
        const rect = widgetRef.current?.getBoundingClientRect() || { width: 48, height: 48 }
        
        const newPos = { ...position }
        
        if (snapCorner === "tl") {
            newPos.x = margin
            newPos.y = margin
        } else if (snapCorner === "tr") {
            newPos.x = w - rect.width - margin
            newPos.y = margin
        } else if (snapCorner === "bl") {
            newPos.x = margin
            newPos.y = h - rect.height - margin
        } else if (snapCorner === "br") {
            newPos.x = w - rect.width - margin
            newPos.y = h - rect.height - margin
        }
        
        setPosition(newPos)
    }, 50) 
    
    return () => clearTimeout(timer)
  }, [isExpanded, isVisible])

  if (!isVisible) return null

  const getHeaderTitle = () => {
    if (loading) return "Checking..."
    if (status === "clear_warn") return isConfidential ? "Data Leak Detected" : "Violation Detected"
    if (status === "warn") return "Warning"
    if (status === "green") return "Compliant"
    return "Compliance"
  }

  const getStatusIcon = () => {
    if (status === "green") return greenIcon
    if (status === "warn") return orangeIcon
    if (status === "clear_warn") return redIcon
    return greyIcon
  }

  return (
    <div 
      ref={widgetRef}
      className={`compliance-widget theme-${appliedTheme} ${status} ${loading ? "pulsing" : ""} ${isExpanded ? "expanded" : "collapsed"}`}
      onMouseEnter={() => { isHovering.current = true }}
      onMouseLeave={() => { isHovering.current = false }}
      onMouseDown={handleMouseDown}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : (isExpanded ? "default" : "pointer"),
        position: "fixed",
        transition: isDragging ? "none" : undefined
      }}
    >
      <div className="widget-header">
        <div className="header-left">
          <img 
            src={getStatusIcon()} 
            className="status-svg-icon" 
            alt="status" 
            draggable="false"
          />
          {isExpanded && <span>{getHeaderTitle()}</span>}
        </div>
        
        {isExpanded && (
          <button 
            className="reset-button" 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); handleManualCheck(); }}
            title="Re-run compliance check"
          >
            <ResetIcon />
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          <div className="widget-content">
            {explanation}
          </div>
          <div className="widget-actions">
            {(status === "warn" || status === "clear_warn") && (
              <button 
                className="rewrite-button" 
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); handleRewrite(); }}
                disabled={isRewriting}
              >
                {isRewriting ? "Rewriting..." : "Rewrite for Compliance"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}


export default ComplianceWidget