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

const ComplianceWidget = () => {
  const [theme] = useStorage("theme", "system")
  const [status, setStatus] = useState<"grey" | "green" | "warn" | "clear_warn">("grey")
  const [explanation, setExplanation] = useState<string | null>("Ready to check.")
  const [unsafeDomains, setUnsafeDomains] = useState<string[]>([])

  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConfidential, setIsConfidential] = useState(false)

  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>("")
  const isHovering = useRef(false) 

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

  const checkCompliance = async (text: string) => {
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

    if (text.trim() === lastAnalyzedText.current.trim() && !unsafeMatch) return

    setLoading(true)
    setExplanation("Analyzing compliance...")

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
  }, [unsafeDomains]) // Re-bind if domains change

  useEffect(() => {
    const handleFocusChange = () => {
      setTimeout(() => {
        if (isHovering.current) return
        const activeEl = document.activeElement as HTMLElement
        if (isTextField(activeEl)) {
            setIsVisible(true)
            const text = getTextFromElement(activeEl)
            if (!text.trim()) {
                setStatus("grey")
                setExplanation("Ready to check.")
            } else {
                checkCompliance(text)
            }
        } else {
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
  }, [unsafeDomains])

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
      className={`compliance-widget theme-${appliedTheme} ${status} ${loading ? "pulsing" : ""}`}
      onMouseEnter={() => { isHovering.current = true }}
      onMouseLeave={() => { isHovering.current = false }}
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div className="widget-header">
        <img src={getStatusIcon()} className="status-svg-icon" alt="status" />
        <span>{getHeaderTitle()}</span>
      </div>

      <div className="widget-content">
        {explanation}
      </div>
    </div>
  )
}

export default ComplianceWidget