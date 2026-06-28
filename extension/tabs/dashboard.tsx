import { useState, useEffect } from "react"
import { auth, db } from "../firebase-config"
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore/lite"
import { useStorage } from "@plasmohq/storage/hook"
import "../style.css"

import bannerImg from "data-base64:../assets/banner_transparent.png"

type RecentIncident = {
  id?: string
  user?: string
  email?: string
  rule?: string
  ruleType?: string
  type?: string
  severity?: "warning" | "violation" | string
  date?: string | number | Date
  createdAt?: any
  timestamp?: any
}

type Analytics = {
  scanned: number
  warning: number
  violation: number
  confidential: number
  prevented?: number
  corrected?: number
  rewritten?: number
  rule_triggers?: Record<string, number>
  ruleTriggers?: Record<string, number>
  recent_incidents?: RecentIncident[]
  recentIncidents?: RecentIncident[]
  recent_activity?: RecentIncident[]
  incidents?: RecentIncident[]
}

export default function Dashboard() {
  const [theme] = useStorage("theme", "system")
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null)

  const [unsafeDomains, setUnsafeDomains] = useState("")
  const [complianceRules, setComplianceRules] = useState("")
  const [deniedEntities, setDeniedEntities] = useState<string[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({
    scanned: 0,
    warning: 0,
    violation: 0,
    confidential: 0
  })

  // Determine actual theme
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemTheme(mediaQuery.matches ? "dark" : "light")
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light")
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  const appliedTheme = theme === "system" ? systemTheme : theme

  useEffect(() => {
    document.body.className = `theme-${appliedTheme}`
  }, [appliedTheme])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        loadData()
        loadAnalytics()
      }
    })
    return () => unsubscribe()
  }, [])

  const loadAnalytics = async () => {
    try {
      const d = await getDoc(doc(db, "config", "analytics"))
      if (d.exists()) setAnalytics(prev => ({ ...prev, ...(d.data() as Partial<Analytics>) }))
    } catch (e) {
      console.error("Analytics load error:", e)
    }
  }

  const loadData = async () => {
    const configRef = doc(db, "config", "settings")
    const d = await getDoc(configRef)
    if (d.exists()) {
      setUnsafeDomains(d.data().unsafe_domains || "")
      setComplianceRules(d.data().compliance_rules || "")
      setDeniedEntities(d.data().denied_entities || [])
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      alert("Login failed: " + err.message)
    }
  }

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "config", "settings"), {
        unsafe_domains: unsafeDomains,
        compliance_rules: complianceRules,
        denied_entities: deniedEntities
      }, { merge: true })
      alert("Settings saved successfully! Please restart the server to update the changes.")
    } catch (err) {
      alert("Save failed: " + err.message)
    }
  }

  const toggleEntity = (entity: string) => {
    setDeniedEntities(prev =>
      prev.includes(entity) ? prev.filter(e => e !== entity) : [...prev, entity]
    )
  }

  const PII_TYPES = [
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "LOCATION",
    "IP_ADDRESS", "CREDIT_CARD", "CRYPTO", "US_SSN", "IBAN_CODE",
    "DATE_TIME", "NAME"
  ]

  const configuredRules = complianceRules
    .split("\n")
    .map(rule => rule.replace(/^\s*\d+[.)-]?\s*/, "").trim())
    .filter(Boolean)

  const ruleTriggerSource = analytics.rule_triggers || analytics.ruleTriggers || (configuredRules.length
    ? configuredRules.reduce((acc, rule) => ({ ...acc, [rule]: 0 }), {} as Record<string, number>)
    : {
      Warning: analytics.warning || 0,
      Violation: analytics.violation || 0,
      "Data leak": analytics.confidential || 0
    })

  const ruleTriggerTotal = Object.values(ruleTriggerSource).reduce((sum, value) => sum + Number(value || 0), 0)
  const ruleSegments = Object.entries(ruleTriggerSource)
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([label, value]) => ({ label, value: Number(value || 0) }))

  const fallbackIncidents: RecentIncident[] = [
    ...(analytics.violation ? [{ user: "All users", rule: "Policy violation", severity: "violation", date: new Date() }] : []),
    ...(analytics.warning ? [{ user: "All users", rule: "Compliance warning", severity: "warning", date: new Date() }] : [])
  ]

  const recentIncidents = (analytics.recent_incidents || analytics.recentIncidents || analytics.recent_activity || analytics.incidents || fallbackIncidents)
    .slice()
    .sort((a, b) => Number(toDate(b.date || b.createdAt || b.timestamp)) - Number(toDate(a.date || a.createdAt || a.timestamp)))
    .slice(0, 10)

  const safeRailPrevented = analytics.prevented ?? analytics.corrected ?? analytics.rewritten ?? analytics.confidential ?? 0

  function toDate(value: any) {
    if (!value) return new Date(0)
    if (value instanceof Date) return value
    if (typeof value?.toDate === "function") return value.toDate()
    if (typeof value?.seconds === "number") return new Date(value.seconds * 1000)
    return new Date(value)
  }

  function formatIncidentDate(value: any) {
    const date = toDate(value)
    if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "No date"
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)
  }

  function getDonutGradient() {
    if (!ruleSegments.length || !ruleTriggerTotal) return "conic-gradient(rgba(255,255,255,0.08) 0 100%)"

    let cursor = 0
    const colors = ["#34c759", "#ff9f0a", "#ff453a", "#0a84ff", "#af52de", "#64d2ff"]
    const stops = ruleSegments.map((segment, index) => {
      const start = cursor
      const end = cursor + (segment.value / ruleTriggerTotal) * 100
      cursor = end
      return `${colors[index % colors.length]} ${start}% ${end}%`
    })

    return `conic-gradient(${stops.join(", ")})`
  }

  if (!user) {
    return (
      <div className={`theme-${appliedTheme}`} style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--color-bg-dark)", color: "var(--color-text-dark)" }}>
        <div className="card" style={{ width: 400, textAlign: "center" }}>
          <img
            src={bannerImg}
            style={{
              width: "80%",
              marginBottom: 30,
              filter: appliedTheme === "dark" ? "invert(1)" : "none"
            }}
          />
          <h1 style={{ marginBottom: 30, fontSize: 24, fontWeight: 800, color: appliedTheme === "light" ? "#000000" : "#ffffff" }}>Admin Login</h1>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              type="email"
              placeholder="Email"
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="submit" className="btn" style={{ marginTop: 10 }}>Login to Dashboard</button>
          </form>
        </div>
        <style jsx global>{`
          body { background-color: var(--color-bg-dark); }
          .theme-light body { background-color: var(--color-bg-light); }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`theme-${appliedTheme}`} style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-dark)", color: "var(--color-text-dark)", paddingBottom: 60 }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 52 }}>
          <img
            src={bannerImg}
            style={{
              height: 45,
              filter: appliedTheme === "dark" ? "invert(1)" : "none"
            }}
          />
          <button onClick={() => signOut(auth)} className="btn" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "inherit", border: "1px solid var(--color-border-dark)" }}>Logout</button>
        </div>

        <h1 style={{ marginBottom: 10, fontSize: 34, fontWeight: 800, letterSpacing: "-1px" }}>SafeRail Admin Dashboard</h1>
        <br />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ opacity: 0.7, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Total Screened</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>{analytics.scanned}</p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ opacity: 0.7, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Warnings</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--color-warning)", margin: 0 }}>{analytics.warning}</p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ opacity: 0.7, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Violations</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--color-danger)", margin: 0 }}>{analytics.violation}</p>
          </div>
          <div className="card" style={{ padding: 24, background: "linear-gradient(145deg, rgba(52,199,89,0.20), rgba(52,199,89,0.06))", border: "1px solid rgba(52,199,89,0.35)", boxShadow: "0 18px 40px rgba(52,199,89,0.12)" }}>
            <h3 style={{ opacity: 0.92, fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, color: "#34c759" }}>Prevented in Real Time</h3>
            <p style={{ fontSize: 38, fontWeight: 900, color: "#34c759", margin: "0 0 8px" }}>{safeRailPrevented}</p>
            <p style={{ opacity: 0.74, fontSize: 12, lineHeight: 1.45, margin: 0 }}>Messages corrected or rewritten via SafeRail before delivery.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 20, marginBottom: 48 }}>
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "center" }}>
              <div>
                <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Rules Triggered</h2>
                <p style={{ margin: 0, opacity: 0.62, fontSize: 13, lineHeight: 1.5 }}>Composition of configured policy events.</p>
              </div>
              <div style={{ width: 128, height: 128, borderRadius: "50%", background: getDonutGradient(), display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--color-bg-dark)", display: "grid", placeItems: "center", border: "1px solid var(--color-border-dark)" }}>
                  <span style={{ fontWeight: 900, fontSize: 20 }}>{ruleTriggerTotal}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
              {(ruleSegments.length ? ruleSegments : [{ label: "No triggers yet", value: 0 }]).map((segment, index) => {
                const colors = ["#34c759", "#ff9f0a", "#ff453a", "#0a84ff", "#af52de", "#64d2ff"]
                const percent = ruleTriggerTotal ? Math.round((segment.value / ruleTriggerTotal) * 100) : 0
                return (
                  <div key={segment.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                    <span style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: colors[index % colors.length], flex: "0 0 auto", marginTop: 5 }} />
                      <span style={{ wordBreak: "break-word" }}>{segment.label}</span>
                    </span>
                    <strong style={{ flex: "0 0 auto", marginLeft: 8 }}>{segment.value}{ruleTriggerTotal ? ` · ${percent}%` : ""}</strong>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Recent Activity</h2>
            <p style={{ margin: "0 0 20px", opacity: 0.62, fontSize: 13 }}>Latest incidents by user, rule type, severity, and date.</p>
            <div style={{ display: "grid", gap: 12, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
              {recentIncidents.length ? recentIncidents.map((incident, index) => {
                const isViolation = String(incident.severity || incident.type || "").toLowerCase().includes("violation")
                const severityColor = isViolation ? "#ff453a" : "#ff9f0a"
                const severityLabel = isViolation ? "Violation" : "Warning"
                const isExpanded = expandedIncidentId === (incident.id || String(index))
                return (
                  <div key={incident.id || index} style={{ borderBottom: index === recentIncidents.length - 1 ? "none" : "1px solid var(--color-border-dark)", paddingBottom: 4 }}>
                    <div 
                      onClick={() => setExpandedIncidentId(prev => prev === (incident.id || String(index)) ? null : (incident.id || String(index)))}
                      style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr auto", 
                        gap: 14, 
                        alignItems: "center", 
                        padding: "12px 10px", 
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "background-color 0.2s"
                      }}
                      className="incident-row"
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <strong style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{incident.user || incident.email || "Unknown user"}</strong>
                          <span style={{ background: `${severityColor}22`, color: severityColor, border: `1px solid ${severityColor}55`, padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>{severityLabel}</span>
                        </div>
                        <p style={{ margin: 0, opacity: 0.66, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {isExpanded ? "Click to collapse" : (incident.rule || incident.ruleType || "Compliance rule")}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ opacity: 0.62, fontSize: 12 }}>{formatIncidentDate(incident.date || incident.createdAt || incident.timestamp)}</span>
                        <span style={{ 
                          fontSize: 10, 
                          opacity: 0.5, 
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                          display: "inline-block"
                        }}>▶</span>
                      </div>
                    </div>
                    
                    {/* Collapsible Detail Panel */}
                    <div style={{
                      maxHeight: isExpanded ? "250px" : "0px",
                      overflow: "hidden",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      opacity: isExpanded ? 1 : 0,
                      padding: isExpanded ? "12px 16px" : "0px 16px",
                      backgroundColor: appliedTheme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                      borderRadius: "6px",
                      marginTop: isExpanded ? "4px" : "0px",
                      border: isExpanded ? (appliedTheme === 'light' ? '1px solid var(--color-border-light)' : '1px solid var(--color-border-dark)') : 'none',
                      boxShadow: isExpanded ? "inset 0 2px 4px rgba(0,0,0,0.15)" : "none"
                    }}>
                      <div style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 700 }}>Triggered Rule</div>
                      <div style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 600, color: "var(--color-accent)", wordBreak: "break-word" }}>
                        {incident.rule || incident.ruleType || "Unknown compliance rule"}
                      </div>
                      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11, opacity: 0.6 }}>
                        <div><strong>Incident ID:</strong> {incident.id || "N/A"}</div>
                        <div><strong>Triggered At:</strong> {formatIncidentDate(incident.date || incident.createdAt || incident.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div style={{ padding: 24, textAlign: "center", border: "1px dashed var(--color-border-dark)", borderRadius: 16, opacity: 0.7 }}>
                  No recent incidents yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 40 }}>
          <h2 style={{ marginBottom: 32, fontSize: 24, fontWeight: 700 }}>Configuration Management</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 12, fontWeight: 600 }}>Unsafe Domains</h3>
              <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 16 }}>List domains where the overlay should trigger security alerts.</p>
              <textarea
                className="input-field"
                value={unsafeDomains}
                onChange={e => setUnsafeDomains(e.target.value)}
                style={{ height: 350, resize: "vertical" }}
                placeholder="example.com"
              />
            </div>
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 12, fontWeight: 600 }}>Compliance Rules</h3>
              <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 16 }}>Define the custom rules the AI uses to evaluate your text.</p>
              <textarea
                className="input-field"
                value={complianceRules}
                onChange={e => setComplianceRules(e.target.value)}
                style={{ height: 350, resize: "vertical" }}
                placeholder="1. No financial advice..."
              />
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600 }}>Data Leak Filters (Presidio)</h3>
            <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 20 }}>Select entities to ignore during automated analysis.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {PII_TYPES.map(type => (
                <label key={type} style={{
                  background: deniedEntities.includes(type) ? "var(--color-accent)" : "rgba(255,255,255,0.05)",
                  padding: "8px 16px",
                  borderRadius: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  border: "1px solid var(--color-border-dark)"
                }}>
                  <input
                    type="checkbox"
                    hidden
                    checked={deniedEntities.includes(type)}
                    onChange={() => toggleEntity(type)}
                  />
                  {type.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="btn btn-success" style={{ padding: "16px 32px", fontSize: 15 }}>
            Update Configuration
          </button>
        </div>
      </div>
      <style jsx global>{`
        body { margin: 0; }
        .theme-light {
          background-color: var(--color-bg-light) !important;
          color: var(--color-text-light) !important;
        }
        .theme-light [style*="var(--color-bg-dark)"] {
          background-color: var(--color-bg-light) !important;
        }
        .incident-row:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .theme-light .incident-row:hover {
          background-color: rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </div>
  )
}
