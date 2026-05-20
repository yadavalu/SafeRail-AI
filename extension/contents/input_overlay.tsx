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

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const hasDragged = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragInitialPos = useRef({ x: 0, y: 0 })
  const lastElement = useRef<HTMLElement | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>("")
  const isHovering = useRef(false) 
  const hoverTimer = useRef<NodeJS.Timeout | null>(null)

  // Determine actual theme
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")

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
    const rect = widgetRef.current?.getBoundingClientRect()
    const startX = rect ? rect.left : 0
    const startY = rect ? rect.top : 0

    setIsDragging(true)
    hasDragged.current = false
    setDragPos({ x: startX, y: startY })
    dragStart.current = {
      x: e.clientX - startX,
      y: e.clientY - startY
    }
    dragInitialPos.current = { x: startX, y: startY }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragStart.current.x
      const newY = e.clientY - dragStart.current.y
      
      if (Math.abs(newX - dragInitialPos.current.x) > 5 || Math.abs(newY - dragInitialPos.current.y) > 5) {
        hasDragged.current = true
      }

      setDragPos({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      if (!isDragging) return
      setIsDragging(false)

      const w = window.innerWidth
      const h = window.innerHeight
      
      const rect = widgetRef.current?.getBoundingClientRect() || { width: 48, height: 48, left: dragPos.x, top: dragPos.y }
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      
      const snapPoints: { x: number, y: number, corner: "tl" | "tr" | "bl" | "br" }[] = [
          { x: 0, y: 0, corner: "tl" },
          { x: w, y: 0, corner: "tr" },
          { x: 0, y: h, corner: "bl" },
          { x: w, y: h, corner: "br" }
      ]

      let closest = snapPoints[0]
      let minDist = Infinity

      snapPoints.forEach(p => {
          const dist = Math.sqrt((cx - p.x)**2 + (cy - p.y)**2)
          if (dist < minDist) {
              minDist = dist
              closest = p
          }
      })

      setSnapCorner(closest.corner)

      // Only expand if we are hovering and not just casually dropping it
      if (isHovering.current) {
        setIsExpanded(true)
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
  }, [isDragging])

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

  const handleHover = (expand: boolean) => {
    isHovering.current = expand
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    
    hoverTimer.current = setTimeout(() => {
        if (!isDragging) {
            setIsExpanded(expand)
        }
    }, 150)
  }

  const getPositionStyles = (): React.CSSProperties => {
    const margin = 20
    if (isDragging) {
      return {
        left: `${dragPos.x}px`,
        top: `${dragPos.y}px`,
        right: 'auto',
        bottom: 'auto',
        transition: "none"
      }
    }

    const styles: React.CSSProperties = {
      transition: "all 0.3s cubic-bezier(0.19, 1, 0.22, 1)"
    }

    if (snapCorner === "tl") {
      styles.left = `${margin}px`
      styles.top = `${margin}px`
      styles.right = 'auto'
      styles.bottom = 'auto'
    } else if (snapCorner === "tr") {
      styles.right = `${margin}px`
      styles.top = `${margin}px`
      styles.left = 'auto'
      styles.bottom = 'auto'
    } else if (snapCorner === "bl") {
      styles.left = `${margin}px`
      styles.bottom = `${margin}px`
      styles.right = 'auto'
      styles.top = 'auto'
    } else if (snapCorner === "br") {
      styles.right = `${margin}px`
      styles.bottom = `${margin}px`
      styles.left = 'auto'
      styles.top = 'auto'
    }

    return styles
  }

  return (
    <div 
      ref={widgetRef}
      className={`compliance-widget theme-${appliedTheme} ${status} ${loading ? "pulsing" : ""} ${isExpanded ? "expanded" : "collapsed"}`}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onMouseDown={handleMouseDown}
      style={{
        ...getPositionStyles(),
        cursor: isDragging ? "grabbing" : (isExpanded ? "default" : "pointer"),
        position: "fixed",
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