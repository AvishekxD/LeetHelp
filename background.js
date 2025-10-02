const MODEL_NAME = "gemini-2.5-flash-preview-05-20"; // Changed to the faster model
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Makes the Gemini API call with exponential backoff and retry logic.
 */
async function callGeminiApiWithRetry(apiKey, prompt) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Note: The API URL uses the faster MODEL_NAME now
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        return result?.candidates?.[0]?.content?.parts?.[0]?.text || "[Info] No explanation received.";
      } else if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        // Rate limit exceeded, wait and retry
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Rate limit (429) encountered. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else if (response.status === 401 || response.status === 403) {
        return "(Error) API Key Invalid or Unauthorized. Please check your key in Options.";
      } else {
        // Handle other errors
        const errorResult = await response.json();
        console.error("Gemini API Error Response:", response.status, errorResult);
        return `(Error) API Error (${response.status}): ${errorResult.error?.message || 'Unknown error.'}`;
      }
    } catch (err) {
      console.error("Gemini API Fetch Error:", err);
      return "(Error) Network or unexpected error calling Gemini API.";
    }
  }
  return "(Error) Failed to get an explanation after multiple retries.";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    chrome.storage.local.get("geminiApiKey", async (data) => {
      const apiKey = data.geminiApiKey;
      
      if (!apiKey) {
        // FIRST-TIME REDIRECT LOGIC
        chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
        sendResponse({ 
          result: "[Info] API Key missing! Opening setup page. Please save and validate your key." 
        });
        return;
      }

      // --- SIMPLIFIED PROMPT HERE (No Hindi characters/complicated words) ---
        const prompt = `Convert the following English technical text into Hinglish (a mixture of Hindi and English words but do not use hindi character and complicated hindi words.), maintaining the exact structure, paragraphs, and list formatting of the original. Do not add any introductory or concluding sentences. The goal is a direct language conversion only. The problem text is:\n\n${message.text}`;
        const explanation = await callGeminiApiWithRetry(apiKey, prompt);

      sendResponse({ result: explanation });
    });

    return true; // Keeps channel open for async response
  }
  
  // CLOSE TAB LOGIC (Triggered from options.js)
  if (message.action === "keySavedAndValidated") {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs.length > 0 && tabs[0].url.includes("options.html")) {
              chrome.tabs.remove(tabs[0].id); // Close the options tab
          }
      });
      return true;
  }
});
