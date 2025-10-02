const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

/**
 * Tests the provided API key with a simple API call.
 */
async function validateApiKey(key) {
  const statusElement = document.getElementById("status");
  statusElement.innerText = "⏳ Validating key...";
  statusElement.style.color = "orange";

  try {
    const response = await fetch(`${API_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }]
      }),
      signal: AbortSignal.timeout(5000) 
    });

    if (response.ok) {
      return true;
    } else if (response.status === 400) {
        // 400 with a prompt error is acceptable (key is working but prompt is simple)
        const result = await response.json();
        if (result?.error?.message.includes("prompt")) {
            return true;
        }
    }
    
    return false;

  } catch (error) {
    if (error.name === 'AbortError') {
        console.error("API validation timed out.");
    } else {
        console.error("API validation failed:", error);
    }
    return false;
  }
}

document.getElementById("saveKey").addEventListener("click", async () => {
  const key = document.getElementById("apiKey").value.trim();
  const statusElement = document.getElementById("status");

  if (!key) {
    statusElement.innerText = "⚠️ Please enter a valid key.";
    statusElement.style.color = "red";
    return;
  }
  
  const isValid = await validateApiKey(key);

  if (isValid) {
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      statusElement.innerText = "✅ API Key saved and validated! Closing tab...";
      statusElement.style.color = "green";
      
      // Send message to background script to close the tab
      chrome.runtime.sendMessage({ action: "keySavedAndValidated" });
    });
  } else {
    statusElement.innerText = "❌ Invalid API Key. Please check your key and try again.";
    statusElement.style.color = "red";
  }
});

// Load existing key
chrome.storage.local.get("geminiApiKey", (data) => {
  if (data.geminiApiKey) {
    document.getElementById("apiKey").value = data.geminiApiKey;
  }
});
