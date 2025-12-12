// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_EMAIL") {
    
    // 1. Try to find the Subject Line
    // Outlook often uses an input with aria-label "Add a subject"
    const subjectInput = document.querySelector('input[aria-label="Add a subject"]');
    const subject = subjectInput ? subjectInput.value : "[No Subject Found]";

    // 2. Try to find the Body
    // Outlook uses a contenteditable div with aria-label "Message body"
    const bodyDiv = document.querySelector('div[aria-label="Message body"], div[aria-label="Message Body"]');
    const body = bodyDiv ? bodyDiv.innerText : "[No Body Found]";

    // Send data back to popup
    sendResponse({ subject: subject, body: body });
  }
});
