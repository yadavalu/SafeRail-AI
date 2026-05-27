import { useStorage } from "@plasmohq/storage/hook"
import { useState, useEffect } from "react"
import "./style.css"
import bannerImg from "data-base64:./assets/banner_transparent.png"

function IndexPopup() {
  const [theme, setTheme] = useStorage("theme", "system")
  const [baseSite, setBaseSite] = useStorage("baseSite", "https://llm.safeseal.xyz")
  const [llmEndpoint, setLlmEndpoint] = useStorage("llmEndpoint", "https://llm.safeseal.xyz/evaluate")
  const [llmRewriteEndpoint, setLlmRewriteEndpoint] = useStorage("llmRewriteEndpoint", "https://llm.safeseal.xyz/rewrite")
  const [presidioEndpoint, setPresidioEndpoint] = useStorage("presidioEndpoint", "https://llm.safeseal.xyz/analyze")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Sync advanced endpoints when baseSite changes, but only if they follow the default pattern
  useEffect(() => {
    const cleanBase = baseSite.replace(/\/$/, "") // Remove trailing slash
    if (cleanBase && !showAdvanced) {
      setLlmEndpoint(`${cleanBase}/evaluate`)
      setLlmRewriteEndpoint(`${cleanBase}/rewrite`)
      setPresidioEndpoint(`${cleanBase}/analyze`)
    }
  }, [baseSite])

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

  return (
    <div className={`theme-${appliedTheme}`} style={{ padding: 16, minWidth: 320, backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text-dark)', height: '100%' }}>
      <div className="card" style={{ border: 'none', boxShadow: 'none', backgroundColor: 'transparent', padding: 0 }}>
        <img 
          src={bannerImg} 
          style={{ 
            width: '100%', 
            marginBottom: 20,
            filter: appliedTheme === "dark" ? "invert(1)" : "none"
          }} 
        />
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Theme Mode</label>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            className="input-field"
            style={{ cursor: 'pointer' }}
          >
            <option value="system">System Default</option>
            <option value="light">Light Mode</option>
            <option value="dark">Dark Mode</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Base Site (Endpoint Host)</label>
          <input 
            type="text"
            className="input-field"
            list="base-site-defaults"
            value={baseSite}
            onChange={(e) => setBaseSite(e.target.value)}
            placeholder="https://llm.safeseal.xyz"
          />
          <datalist id="base-site-defaults">
            <option value="http://localhost:3000" />
            <option value="https://llm.safeseal.xyz" />
          </datalist>
        </div>

        <div style={{ marginBottom: 16 }}>
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-primary)', 
              fontSize: 12, 
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: 0.8
            }}
          >
            {showAdvanced ? "▼ Hide Advanced Endpoints" : "▶ Show Advanced Endpoints"}
          </button>
        </div>

        {showAdvanced && (
          <div style={{ padding: '0 8px 16px 8px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 11, opacity: 0.6 }}>Evaluate Endpoint</label>
              <input 
                type="text"
                className="input-field"
                style={{ fontSize: 11, padding: '6px 10px' }}
                value={llmEndpoint}
                onChange={(e) => setLlmEndpoint(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 11, opacity: 0.6 }}>Rewrite Endpoint</label>
              <input 
                type="text"
                className="input-field"
                style={{ fontSize: 11, padding: '6px 10px' }}
                value={llmRewriteEndpoint}
                onChange={(e) => setLlmRewriteEndpoint(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 11, opacity: 0.6 }}>Presidio Endpoint</label>
              <input 
                type="text"
                className="input-field"
                style={{ fontSize: 11, padding: '6px 10px' }}
                value={presidioEndpoint}
                onChange={(e) => setPresidioEndpoint(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button 
            className="btn" 
            onClick={() => window.open("tabs/dashboard.html", "_blank")}
            style={{ width: '100%' }}
          >
            Open Admin Dashboard
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .theme-light {
          background-color: var(--color-bg-light) !important;
          color: var(--color-text-light) !important;
        }
      `}</style>
    </div>
  )
}

export default IndexPopup
