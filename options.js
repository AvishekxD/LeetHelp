const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

async function validateApiKey(key) {
  const statusElement = document.getElementById("status");
  statusElement.innerText = "Validating key...";
  statusElement.style.color = "green";

  try {
    const response = await fetch(`${API_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }]
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) return true;

    if (response.status === 400) {
      const result = await response.json();
      if (result?.error?.message?.includes("prompt")) return true;
    }

    return false;
  } catch (error) {
    console.error("API validation failed:", error);
    return false;
  }
}

document.getElementById("saveKey").addEventListener("click", async () => {
  const key = document.getElementById("apiKey").value.trim();
  const selectedLanguage = document.getElementById("languageSelect").value;
  const statusElement = document.getElementById("status");

  if (!key) {
    statusElement.innerText = "Please enter a valid key.";
    statusElement.style.color = "red";
    return;
  }

  const isValid = await validateApiKey(key);

  if (isValid) {
    chrome.storage.local.set(
      { geminiApiKey: key, selectedLanguage },
      () => {
        statusElement.innerText =
          "API Key saved and validated! You can close this tab.";
        statusElement.style.color = "white";
        chrome.runtime.sendMessage({ action: "keySavedAndValidated" });
      }
    );
  } else {
    statusElement.innerText = "Invalid API Key. Please check your key.";
    statusElement.style.color = "red";
  }
});

// Preload existing values
chrome.storage.local.get(["geminiApiKey", "selectedLanguage"], (data) => {
  if (data.geminiApiKey)
    document.getElementById("apiKey").value = data.geminiApiKey;
  if (data.selectedLanguage)
    document.getElementById("languageSelect").value = data.selectedLanguage;
});
