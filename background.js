const MODEL_NAME = "gemini-2.5-flash-preview-05-20";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function callGeminiApiWithRetry(apiKey, userQuery, selectedLanguage) {
  // Dynamic system instruction
  const systemInstruction = `
  You are an expert technical translator. Your task is to translate the narrative text within the provided technical problem description into ${selectedLanguage}.

  If ${selectedLanguage} is a mixed style (like Hinglish or Chinglish), then mix English with ${selectedLanguage.replace(
    "lish",
    ""
  )} words **in English letters only** — do not use non-English scripts.

  IMPORTANT RULES:
  1. Preserve the complete HTML/Markdown structure: keep all <table>, <img>, <pre>, <ul>, <ol>, <h1>-<h6>, <p>, and <code> tags as they are.
  2. Do not translate text inside <code> tags or HTML attributes (src, alt, etc.).
  3. Only translate descriptive/narrative text and explanations.
  4. The output must remain valid HTML/Markdown.
  5. Do not add any intro or outro sentences.
  `;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        return (
          result?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "[Info] No translation received."
        );
      } else if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      } else if (response.status === 401 || response.status === 403) {
        return "(Error) API Key invalid or unauthorized.";
      } else {
        const errorResult = await response.json();
        console.error("Gemini API Error:", response.status, errorResult);
        return `(Error ${response.status}): ${
          errorResult.error?.message || "Unknown error"
        }`;
      }
    } catch (err) {
      console.error("Network error:", err);
      return "(Error) Network or unexpected issue calling Gemini API.";
    }
  }

  return "(Error) Failed after multiple retries.";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    chrome.storage.local.get(
      ["geminiApiKey", "selectedLanguage"],
      async (data) => {
        const apiKey = data.geminiApiKey;
        const selectedLanguage = data.selectedLanguage || "Hinglish";

        if (!apiKey) {
          chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
          sendResponse({
            result: "[Info] API Key missing! Opening setup page...",
          });
          return;
        }

        const userQuery = message.text;
        const translation = await callGeminiApiWithRetry(
          apiKey,
          userQuery,
          selectedLanguage
        );
        sendResponse({ result: translation });
      }
    );

    return true; // async
  }

  if (message.action === "keySavedAndValidated") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs?.[0];
      if (currentTab && currentTab.url.includes("options.html")) {
        chrome.tabs.remove(currentTab.id);
      }
    });
    return true;
  }
});
