import { useStorage } from "@plasmohq/storage/hook"

function IndexPopup() {
  const [theme, setTheme] = useStorage("theme", "system")

  return (
    <div
      style={{
        padding: 16,
        minWidth: 200,
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

      <a href="tabs/dashboard.html" target="_blank" style={{ color: "#007bff", textDecoration: "none", fontSize: "14px" }}>
        Open Admin Dashboard
      </a>
    </div>
  )
}

export default IndexPopup
