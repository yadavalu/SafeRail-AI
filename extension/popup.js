async function getApiKey() {
  const response = await fetch('.env');
  const text = await response.text();
  const lines = text.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts[0] === 'GEMINI_API_KEY') {
      return parts[1].replace(/"/g, '');
    }
  }
  return null;
}

document.getElementById("checkBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  const loader = document.getElementById("loader");
  
  // Reset UI
  resultDiv.innerHTML = "";
  loader.style.display = "block";

  const GEMINI_API_KEY = await getApiKey();
  if (!GEMINI_API_KEY) {
    loader.style.display = "none";
    resultDiv.innerHTML = "<span style='color:red'>API key not found.</span>";
    return;
  }
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  // 1. Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 2. Ask content.js to scrape the email
  chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_EMAIL" }, async (response) => {
    
    if (!response || !response.body || response.body === "[No Body Found]") {
      loader.style.display = "none";
      resultDiv.innerHTML = "<span style='color:red'>Could not find email draft. Make sure you are in the composition window.</span>";
      return;
    }

    // 3. Prepare Prompt for Gemini
    const prompt = `
      You are a corporate communication expert. Analyze the following email draft for professionalism, tone, and aggression.
      
      Subject: ${response.subject}
      Body: ${response.body}

      Return your response in this specific format:
      VERDICT: [PASS or FAIL]
      REASON: [Brief explanation]
      SUGGESTION: [One sentence on how to fix it, if failed]
    `;

    try {
      // 4. Call Gemini API
      const apiResponse = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await apiResponse.json();
      const rawText = data.candidates[0].content.parts[0].text;

      // 5. Display Result
      loader.style.display = "none";
      
      // Simple formatting for the display
      const formattedText = rawText
        .replace("VERDICT: PASS", "<div class='status-pass'>✅ TONE LOOKS GOOD</div>")
        .replace("VERDICT: FAIL", "<div class='status-fail'>⚠️ TONE ISSUES DETECTED</div>")
        .replace(/\n/g, "<br>"); // Replace newlines with breaks

      resultDiv.innerHTML = formattedText;

    } catch (error) {
      loader.style.display = "none";
      resultDiv.innerText = "Error calling AI: " + error.message;
    }
  });
});
