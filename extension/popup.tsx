import { useStorage } from "@plasmohq/storage/hook"
import { useState, useEffect } from "react"
import "./style.css"
import bannerImg from "data-base64:./assets/banner_transparent.png"

function IndexPopup() {
  const [theme, setTheme] = useStorage("theme", "system")
  const [modelType, setModelType] = useStorage("modelType", "gemini")
  const [baseHost, setBaseHost] = useStorage("baseHost", "https://llm.safeseal.xyz")
  const [ollamaEndpoint, setOllamaEndpoint] = useStorage("ollamaEndpoint", "https://llm.safeseal.xyz/gemini/chat")
  const [presidioEndpoint, setPresidioEndpoint] = useStorage("presidioEndpoint", "https://llm.safeseal.xyz/analyze")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Determine actual theme
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemTheme(mediaQuery.matches ? "dark" : "light")
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light")
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  const handleBaseHostChange = (newHost: string) => {
    setBaseHost(newHost)
    updateEndpoints(newHost, modelType)
  }

  const handleModelChange = (newModel: string) => {
    setModelType(newModel)
    updateEndpoints(baseHost, newModel)
  }

  const updateEndpoints = (host: string, model: string) => {
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1") || !host.startsWith("http")
    const cleanHost = host.replace(/\/$/, "")

    if (model === "gemini") {
      const targetPath = isLocal ? `${cleanHost}:3000/gemini/chat` : `${cleanHost}/gemini/chat`
      setOllamaEndpoint(targetPath)
    } else {
      const targetPath = isLocal ? `${cleanHost}:11434/api/chat` : `${cleanHost}/api/chat`
      setOllamaEndpoint(targetPath)
    }

    const presidioPath = isLocal ? `${cleanHost}:3000/analyze` : `${cleanHost}/analyze`
    setPresidioEndpoint(presidioPath)
  }

  const appliedTheme = theme === "system" ? systemTheme : theme

  return (
    <div className={`theme-${appliedTheme}`} style={{ padding: 20, minWidth: 340, backgroundColor: 'var(--color-bg-dark)', color: 'var(--color-text-dark)', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <div className="card" style={{ border: 'none', boxShadow: 'none', backgroundColor: 'transparent', padding: 0 }}>
        <img 
          src={bannerImg} 
          style={{ 
            width: '100%', 
            marginBottom: 24,
            filter: appliedTheme === "dark" ? "invert(1)" : "none"
          }} 
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Theme</label>
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              className="input-field"
              style={{ cursor: 'pointer', fontSize: 12 }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Model</label>
            <select 
              value={modelType} 
              onChange={(e) => handleModelChange(e.target.value)}
              className="input-field"
              style={{ cursor: 'pointer', fontSize: 12 }}
            >
              <option value="gemini">Gemini</option>
              <option value="llama">Llama</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 10, fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Endpoint Host</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <select 
              className="input-field"
              style={{ flex: '0 0 90px', fontSize: 11, cursor: 'pointer', padding: '10px 4px' }}
              onChange={(e) => handleBaseHostChange(e.target.value)}
              value={["https://llm.safeseal.xyz", "http://localhost"].includes(baseHost) ? baseHost : "custom"}
            >
              <option value="https://llm.safeseal.xyz">Cloud</option>
              <option value="http://localhost">Local</option>
              <option value="custom">Custom</option>
            </select>
            <input 
              type="text"
              className="input-field"
              value={baseHost}
              onChange={(e) => handleBaseHostChange(e.target.value)}
              placeholder="http://localhost"
              style={{ flex: 1, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ 
              cursor: 'pointer', 
              fontSize: 13, 
              fontWeight: 600, 
              opacity: 0.6, 
              display: 'flex', 
              alignItems: 'center',
              userSelect: 'none'
            }}
          >
            <span style={{ 
              display: 'inline-block', 
              transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              marginRight: 8,
              fontSize: 10
            }}>▶</span>
            Advanced Endpoints
          </div>
          
          {showAdvanced && (
            <div style={{ 
              paddingLeft: 14, 
              borderLeft: '2px solid var(--color-border-dark)', 
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginTop: 16
            }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 11, opacity: 0.7 }}>Ollama / Gemini Endpoint</label>
                <input 
                  type="text"
                  className="input-field"
                  style={{ padding: '8px 10px', fontSize: 12 }}
                  value={ollamaEndpoint}
                  onChange={(e) => setOllamaEndpoint(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 11, opacity: 0.7 }}>Presidio Endpoint</label>
                <input 
                  type="text"
                  className="input-field"
                  style={{ padding: '8px 10px', fontSize: 12 }}
                  value={presidioEndpoint}
                  onChange={(e) => setPresidioEndpoint(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <button 
            className="btn" 
            onClick={() => window.open("tabs/dashboard.html", "_blank")}
            style={{ width: '100%', padding: '12px', fontSize: 14 }}
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
