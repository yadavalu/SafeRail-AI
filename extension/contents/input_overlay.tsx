import { useStorage } from "@plasmohq/storage/hook"
import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import styleText from "data-text:./input_overlay.css"
import localUnsafeDomainsText from "data-text:../assets/unsafe_domains.txt"

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

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6" />
    <path d="M20 10h-6V4" />
    <path d="M14 10l7-7" />
    <path d="M10 14l-7 7" />
  </svg>
)

const isAllowedOnSendSite = (): boolean => {
  const host = window.location.hostname.toLowerCase()
  return (
    host.includes("gmail.com") ||
    host.includes("mail.google.com") ||
    host.includes("outlook") ||
    host.includes("yahoo.com") ||
    host.includes("yahoo.")
  )
}

const NAMED_ENTITIES: Record<string, string> = {
  'ä': 'auml', 'Ä': 'Auml',
  'ö': 'ouml', 'Ö': 'Ouml',
  'ü': 'uuml', 'Ü': 'Uuml',
  'ß': 'szlig',
  '&': 'amp',
  '<': 'lt',
  '>': 'gt',
  '"': 'quot',
  "'": 'apos',
  'é': 'eacute', 'É': 'Eacute',
  'è': 'egrave', 'È': 'Egrave',
  'à': 'agrave', 'À': 'Agrave',
  'ç': 'ccedil', 'Ç': 'Ccedil'
}

const DECOMPOSED_MAP: Record<string, string> = {
  'ä': 'a\u0308', 'Ä': 'A\u0308',
  'ö': 'o\u0308', 'Ö': 'O\u0308',
  'ü': 'u\u0308', 'Ü': 'U\u0308',
  'é': 'e\u0301', 'É': 'E\u0301',
  'è': 'e\u0300', 'È': 'E\u0300',
  'à': 'a\u0300', 'À': 'A\u0300',
}

const getCharRegexPattern = (char: string): string => {
  if (char === ' ' || char === '\u00a0') {
    return '(?:[ \u00a0]|&nbsp;|&#160;|&#x0*[aA]0;)'
  }
  
  const code = char.charCodeAt(0)
  
  if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
    return char
  }
  
  if (code > 127 || ['&', '<', '>', '"', "'"].includes(char)) {
    const hex = code.toString(16)
    const parts = [
      char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    ]
    
    const decomposed = DECOMPOSED_MAP[char]
    if (decomposed) {
      parts.push(decomposed)
    }
    
    const named = NAMED_ENTITIES[char]
    if (named) {
      parts.push(`&${named};`)
    }
    
    parts.push(`&#${code};`)
    parts.push(`&#[xX]0*${hex};`)
    
    return `(?:${parts.join('|')})`
  }
  
  return char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

const ComplianceWidget = () => {
  const [theme] = useStorage("theme", "system")
  const [analysisMode] = useStorage("analysisMode", "onsend")
  const [realTimeAnalysis] = useStorage("realTimeAnalysis", false)
  const effectiveMode = analysisMode || (realTimeAnalysis ? "realtime" : "onsend")
  const [status, setStatus] = useState<"grey" | "green" | "warn" | "clear_warn" | "error">("grey")
  const [explanation, setExplanation] = useState<string | null>("Ready to check.")
  const [unsafeDomains, setUnsafeDomains] = useState<string[]>([])

  const sendButtonRef = useRef<HTMLElement | null>(null)
  const isProgrammaticSend = useRef(false)

  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConfidential, setIsConfidential] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isManuallyMinimized, setIsManuallyMinimized] = useState(false)
  const [snapCorner, setSnapCorner] = useState<"tl" | "tr" | "bl" | "br">("br")

  const lastElement = useRef<HTMLElement | null>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const isMouseOverWidget = useRef(false)
  const isRewritingRef = useRef(false)
  const isProgrammaticUpdateRef = useRef(false)

  const statusRef = useRef<"grey" | "green" | "warn" | "clear_warn" | "error">("grey")
  const isLoadingRef = useRef(false)

  const updateStatus = (newStatus: "grey" | "green" | "warn" | "clear_warn" | "error") => {
    setStatus(newStatus)
    statusRef.current = newStatus
  }

  const updateLoading = (newLoading: boolean) => {
    setLoading(newLoading)
    isLoadingRef.current = newLoading
  }

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const hasDragged = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const dragInitialPos = useRef({ x: 0, y: 0 })

  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastAnalyzedText = useRef<string>("")

  const getSenderEmail = (): string => {
    try {
      const profileLink = document.querySelector('a[href^="https://accounts.google.com/SignOutOptions"]')
      if (profileLink) {
        const title = profileLink.getAttribute("title")
        const match = title?.match(/\(([^)]+)\)/)
        if (match?.[1]) return match[1].trim()
      }

      const accountDiv = document.querySelector('div[aria-label^="Google Account:"]')
      if (accountDiv) {
        const label = accountDiv.getAttribute("aria-label")
        const match = label?.match(/\(([^)]+)\)/)
        if (match?.[1]) return match[1].trim()
      }

      const gbEl = document.querySelector('.gb_d.gb_Qa.gb_h, .gb_b.gb_da')
      if (gbEl) {
        const label = gbEl.getAttribute("aria-label")
        const match = label?.match(/([^:\s\(\)]+@[^:\s\(\)]+\.[a-zA-Z]+)/)
        if (match) return match[0].trim()
      }

      const outlookUser = document.querySelector('#O365_HeaderLeftRegion div[title*="@"]')
      if (outlookUser) {
        const title = outlookUser.getAttribute("title")
        if (title && title.includes("@")) return title.trim()
      }
    } catch (e) {
      console.error("Error extracting sender email:", e)
    }
    return "sender@company.com"
  }

  const getRecipientEmails = (): string[] => {
    const emails: string[] = []
    try {
      // Gmail: Check for elements with attribute 'email'
      const gmailChips = document.querySelectorAll('span[email], div[email]')
      gmailChips.forEach(el => {
        const email = el.getAttribute('email')
        if (email && email.includes('@')) {
          emails.push(email.trim().toLowerCase())
        }
      })
      
      // Gmail fallback: data-hovercard-id is often the email for hovercard
      const hovercardEls = document.querySelectorAll('[data-hovercard-id]')
      hovercardEls.forEach(el => {
        const id = el.getAttribute('data-hovercard-id')
        if (id && id.includes('@')) {
          emails.push(id.trim().toLowerCase())
        }
      })

      // Outlook: Chips often have data-emailaddress or title containing email
      const outlookChips = document.querySelectorAll('[data-emailaddress], [title*="@"]')
      outlookChips.forEach(el => {
        const email = el.getAttribute('data-emailaddress') || el.getAttribute('title')
        if (email && email.includes('@') && !email.includes('SignOut') && !email.includes('Account')) {
          const match = email.match(/<([^>]+)>/) || email.match(/([^<>\s@]+@[^<>\s@]+\.[a-zA-Z]+)/)
          if (match) {
            emails.push(match[0].replace(/[<>]/g, '').trim().toLowerCase())
          }
        }
      })
    } catch (e) {
      console.error("Error extracting recipient emails:", e)
    }
    return [...new Set(emails)]
  }

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

  // Auto-expand on error/warn
  useEffect(() => {
    if (!isManuallyMinimized && (status === "warn" || status === "clear_warn" || status === "error")) {
        setIsExpanded(true)
    }
  }, [status, isManuallyMinimized])

  // Load Unsafe Domains from Firebase or Local
  useEffect(() => {
    const fetchDomains = async () => {
        try {
            const response = await sendToBackground({ name: "get-settings" })
            if (response && response.settings && response.settings.unsafe_domains) {
                const domains = response.settings.unsafe_domains.split("\n").map(s => s.trim().toLowerCase()).filter(Boolean)
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
    isProgrammaticUpdateRef.current = true
    element.dispatchEvent(new Event("input", { bubbles: true }))
    isProgrammaticUpdateRef.current = false
  }

  const underlineText = (element: HTMLElement, textToHighlight: string, status: "warn" | "clear_warn" | "error") => {
    if (!textToHighlight || !textToHighlight.trim() || !element) return
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") return

    const color = status === "clear_warn" ? "#ff3b30" : "#ff9500"
    const styleString = `text-decoration: underline wavy ${color}; text-decoration-skip-ink: none;`

    const html = element.innerHTML
    if (html.includes(styleString)) return

    // Strip Google spellcheck span tags first
    const googleSpanRegex = /<span([^>]*?(?:data-ddnwab|class="[^"]*?(?:Asgive|\bng\b)[^"]*?")[^>]*?)>([\s\S]*?)<\/span>/gi
    const cleanedHTML = html.replace(googleSpanRegex, '$2')

    const normalizedText = textToHighlight.normalize("NFC")
    let pattern = ""
    for (let i = 0; i < normalizedText.length; i++) {
      pattern += getCharRegexPattern(normalizedText[i])
    }
    const regex = new RegExp(`(${pattern})`, 'gi')

    let replaced = false
    const newHTML = cleanedHTML.replace(regex, (match) => {
      replaced = true
      return `<span class="saferail-highlight" style="${styleString}">${match}</span>`
    })

    if (replaced) {
      element.innerHTML = newHTML
      isProgrammaticUpdateRef.current = true
      element.dispatchEvent(new Event("input", { bubbles: true }))
      isProgrammaticUpdateRef.current = false
    }
  }

  const clearUnderlines = (element: HTMLElement) => {
    if (!element || element.tagName === "INPUT" || element.tagName === "TEXTAREA") return

    const html = element.innerHTML
    if (!html.includes("saferail-highlight")) return

    const cleanHTML = html.replace(/<span[^>]*class="saferail-highlight"[^>]*>([\s\S]*?)<\/span>/gi, '$1')

    element.innerHTML = cleanHTML
    isProgrammaticUpdateRef.current = true
    element.dispatchEvent(new Event("input", { bubbles: true }))
    isProgrammaticUpdateRef.current = false
  }

  const checkCompliance = async (text: string, force = false): Promise<"grey" | "green" | "warn" | "clear_warn" | "error"> => {
    if (!text.trim()) {
      updateStatus("grey")
      setExplanation("Ready to check.")
      lastAnalyzedText.current = ""
      setIsManuallyMinimized(false)
      return "grey"
    }

    const unsafeMatch = isCurrentSiteUnsafe()
    let securityMsg = ""

    if (unsafeMatch) {
        securityMsg = `SECURITY ALERT: ${unsafeMatch} is prohibited.`
        updateStatus("clear_warn")
        setExplanation(securityMsg)
    } 

    if (!force && text.trim() === lastAnalyzedText.current.trim() && !unsafeMatch) return statusRef.current

    const editor = lastElement.current || (document.activeElement as HTMLElement)
    if (editor) {
      clearUnderlines(editor)
    }

    updateLoading(true)
    setIsManuallyMinimized(false) // Reset on new check

    const platform = getPlatformContext()

    const response = await sendToBackground({
      name: "check-text",
      body: { 
        text, 
        platform, 
        senderEmail: getSenderEmail(),
        recipientEmails: getRecipientEmails()
      }
    })

    updateLoading(false)

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

    updateStatus(finalStatus)
    setExplanation(finalExplanation)
    
    if (editor && (finalStatus === "warn" || finalStatus === "clear_warn") && response.highlight) {
      underlineText(editor, response.highlight, finalStatus)
    }

    lastAnalyzedText.current = text
    return finalStatus
  }

  const handleRewrite = async () => {
    if (!lastElement.current) return
    const text = getTextFromElement(lastElement.current)
    if (!text.trim()) return

    setIsRewriting(true)
    isRewritingRef.current = true
    const response = await sendToBackground({
      name: "rewrite-text",
      body: { text }
    })

    if (response.rewrittenText) {
      setTextToElement(lastElement.current, response.rewrittenText)
      // Trust the rewrite and skip checking for compliance as requested
      updateStatus("green")
      setExplanation("Rewritten for compliance.")
      setIsExpanded(false)
      setIsManuallyMinimized(true)
      lastAnalyzedText.current = response.rewrittenText
    } else if (response.error) {
      setExplanation(`Rewrite Error: ${response.error}`)
      updateStatus("error")
    }
    setIsRewriting(false)
    isRewritingRef.current = false
  }

  const handleManualCheck = () => {
    if (lastElement.current) {
      checkCompliance(getTextFromElement(lastElement.current), true)
    }
  }

  useEffect(() => {
    const handleInput = (e: Event) => {
      if (isProgrammaticUpdateRef.current || isRewritingRef.current) return // Skip checking during programmatic changes
      const target = e.target as HTMLElement
      if (!isTextField(target)) return
      lastElement.current = target

      if (effectiveMode !== "realtime") {
        updateStatus("grey")
        setExplanation("Ready to check.")
        return
      }

      const text = getTextFromElement(target)

      if (typingTimer.current) clearTimeout(typingTimer.current)

      const lastChar = text.trim().slice(-1)
      const isSentenceEnd = [".", "!", "?", "\n"].includes(lastChar)
      const delay = isSentenceEnd ? 800 : 2000

      typingTimer.current = setTimeout(() => checkCompliance(text), delay) 
    }
    document.addEventListener("input", handleInput)
    return () => document.removeEventListener("input", handleInput)
  }, [unsafeDomains, effectiveMode]) // Re-bind if domains/mode change

  useEffect(() => {
    const handleFocusChange = () => {
      setTimeout(() => {
        const activeEl = document.activeElement as HTMLElement
        if (isTextField(activeEl)) {
            lastElement.current = activeEl
            if (effectiveMode !== "realtime" && !isAllowedOnSendSite()) {
                setIsVisible(false)
                setIsExpanded(false)
                return
            }
            setIsVisible(true)
            
            if (effectiveMode !== "realtime") {
                updateStatus("grey")
                setExplanation("Ready to check.")
                setIsManuallyMinimized(false)
                return
            }

            const text = getTextFromElement(activeEl)
            if (!text.trim()) {
                updateStatus("grey")
                setExplanation("Ready to check.")
                setIsManuallyMinimized(false)
            } else {
                checkCompliance(text)
            }
        } else {
            // Check if focus is moving to the widget itself or if mouse is over it
            setTimeout(() => {
                if (isMouseOverWidget.current || (widgetRef.current && widgetRef.current.contains(document.activeElement))) return
                
                // If real-time is off and we are scanning/loading or displaying a warning/error, do not auto-hide the widget on focus loss
                if (effectiveMode !== "realtime" && (isLoadingRef.current || ["warn", "clear_warn", "error"].includes(statusRef.current))) {
                    return
                }

                setIsVisible(false)
                setIsExpanded(false)
                setIsManuallyMinimized(false)
            }, 50)
        }
      }, 100)
    }

    document.addEventListener("focusin", handleFocusChange)
    document.addEventListener("focusout", handleFocusChange)
    return () => {
        document.removeEventListener("focusin", handleFocusChange)
        document.removeEventListener("focusout", handleFocusChange)
    }
  }, [unsafeDomains, effectiveMode])

  const findSendButton = (el: HTMLElement | null): HTMLElement | null => {
    let current: HTMLElement | null = el
    for (let i = 0; i < 5 && current; i++) {
      const tooltip = current.getAttribute("data-tooltip") || ""
      const ariaLabel = current.getAttribute("aria-label") || ""
      const role = current.getAttribute("role") || ""
      const text = current.innerText || ""
      
      if (
        (role === "button" && (tooltip.toLowerCase().includes("send") || ariaLabel.toLowerCase().includes("send"))) ||
        (text.trim().toLowerCase() === "send") ||
        (current.tagName === "BUTTON" && text.trim().toLowerCase() === "send")
      ) {
        return current
      }
      current = current.parentElement
    }
    return null
  }

  const handleDismissAndSend = () => {
    const textElement = lastElement.current || (document.activeElement as HTMLElement)
    if (textElement) {
      clearUnderlines(textElement)
    }
    if (sendButtonRef.current) {
      isProgrammaticSend.current = true
      sendButtonRef.current.click()
      isProgrammaticSend.current = false
      setIsExpanded(false)
      setIsVisible(false)
    }
  }

  useEffect(() => {
    const handleSendClick = async (e: MouseEvent) => {
      if (isProgrammaticSend.current) return

      const target = e.target as HTMLElement
      const sendBtn = findSendButton(target)
      if (!sendBtn) return

      if (!isAllowedOnSendSite()) return

      if (effectiveMode === "realtime") {
        const textElement = lastElement.current || (document.activeElement as HTMLElement)
        if (textElement) {
          clearUnderlines(textElement)
        }
        return
      }

      // Intercept Send button click!
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      sendButtonRef.current = sendBtn

      // Clear visual pressed/focused states on the Send button
      sendBtn.blur()
      sendBtn.classList.remove("T-I-JW", "T-I-KO")
      sendBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      sendBtn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))

      const textElement = lastElement.current || (document.activeElement as HTMLElement)
      if (!textElement || !isTextField(textElement)) {
        isProgrammaticSend.current = true
        sendBtn.click()
        isProgrammaticSend.current = false
        return
      }

      setIsVisible(true)
      setIsExpanded(true)

      const text = getTextFromElement(textElement)

      if (effectiveMode === "aftersend") {
        clearUnderlines(textElement)
        updateLoading(true)
        updateStatus("grey")
        setExplanation("Checking compliance in background...")
        
        const senderEmail = getSenderEmail()
        
        const response = await sendToBackground({
          name: "stack-mail",
          body: {
            text,
            senderEmail,
            recipientEmails: getRecipientEmails(),
            platform: getPlatformContext()
          }
        })
        
        updateLoading(false)
        
        if (response.status === "green") {
          setIsVisible(false)
          setIsExpanded(false)
          isProgrammaticSend.current = true
          sendBtn.click()
          isProgrammaticSend.current = false
        } else {
          const displayStatus = (response.status === "blocked" || response.status === "error") ? "clear_warn" : "error"
          updateStatus(displayStatus as any)
          setExplanation(`BLOCK ALERT: Outgoing email was blocked due to compliance violations. A notification has been sent to ${senderEmail}.\n\nReason: ${response.explanation || "Compliance violation detected."}`)
          if (response.highlight) {
            underlineText(textElement, response.highlight, displayStatus as any)
          }
        }
        return
      }

      // Default Check on Send mode
      const finalStatus = await checkCompliance(text, true)

      if (finalStatus === "green") {
        setIsVisible(false)
        setIsExpanded(false)
        isProgrammaticSend.current = true
        sendBtn.click()
        isProgrammaticSend.current = false
      } else {
        setIsVisible(true)
        setIsExpanded(true)
      }
    }

    document.addEventListener("click", handleSendClick, true)
    return () => document.removeEventListener("click", handleSendClick, true)
  }, [effectiveMode, unsafeDomains, status])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (isProgrammaticSend.current) return

      const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter"
      if (!isCtrlEnter) return

      const target = e.target as HTMLElement
      if (!isTextField(target)) return

      if (!isAllowedOnSendSite()) return

      if (effectiveMode === "realtime") {
        clearUnderlines(target)
        return
      }

      // Intercept Ctrl+Enter send!
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      // Find the Send button for programmatic click later
      const composeContainer = target.closest('.M9, .AD, form, [role="main"]')
      const sendButton = (composeContainer?.querySelector('div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"], button[type="submit"]') ||
                           document.querySelector('div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="Send"], button[type="submit"]')) as HTMLElement

      if (!sendButton) {
        console.warn("SafeRail: Could not find Send button for Ctrl+Enter intercept")
        return
      }

      sendButtonRef.current = sendButton

      setIsVisible(true)
      setIsExpanded(true)

      const text = getTextFromElement(target)

      if (effectiveMode === "aftersend") {
        clearUnderlines(target)
        updateLoading(true)
        updateStatus("grey")
        setExplanation("Checking compliance in background...")
        
        const senderEmail = getSenderEmail()
        
        const response = await sendToBackground({
          name: "stack-mail",
          body: {
            text,
            senderEmail,
            platform: getPlatformContext()
          }
        })
        
        updateLoading(false)
        
        if (response.status === "green") {
          setIsVisible(false)
          setIsExpanded(false)
          isProgrammaticSend.current = true
          sendButton.click()
          isProgrammaticSend.current = false
        } else {
          const displayStatus = (response.status === "blocked" || response.status === "error") ? "clear_warn" : "error"
          updateStatus(displayStatus as any)
          setExplanation(`BLOCK ALERT: Outgoing email was blocked due to compliance violations. A notification has been sent to ${senderEmail}.\n\nReason: ${response.explanation || "Compliance violation detected."}`)
          if (response.highlight) {
            underlineText(target, response.highlight, displayStatus as any)
          }
        }
        return
      }

      // Default Check on Send mode
      const finalStatus = await checkCompliance(text, true)

      if (finalStatus === "green") {
        setIsVisible(false)
        setIsExpanded(false)
        isProgrammaticSend.current = true
        sendButton.click()
        isProgrammaticSend.current = false
      } else {
        setIsVisible(true)
        setIsExpanded(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [effectiveMode, unsafeDomains, status])

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
      
      const rect = widgetRef.current?.getBoundingClientRect() || { width: 56, height: 56, left: dragPos.x, top: dragPos.y }
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

      // Toggle expand on click (if not dragged)
      if (!hasDragged.current && !isExpanded) {
        setIsExpanded(true)
        setIsManuallyMinimized(false)
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
  }, [isDragging, isExpanded])

  if (!isVisible) return null

  const getHeaderTitle = () => {
    if (loading) return "Checking..."
    if (status === "clear_warn") return isConfidential ? "Data Leak Detected" : "Violation Detected"
    if (status === "warn") return "Warning"
    if (status === "green") return "Compliant"
    if (status === "error") return "Error"
    return "Compliance"
  }

  const getStatusIcon = () => {
    if (status === "green") return greenIcon
    if (status === "warn") return orangeIcon
    if (status === "clear_warn") return redIcon
    if (status === "error") return redIcon
    return greyIcon
  }

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(false)
    setIsManuallyMinimized(true)
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
      onMouseDown={handleMouseDown}
      onMouseEnter={() => { isMouseOverWidget.current = true }}
      onMouseLeave={() => { isMouseOverWidget.current = false }}
      tabIndex={-1}
      style={{
        ...getPositionStyles(),
        cursor: isDragging ? "grabbing" : (isExpanded ? "default" : "pointer"),
        position: "fixed",
        outline: "none"
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
          <div className="header-right">
            <button 
              className="reset-button" 
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); handleManualCheck(); }}
              title="Re-run compliance check"
              disabled={loading}
            >
              <ResetIcon />
            </button>
            <button 
                className="minimize-button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={handleMinimize}
                title="Minimize"
            >
                <MinimizeIcon />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {effectiveMode !== "realtime" && (status === "warn" || status === "clear_warn") && (
            <div 
              className="sending-halted-text" 
              style={{
                color: "#ff3b30",
                fontWeight: "bold",
                fontSize: "13px",
                marginBottom: "10px",
                textAlign: "left",
                letterSpacing: "0.5px"
              }}
            >
              {effectiveMode === "aftersend" ? "SENDING BLOCKED" : "SENDING HALTED"}
            </div>
          )}
          <div className="widget-content">
            {explanation}
          </div>
          <div className="widget-actions">
            {(status === "warn" || status === "clear_warn") && (
              <>
                <div className="action-divider" />
                <div className="rewrite-description">
                  Automatically rewrite text to fix violations.
                </div>
                <button 
                  className="rewrite-button" 
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); handleRewrite(); }}
                  disabled={isRewriting}
                >
                  {isRewriting ? "Rewriting..." : "Rewrite for Compliance"}
                </button>
                {effectiveMode === "onsend" && (
                  <button 
                    className="dismiss-send-button" 
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => { e.stopPropagation(); handleDismissAndSend(); }}
                  >
                    Dismiss & Send
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ComplianceWidget