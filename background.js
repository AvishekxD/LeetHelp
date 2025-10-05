const MODEL_NAME = "gemini-2.5-flash-preview-05-20";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Makes the Gemini API call with exponential backoff and retry logic.
 */
async function callGeminiApiWithRetry(apiKey, userQuery) {
  
  // CRITICAL: Define the System Instruction to guide the model on preserving HTML elements.
  const systemInstruction = `You are an expert technical translator. Your task is to translate the narrative text within the provided technical problem description into Hinglish (a mix of Hindi and English words, but use common, simple vocabulary and avoid complex Hindi characters or words).

IMPORTANT RULES:
1. Preserve the complete HTML/Markdown structure: You must keep all structural elements like <table>, <img>, <pre>, <ul>, <ol>, <h1>, <h2>, <p> and <code> tags exactly where they are.
2. Do not translate any text within HTML attributes (like alt text, src URL) or inside <code> tags.
3. Only translate the surrounding narrative, example explanations, and main problem text.
4. The output must be valid HTML/Markdown that can render correctly. Do not add any extra introductory or concluding sentences.`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    // Construct payload with System Instruction and User Query
    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] } 
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
        // console.warn(`Rate limit (429) encountered. Retrying in ${delay / 1000}s...`); // Suppressed for clean console
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

      // message.text now contains the raw HTML
      const userQuery = message.text; 
      
      const explanation = await callGeminiApiWithRetry(apiKey, userQuery);

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
