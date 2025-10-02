// Load saved key when popup opens (for display, not saving)
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get("geminiApiKey", (data) => {
        const outputEl = document.getElementById("output");
        if (!data.geminiApiKey) {
            outputEl.innerHTML = "<b>API Key Missing!</b> Please click 'Change API Key' to set it up.";
            outputEl.style.color = 'red';
        } else {
            // Display instructions when the key is present
            outputEl.innerHTML = "API Key is set.<br>Click 'Translate' or use the <b>in-page button</b> on LeetCode.";
            outputEl.style.color = 'gray';
        }
    });
});
 

// Translate button → inject code to get problem description
document.getElementById("translateBtn").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const outputEl = document.getElementById("output");
  
  // Set loading state
  outputEl.innerText = "Requesting problem text...";
  outputEl.style.color = 'gray';

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      function: () => {
        // --- FIX APPLIED HERE: Using a broader container for reliability ---
        // These are common parent containers for the entire problem description section.
        let el = document.querySelector(
            ".content__u3I1.question-content__JfgR, .description__2b0c, .not-prose, .elfjS" 
        );
        
        // If we find the container, we return its text content.
        return el ? el.innerText : null;
      }
    },
    (results) => {
      const problemText = results[0]?.result;
      
      if (!problemText) {
        outputEl.innerText = "⚠️ Problem description not found on this LeetCode page! Ensure you are viewing a problem page.";
        outputEl.style.color = 'red';
        return;
      }

      // Send message to service worker
      outputEl.innerText = "Generating Hinglish explanation...";
      outputEl.style.color = 'green';

      chrome.runtime.sendMessage(
        { action: "translate", text: problemText },
        (response) => {
          // Response received (could be error or success)
          const result = response?.result;
          
          if (result && (result.startsWith("⚠️") || result.startsWith("❌"))) {
            // Handle error messages from background.js
            outputEl.innerText = result;
            outputEl.style.color = 'red';
          } else {
            // Success: Display translation in the popup
            outputEl.innerText = result || "❌ Error fetching Hinglish explanation.";
            outputEl.style.color = '#fff';
          }
        }
      );
    }
  );
});

// IMPORTANT: The API key save/load logic must be moved to options.js
// for the options page to function correctly.
// You do not need to redefine it here.
