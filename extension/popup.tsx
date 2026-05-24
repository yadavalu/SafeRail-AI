import { useStorage } from "@plasmohq/storage/hook"
import { useState, useEffect } from "react"
import "./style.css"
import bannerImg from "data-base64:./assets/banner_transparent.png"

function IndexPopup() {
  const [theme, setTheme] = useStorage("theme", "system")
  const [llmEndpoint, setLlmEndpoint] = useStorage("llmEndpoint", "http://localhost:3000/evaluate")
  const [llmRewriteEndpoint, setLlmRewriteEndpoint] = useStorage("llmRewriteEndpoint", "http://localhost:3000/rewrite")
  const [presidioEndpoint, setPresidioEndpoint] = useStorage("presidioEndpoint", "http://localhost:3000/analyze")

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
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>LLM Evaluate Endpoint</label>
          <input 
            type="text"
            className="input-field"
            value={llmEndpoint}
            onChange={(e) => setLlmEndpoint(e.target.value)}
            placeholder="http://localhost:3000/evaluate"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>LLM Rewrite Endpoint</label>
          <input 
            type="text"
            className="input-field"
            value={llmRewriteEndpoint}
            onChange={(e) => setLlmRewriteEndpoint(e.target.value)}
            placeholder="http://localhost:3000/rewrite"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Presidio Endpoint</label>
          <input 
            type="text"
            className="input-field"
            value={presidioEndpoint}
            onChange={(e) => setPresidioEndpoint(e.target.value)}
            placeholder="http://localhost:3000/analyze"
          />
        </div>

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
