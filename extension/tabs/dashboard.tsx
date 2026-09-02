import { useState, useEffect } from "react"
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
  const [baseHost] = useStorage("baseHost", "https://llm.safeseal.xyz")
  const [user, setUser] = useStorage<{ email: string; token: string; isAdmin?: boolean; role?: string; name?: string } | null>("adminUser", null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null)

  const [unsafeDomains, setUnsafeDomains] = useState("")
  const [complianceRules, setComplianceRules] = useState("")
  const [deniedEntities, setDeniedEntities] = useState<string[]>([])
  
  const [view, setView] = useState<"dashboard" | "create-rule" | "edit-rule">("dashboard")
  const [rulesList, setRulesList] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  
  // Create / Edit rule form state
  const [ruleId, setRuleId] = useState("")
  const [ruleTitle, setRuleTitle] = useState("")
  const [ruleBody, setRuleBody] = useState("")
  const [ruleAppliedTo, setRuleAppliedTo] = useState<"all" | string[]>("all")
  const [ruleExternalOnly, setRuleExternalOnly] = useState(false)
  const [ruleStatus, setRuleStatus] = useState<"active" | "inactive">("active")
  
  // Dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // New employee form state
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false)
  const [newEmployeeName, setNewEmployeeName] = useState("")
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("")
  const [newEmployeeRole, setNewEmployeeRole] = useState("")

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
    if (user) {
      loadData()
      loadAnalytics()
    }
  }, [user])

  const loadAnalytics = async () => {
    if (!user) return
    try {
      const cleanHost = baseHost.replace(/\/$/, "")
      const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1") || !cleanHost.startsWith("http")
      const analyticsUrl = isLocal ? `${cleanHost}:3000/api/analytics` : `${cleanHost}/api/analytics`

      const res = await fetch(analyticsUrl, {
        headers: {
          "Authorization": `Bearer ${user.token}`
        }
      })
      
      let data = null
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      }
      
      if (!res.ok) {
        throw new Error((data && data.error) || `Server error: ${res.status} ${res.statusText}`)
      }
      if (data) {
        setAnalytics(prev => ({ ...prev, ...data }))
      }
    } catch (e) {
      console.error("Analytics load error:", e)
    }
  }

  const loadData = async () => {
    if (!user) return
    try {
      const cleanHost = baseHost.replace(/\/$/, "")
      const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1") || !cleanHost.startsWith("http")
      const configUrl = isLocal ? `${cleanHost}:3000/api/config/settings` : `${cleanHost}/api/config/settings`

      const res = await fetch(configUrl)
      
      let data = null
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      }

      if (!res.ok) {
        throw new Error((data && data.error) || `Server error: ${res.status} ${res.statusText}`)
      }
      if (data) {
        setUnsafeDomains(data.unsafe_domains || "")
        setComplianceRules(data.compliance_rules || "")
        setDeniedEntities(data.denied_entities || [])
        setRulesList(data.rules_list || [])
        
        const defaultEmployees = [
          { name: "Alicia Johnson", email: "alicia.johnson@company.com" },
          { name: "Michael Chen", email: "michael.chen@company.com" },
          { name: "Sarah Williams", email: "sarah.williams@company.com" },
          { name: "David Kim", email: "david.kim@company.com" },
          { name: "Priya Patel", email: "priya.patel@company.com" },
          { name: "James Thompson", email: "james.thompson@company.com" }
        ]
        const loadedEmployees = data.employees && data.employees.length > 0 ? data.employees : defaultEmployees
        setEmployees(loadedEmployees)
      }
    } catch (e) {
      console.error("Config load error:", e)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const cleanHost = baseHost.replace(/\/$/, "")
      const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1") || !cleanHost.startsWith("http")
      const loginUrl = isLocal ? `${cleanHost}:3000/api/auth/login` : `${cleanHost}/api/auth/login`

      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      
      let data = null
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      }

      if (!res.ok) {
        throw new Error((data && data.error) || `Server error: ${res.status} ${res.statusText}`)
      }
      if (!data || !data.idToken) {
        throw new Error("Invalid server response: missing identity token")
      }
      const loggedInUser = { email: data.email, token: data.idToken, ...data.user }
      setUser(loggedInUser)
    } catch (err) {
      alert("Login failed: " + err.message)
    }
  }

  const handleSave = async (updatedRulesList?: any[], updatedEmployees?: any[]) => {
    if (!user) return
    try {
      const cleanHost = baseHost.replace(/\/$/, "")
      const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1") || !cleanHost.startsWith("http")
      const configUrl = isLocal ? `${cleanHost}:3000/api/config/settings` : `${cleanHost}/api/config/settings`

      const rulesToSave = updatedRulesList !== undefined ? updatedRulesList : rulesList
      const employeesToSave = updatedEmployees !== undefined ? updatedEmployees : employees

      const res = await fetch(configUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({
          unsafe_domains: unsafeDomains,
          compliance_rules: complianceRules,
          denied_entities: deniedEntities,
          rules_list: rulesToSave,
          employees: employeesToSave
        })
      })
      
      let data = null
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      }

      if (!res.ok) {
        throw new Error((data && data.error) || `Server error: ${res.status} ${res.statusText}`)
      }
      
      if (updatedRulesList !== undefined) setRulesList(updatedRulesList)
      if (updatedEmployees !== undefined) setEmployees(updatedEmployees)
      
      if (data) {
        await loadData()
      }
    } catch (err) {
      alert("Save failed: " + err.message)
    }
  }

  const openCreateRule = () => {
    setRuleId("")
    setRuleTitle("")
    setRuleBody("")
    setRuleAppliedTo("all")
    setRuleExternalOnly(false)
    setRuleStatus("active")
    setView("create-rule")
  }

  const openEditRule = (rule: any) => {
    setRuleId(rule.id)
    setRuleTitle(rule.title)
    setRuleBody(rule.rule)
    setRuleAppliedTo(rule.appliedTo || "all")
    setRuleExternalOnly(rule.externalOnly || false)
    setRuleStatus(rule.status || "active")
    setView("edit-rule")
  }

  const handleSaveRule = async () => {
    if (!ruleTitle.trim() || !ruleBody.trim()) {
      alert("Title and Rule description are required.")
      return
    }

    let updatedList = [...rulesList]
    if (ruleId) {
      updatedList = updatedList.map(r => r.id === ruleId ? {
        ...r,
        title: ruleTitle,
        rule: ruleBody,
        appliedTo: ruleAppliedTo,
        externalOnly: ruleExternalOnly,
        status: ruleStatus
      } : r)
    } else {
      const newRule = {
        id: Math.random().toString(36).substring(2, 9),
        title: ruleTitle,
        rule: ruleBody,
        appliedTo: ruleAppliedTo,
        externalOnly: ruleExternalOnly,
        status: ruleStatus
      }
      updatedList.push(newRule)
    }

    await handleSave(updatedList, employees)
    setView("dashboard")
  }

  const handleDeleteRule = async () => {
    if (!ruleId) return
    if (!window.confirm("Are you sure you want to delete this rule?")) return
    const updatedList = rulesList.filter(r => r.id !== ruleId)
    await handleSave(updatedList, employees)
    setView("dashboard")
  }

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim() || !newEmployeeRole.trim()) {
      alert("Name, Email, and Role are required.")
      return
    }
    const newEmp = {
      name: newEmployeeName.trim(),
      email: newEmployeeEmail.trim(),
      role: newEmployeeRole.trim(),
      isAdmin: false
    }
    const updatedEmployees = [...employees, newEmp]
    await handleSave(rulesList, updatedEmployees)
    
    if (Array.isArray(ruleAppliedTo) && !ruleAppliedTo.includes(newEmp.email)) {
      setRuleAppliedTo([...ruleAppliedTo, newEmp.email])
    }

    setNewEmployeeName("")
    setNewEmployeeEmail("")
    setNewEmployeeRole("")
    setShowAddEmployeeForm(false)
  }

  const renderRuleFormView = () => {
    const isAllSelected = ruleAppliedTo === "all"
    
    return (
      <div className={`theme-${appliedTheme}`} style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-dark)", color: "var(--color-text-dark)", padding: "40px 20px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <button 
                onClick={() => setView("dashboard")}
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "var(--color-accent)", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: 0
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text-dark)" }}>
                {ruleId ? "Edit Rule" : "Create New Rule"}
              </h1>
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              {ruleId && (
                <button 
                  onClick={handleDeleteRule} 
                  className="btn" 
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: "transparent", 
                    color: "#d32f2f", 
                    border: "1px solid #ffcdd2",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Rule
                </button>
              )}
              <button 
                onClick={handleSaveRule} 
                className="btn btn-success" 
                style={{ 
                  padding: "8px 24px", 
                  borderRadius: 6, 
                  fontWeight: 600, 
                  fontSize: 14, 
                  backgroundColor: "#0a58ca", 
                  color: "#fff", 
                  border: "none" 
                }}
              >
                Save Rule
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 28 }}>
            
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Title <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={ruleTitle} 
                onChange={e => setRuleTitle(e.target.value)} 
                placeholder="Enter rule title"
                style={{ fontSize: 15, padding: "12px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Rule <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <textarea 
                className="input-field" 
                value={ruleBody} 
                onChange={e => setRuleBody(e.target.value)} 
                placeholder="Enter the rule details or conditions"
                style={{ height: 120, fontSize: 15, padding: "12px", resize: "vertical" }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Applied To <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              
              <div 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  borderRadius: dropdownOpen ? "8px 8px 0 0" : 8,
                  border: "1px solid var(--color-border-dark)",
                  borderBottom: dropdownOpen ? "none" : "1px solid var(--color-border-dark)",
                  cursor: "pointer",
                  backgroundColor: appliedTheme === "light" ? "#ffffff" : "#2c2c2e"
                }}
              >
                <span style={{ fontSize: 14, opacity: 0.9 }}>
                  Select who this rule applies to
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              {dropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  borderRadius: "0 0 8px 8px",
                  border: "1px solid var(--color-border-dark)",
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                  backgroundColor: appliedTheme === "light" ? "#ffffff" : "#1c1c1e",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  maxHeight: 360,
                  overflowY: "auto",
                  padding: "16px 20px"
                }}>
                  
                  <label style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: 12, 
                    cursor: "pointer",
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--color-border-dark)",
                    marginBottom: 16
                  }}>
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={() => {
                        if (isAllSelected) {
                          setRuleAppliedTo([])
                        } else {
                          setRuleAppliedTo("all")
                        }
                      }}
                      style={{ marginTop: 4, width: 16, height: 16, accentColor: "#0a58ca" }}
                    />
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7, marginTop: 2 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>All Employees</div>
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Apply this rule to everyone in the organization.</div>
                      </div>
                    </div>
                  </label>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Separate Employees</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>Apply this rule to specific employees.</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {employees.map(emp => {
                        const isChecked = !isAllSelected && Array.isArray(ruleAppliedTo) && ruleAppliedTo.includes(emp.email)
                        
                        return (
                          <label key={emp.email} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                            <input 
                              type="checkbox" 
                              disabled={isAllSelected}
                              checked={isChecked}
                              onChange={() => {
                                if (isAllSelected) return
                                const current = Array.isArray(ruleAppliedTo) ? ruleAppliedTo : []
                                if (current.includes(emp.email)) {
                                  setRuleAppliedTo(current.filter(email => email !== emp.email))
                                } else {
                                  setRuleAppliedTo([...current, emp.email])
                                }
                              }}
                              style={{ width: 16, height: 16, accentColor: "#0a58ca", marginTop: 2 }}
                            />
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", opacity: isAllSelected ? 0.4 : 1 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7, marginTop: 1 }}>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                                <div style={{ fontSize: 12, opacity: 0.6 }}>{emp.email}</div>
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {!showAddEmployeeForm ? (
                    <button 
                      onClick={() => setShowAddEmployeeForm(true)}
                      style={{ 
                        background: "none", 
                        border: "none", 
                        color: "var(--color-accent)", 
                        cursor: "pointer", 
                        fontSize: 13, 
                        fontWeight: 600,
                        padding: 0
                      }}
                    >
                      + Add another employee
                    </button>
                  ) : (
                    <div style={{ 
                      marginTop: 12, 
                      padding: 12, 
                      border: "1px dashed var(--color-border-dark)", 
                      borderRadius: 6,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10 
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>New Employee Details</div>
                      <input 
                        type="text" 
                        placeholder="Name" 
                        className="input-field" 
                        value={newEmployeeName}
                        onChange={e => setNewEmployeeName(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: 13 }}
                      />
                      <input 
                        type="email" 
                        placeholder="Email" 
                        className="input-field" 
                        value={newEmployeeEmail}
                        onChange={e => setNewEmployeeEmail(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: 13 }}
                      />
                      <input 
                        type="text" 
                        placeholder="Role (e.g. Sales)" 
                        className="input-field" 
                        value={newEmployeeRole}
                        onChange={e => setNewEmployeeRole(e.target.value)}
                        style={{ padding: "6px 10px", fontSize: 13 }}
                      />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button 
                          onClick={() => setShowAddEmployeeForm(false)}
                          className="btn" 
                          style={{ padding: "4px 8px", fontSize: 12, backgroundColor: "transparent", border: "1px solid var(--color-border-dark)" }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleAddEmployee}
                          className="btn btn-success" 
                          style={{ padding: "4px 10px", fontSize: 12 }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                Trigger only when recipient is external
                <span 
                  title="If active, this rule will only be checked when emails are sent to recipient domains different from yours." 
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    width: 16, 
                    height: 16, 
                    borderRadius: "50%", 
                    border: "1px solid currentColor", 
                    fontSize: 10, 
                    cursor: "help",
                    opacity: 0.5
                  }}
                >
                  i
                </span>
              </div>
            </div>
            <div>
              <label style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ position: "relative", width: 44, height: 24 }}>
                  <input 
                    type="checkbox" 
                    checked={ruleExternalOnly}
                    onChange={e => setRuleExternalOnly(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: ruleExternalOnly ? "#0a58ca" : "#e0e0e0",
                    transition: "0.3s",
                    borderRadius: 24
                  }}>
                    <span style={{
                      position: "absolute",
                      content: "''",
                      height: 20, width: 20,
                      left: ruleExternalOnly ? 22 : 2,
                      bottom: 2,
                      backgroundColor: "white",
                      transition: "0.3s",
                      borderRadius: "50%",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {ruleExternalOnly ? "On" : "Off"}
                </span>
              </label>
            </div>



          </div>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    setUser(null)
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

  if (view === "create-rule" || view === "edit-rule") {
    return renderRuleFormView()
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
          <button onClick={handleLogout} className="btn" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "inherit", border: "1px solid var(--color-border-dark)" }}>Logout</button>
        </div>

        <h1 style={{ marginBottom: 10, fontSize: 34, fontWeight: 800, letterSpacing: "-1px" }}>{user.isAdmin ? "SafeRail Admin Dashboard" : "SafeRail Employee Dashboard"}</h1>
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
            <p style={{ margin: "0 0 20px", opacity: 0.62, fontSize: 13 }}>Latest incidents by rule, severity, and date.</p>
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
                          <span style={{ background: `${severityColor}22`, color: severityColor, border: `1px solid ${severityColor}55`, padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.4px" }}>{severityLabel}</span>
                          <strong style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {incident.rule || incident.ruleType || "Compliance rule"}
                          </strong>
                        </div>
                        <p style={{ margin: 0, opacity: 0.66, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {isExpanded ? "Click to collapse" : "Click to view details"}
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

        {user.isAdmin && (
        <div className="card" style={{ padding: 40, marginBottom: 40 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Compliance Rules</h3>
                <button 
                  onClick={openCreateRule} 
                  className="btn" 
                  style={{ padding: "6px 12px", fontSize: 13, borderRadius: 6 }}
                >
                  + Create Rule
                </button>
              </div>
              <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 16 }}>Define the custom rules the AI uses to evaluate your text.</p>
              
              <div style={{ 
                border: "1px solid var(--color-border-dark)", 
                borderRadius: 8, 
                maxHeight: 350,
                overflowY: "auto",
                backgroundColor: appliedTheme === "light" ? "#fbfbfc" : "rgba(255,255,255,0.02)" 
              }}>
                {rulesList.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", opacity: 0.5, fontSize: 14 }}>
                    No rules configured. Click "+ Create Rule" to add one.
                  </div>
                ) : (
                  rulesList.map((r, index) => {
                    const isAll = r.appliedTo === "all"
                    let appliedText = "All Employees"
                    if (!isAll && Array.isArray(r.appliedTo)) {
                      const names = r.appliedTo.map((email: string) => {
                        const emp = employees.find(e => e.email === email)
                        return emp ? emp.name : email
                      })
                      if (names.length <= 2) {
                        appliedText = names.join(", ")
                      } else {
                        appliedText = names.slice(0, 2).join(", ") + ` +${names.length - 2}`
                      }
                    }

                    return (
                      <div 
                        key={r.id || index} 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "16px 20px", 
                          borderBottom: index === rulesList.length - 1 ? "none" : "1px solid var(--color-border-dark)",
                          gap: 16
                        }}
                      >
                        <div style={{ flex: "2", minWidth: 0, fontWeight: 600, fontSize: 14 }}>
                          {r.title || "Untitled Rule"}
                        </div>

                        <div style={{ flex: "2", display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.8, minWidth: 0 }}>
                          {isAll ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                              All Employees
                            </span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={appliedText}>
                                {appliedText.split(" +")[0]}
                              </span>
                              {appliedText.includes(" +") && (
                                <span style={{ 
                                  backgroundColor: "rgba(0,0,0,0.05)", 
                                  padding: "2px 6px", 
                                  borderRadius: 12, 
                                  fontSize: 11,
                                  fontWeight: 600,
                                  flexShrink: 0 
                                }}>
                                  +{appliedText.split(" +")[1]}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: "1", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
                          <span style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: "50%", 
                            backgroundColor: r.status === "inactive" ? "#ff3b30" : "#34c759",
                            boxShadow: r.status === "inactive" ? "0 0 0 2px rgba(255,59,48,0.2)" : "0 0 0 2px rgba(52,199,89,0.2)"
                          }} />
                          {r.status === "inactive" ? "Inactive" : "Active"}
                        </div>
                        
                        <div style={{ flexShrink: 0 }}>
                          <button 
                            onClick={() => openEditRule(r)} 
                            className="btn" 
                            style={{ 
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 16px", 
                              fontSize: 13,
                              fontWeight: 600,
                              borderRadius: 6,
                              backgroundColor: "transparent",
                              color: "var(--color-accent)",
                              border: "1px solid var(--color-border-dark)"
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            Edit
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Employee Directory</h3>
            </div>
            <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 16 }}>List of employees in the database.</p>
            <div style={{ 
              border: "1px solid var(--color-border-dark)", 
              borderRadius: 8, 
              maxHeight: 350,
              overflowY: "auto",
              backgroundColor: appliedTheme === "light" ? "#fbfbfc" : "rgba(255,255,255,0.02)" 
            }}>
              {employees.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", opacity: 0.5, fontSize: 14 }}>
                  No employees found.
                </div>
              ) : (
                employees.map((emp, index) => (
                  <div key={emp.email} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: index === employees.length - 1 ? "none" : "1px solid var(--color-border-dark)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>{emp.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {emp.isAdmin && (
                        <div style={{ fontSize: 12, opacity: 0.8, backgroundColor: "#d32f2f", color: "#fff", padding: "4px 8px", borderRadius: 4, height: "fit-content" }}>
                          Admin
                        </div>
                      )}
                      <div style={{ fontSize: 12, opacity: 0.8, backgroundColor: "var(--color-accent)", color: "#fff", padding: "4px 8px", borderRadius: 4, height: "fit-content" }}>
                        {emp.role || "Employee"}
                      </div>
                    </div>
                  </div>
                ))
              )}
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

          <button onClick={() => handleSave()} className="btn btn-success" style={{ padding: "16px 32px", fontSize: 15 }}>
            Update Configuration
          </button>
        </div>
        )}
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
