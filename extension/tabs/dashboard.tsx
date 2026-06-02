import { useState, useEffect } from "react"
import { auth, db } from "../firebase-config"
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore/lite"
import { useStorage } from "@plasmohq/storage/hook"
import "../style.css"

import bannerImg from "data-base64:../assets/banner_transparent.png"

export default function Dashboard() {
  const [theme] = useStorage("theme", "system")
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const [unsafeDomains, setUnsafeDomains] = useState("")
  const [complianceRules, setComplianceRules] = useState("")
  const [deniedEntities, setDeniedEntities] = useState<string[]>([])
  const [analytics, setAnalytics] = useState({
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
        if (d.exists()) setAnalytics(d.data() as any)
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
    "IP_ADDRESS", "CREDIT_CARD", "CRYPTO", "US_SSN", "IBAN_CODE"
  ]

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
          <h1 style={{ marginBottom: 30, fontSize: 24, fontWeight: 800 }}>Admin Login</h1>
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 60 }}>
          <img 
            src={bannerImg} 
            style={{ 
                height: 45,
                filter: appliedTheme === "dark" ? "invert(1)" : "none"
            }} 
          />
          <button onClick={() => signOut(auth)} className="btn" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "inherit", border: "1px solid var(--color-border-dark)" }}>Logout</button>
        </div>
        
        <h1 style={{ marginBottom: 40, fontSize: 32, fontWeight: 800, letterSpacing: "-1px" }}>SafeRail Admin Dashboard</h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 60 }}>
          <div className="card">
            <h3 style={{ opacity: 0.7, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Total Screened</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>{analytics.scanned}</p>
          </div>
          <div className="card">
            <h3 style={{ opacity: 0.7, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Warnings</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--color-warning)", margin: 0 }}>{analytics.warning}</p>
          </div>
          <div className="card">
            <h3 style={{ opacity: 0.7, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Violations</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "var(--color-danger)", margin: 0 }}>{analytics.violation}</p>
          </div>
          <div className="card">
            <h3 style={{ opacity: 0.7, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Data Leaks</h3>
            <p style={{ fontSize: 36, fontWeight: 800, color: "#af52de", margin: 0 }}>{analytics.confidential}</p>
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
      `}</style>
    </div>
  )
}
