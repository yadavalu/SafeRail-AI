import { useState, useEffect } from "react"
import { auth, db } from "../firebase-config"
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore/lite"

import bannerImg from "data-base64:../assets/banner.png"

export default function Dashboard() {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        loadData()
        // Lite doesn't support onSnapshot, so we just load once on login
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
      <div style={{ padding: 40, fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src={bannerImg} style={{ width: 400, marginBottom: 20 }} />
        <h1>Admin Dashboard Login</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10, width: 300 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 8 }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 8 }} />
          <button type="submit" style={{ padding: 10, cursor: "pointer", background: "#007bff", color: "#fff", border: "none" }}>Login</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src={bannerImg} style={{ height: 60 }} />
        <button onClick={() => signOut(auth)}>Logout</button>
      </div>
      
      <h1 style={{ marginTop: 40 }}>SafeRail Admin Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, margin: "20px 0" }}>
        <div style={cardStyle}>
          <h3>Total Screened</h3>
          <p style={statStyle}>{analytics.scanned}</p>
        </div>
        <div style={cardStyle}>
          <h3>Warnings</h3>
          <p style={statStyle}>{analytics.warning}</p>
        </div>
        <div style={cardStyle}>
          <h3>Violations</h3>
          <p style={statStyle}>{analytics.violation}</p>
        </div>
        <div style={cardStyle}>
          <h3>Data Leaks</h3>
          <p style={statStyle}>{analytics.confidential}</p>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Edit Configuration</h2>
        <div style={{ display: "flex", gap: 40 }}>
          <div style={{ flex: 1 }}>
            <h3>Unsafe Domains (one per line)</h3>
            <textarea 
              value={unsafeDomains} 
              onChange={e => setUnsafeDomains(e.target.value)} 
              style={{ width: "100%", height: 300, padding: 10 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h3>Compliance Rules</h3>
            <textarea 
              value={complianceRules} 
              onChange={e => setComplianceRules(e.target.value)} 
              style={{ width: "100%", height: 300, padding: 10 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <h3>Disabled Data Leak Checks (Presidio)</h3>
          <p style={{ color: "#666", fontSize: 14 }}>Select entities you want to IGNORE during analysis.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {PII_TYPES.map(type => (
              <label key={type} style={{ background: "#eee", padding: "5px 10px", borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <input 
                  type="checkbox" 
                  checked={deniedEntities.includes(type)} 
                  onChange={() => toggleEntity(type)}
                />
                {type.replace(/_/g, " ")}
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleSave} style={{ marginTop: 20, padding: "12px 24px", background: "#28a745", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>
          Save Configuration
        </button>
      </div>
    </div>
  )
}

const cardStyle = {
  background: "#f8f9fa",
  padding: 20,
  borderRadius: 10,
  textAlign: "center" as const,
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
}

const statStyle = {
  fontSize: 32,
  fontWeight: "bold",
  margin: "10px 0",
  color: "#007bff"
}
