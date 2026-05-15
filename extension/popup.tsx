import { useStorage } from "@plasmohq/storage/hook"

function IndexPopup() {
  const [theme, setTheme] = useStorage("theme", "system")
  const [ollamaEndpoint, setOllamaEndpoint] = useStorage("ollamaEndpoint", "http://localhost:11434/api/chat")
  const [presidioEndpoint, setPresidioEndpoint] = useStorage("presidioEndpoint", "http://localhost:3000/analyze")

  return (
    <div
      style={{
        padding: 16,
        minWidth: 300,
        fontFamily: "sans-serif"
      }}>
      <h2 style={{ marginBottom: 12 }}>SafeRail AI</h2>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>Theme Mode</label>
        <select 
          value={theme} 
          onChange={(e) => setTheme(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc"
          }}
        >
          <option value="system">System</option>
          <option value="light">Light (White)</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Ollama Endpoint</label>
        <input 
          type="text"
          value={ollamaEndpoint}
          onChange={(e) => setOllamaEndpoint(e.target.value)}
          placeholder="http://localhost:11434/api/chat"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>Presidio Endpoint</label>
        <input 
          type="text"
          value={presidioEndpoint}
          onChange={(e) => setPresidioEndpoint(e.target.value)}
          placeholder="http://localhost:3000/analyze"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <a href="tabs/dashboard.html" target="_blank" style={{ color: "#007bff", textDecoration: "none", fontSize: "14px" }}>
          Open Admin Dashboard
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
