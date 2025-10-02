let originalProblemContent = null;
let translatedHinglishText = null;
let isTranslated = false;
let problemContainerEl = null;
let toggleBtn = null;
// Removed buttonContainerEl as we inject directly into the existing LeetCode button row
const INITIAL_BTN_TEXT = "Convert to Hinglish";

// Comprehensive list of selectors for the problem description content that hold the text/HTML
const CONTENT_SELECTORS = [
    ".content__u3I1.question-content__JfgR", 
    ".description__2b0c",                    
    ".not-prose",                           
    ".elfjS",                               
    ".question-description"                
];

// Selector for the entire row of buttons and tags (Medium, Topics, Companies, Hint)
// Based on the HTML provided, we are targeting the parent of the Hint button.
const BUTTON_ROW_SELECTOR = "div.flex.gap-1"; 
// Selector for the Hint button itself (to insert our button before it)
const HINT_BUTTON_SELECTOR = 'div.relative.inline-flex.items-center.justify-center.text-caption:has(svg[data-icon="lightbulb"])';


/**
 * Finds the most reliable problem container element.
 * We look for an element that contains significant text content.
 */
function findProblemContainer() {
    for (const selector of CONTENT_SELECTORS) {
        const el = document.querySelector(selector);
        // Check if the element exists and has more than 50 characters of text (to ensure it's the full description)
        if (el && el.innerText.length > 50) { 
            return el;
        }
    }
    return null;
}

/**
 * Generates the HTML string for the translated text wrapper.
 * This uses a class/ID which should be styled in styles.css to ensure readability (e.g., white-space: pre-wrap).
 */
function getTranslatedHtml(text) {
    // We remove the custom white-space: pre-wrap style here 
    // to allow HTML (like tables) to render naturally.
    // We add the LeetCode's typical problem description wrapper classes.
    return `<div id="hinglish-translation-output" class="text-sm pb-10">${text}</div>`;
}

/**
 * Toggles between the original English content and the translated Hinglish content.
 */
function toggleTranslation() {
    if (!problemContainerEl || !originalProblemContent || !translatedHinglishText) {
        console.error("Toggle failed: Missing content or container.");
        return;
    }
    
    // The button is no longer inside a wrapper, so we just check for its existence
    if (!toggleBtn) {
        console.error("Toggle button element missing.");
        return;
    }


    if (isTranslated) {
        // Switch back to English (restoring original HTML)
        
        // Use a temporary div to reconstruct the original HTML without our button, 
        // as the button is now injected into a different container (the button row).
        problemContainerEl.innerHTML = originalProblemContent;
        toggleBtn.innerText = INITIAL_BTN_TEXT; // Reset button text to initial state
        toggleBtn.classList.remove('active'); // Remove active state
        isTranslated = false;

    } else {
        // Switch to Hinglish (using the custom styled HTML wrapper)
        // Since we are now using innerHTML to display Markdown/HTML, tables should render.
        problemContainerEl.innerHTML = getTranslatedHtml(translatedHinglishText); 
        toggleBtn.innerText = "Show Original English";
        toggleBtn.classList.add('active'); // Add active state
        isTranslated = true;
    }
    
    // Always re-inject the button back into the correct location (the tags/meta section)
    // This is crucial because overwriting problemContainerEl.innerHTML removes the button
    injectHinglishButton();
}


/**
 * Handles the initial translation request and subsequent toggles.
 * Includes caching logic to prevent API spamming.
 */
async function handleTranslation() {
    // 1. Check for cached result (API Throttling/Caching)
    if (translatedHinglishText) {
        toggleTranslation();
        return;
    }

    // 2. Initial Setup and Pre-flight checks
    problemContainerEl = findProblemContainer();
    if (!problemContainerEl) {
        console.warn("Problem description container not found. Cannot proceed.");
        return;
    }
    
    // Get the button for state changes
    const button = document.getElementById("hinglish-toggle-btn");
    if (!button) {
        console.error("Toggle button not found during handleTranslation.");
        return;
    }


    // Capture the original content (HTML is best for preserving LeetCode lists/formatting)
    // We clone the problem container and get the innerHTML BEFORE replacing it
    const originalClone = problemContainerEl.cloneNode(true);
    // Remove all dynamically injected elements from the clone before capturing innerHTML
    const injectedElements = originalClone.querySelectorAll('#hinglish-translation-output, .error-div');
    injectedElements.forEach(el => el.remove());

    originalProblemContent = originalClone.innerHTML;
    
    // Get the plain text for the API call (using the clean clone's text content for accuracy)
    const problemText = originalClone.innerText; 

    
    // Show Loading State
    button.innerText = "Translating... (Wait a moment)";
    button.disabled = true;

    // 3. Send API Request via Service Worker
    chrome.runtime.sendMessage(
        { action: "translate", text: problemText },
        (response) => {
            button.disabled = false;
            
            const result = response?.result;

            if (result && (result.includes("(Error)") || result.includes("[Info]"))) {
                // Handle error/info messages received from background.js
                // Restore original content 
                problemContainerEl.innerHTML = originalProblemContent;
                
                // Re-inject button back into the tags section
                injectHinglishButton(); 
                
                const errorDiv = document.createElement('div');
                errorDiv.className = "error-div"; // Add a class for potential removal later
                // CLEANUP: Simplified error styling
                errorDiv.style.cssText = "padding: 5px; color: red; border: 1px solid red; margin-top: 10px; margin-bottom: 10px; font-weight: bold; border-radius: 4px;";
                errorDiv.innerText = result;
                
                // Find the content element and insert the error div before the problem text starts
                problemContainerEl.prepend(errorDiv);
                
                button.innerText = INITIAL_BTN_TEXT; // Reset button text on error
                return;
            }

            // 4. Cache Result and Display
            translatedHinglishText = result;
            isTranslated = true;
            
            // Display the translated text using the styled HTML wrapper
            problemContainerEl.innerHTML = getTranslatedHtml(translatedHinglishText); 
            
            // Set button state for toggling
            button.innerText = "Show Original English";
            button.classList.add('active'); // Add active state
            
            // Re-inject button back into the tags section
            injectHinglishButton(); 
        }
    );
}

/**
 * Creates and inserts the main button/toggle into the page.
 */
function injectHinglishButton() {
    const hintButton = document.querySelector(HINT_BUTTON_SELECTOR);
    const buttonRow = document.querySelector(BUTTON_ROW_SELECTOR);
    
    // Ensure we have a place to insert the button
    if (!buttonRow || !hintButton) {
        // Fallback to the old general selector if the specific ones fail
        const fallbackInjectionPoint = document.querySelector(".css-10o4wqw-TagList");
        if (!fallbackInjectionPoint) return;
    }
    
    // Check if the button is already injected
    if (document.getElementById("hinglish-toggle-btn")) {
        toggleBtn = document.getElementById("hinglish-toggle-btn");
        
        // Logic to ensure the button is placed AFTER the Hint button
        if (hintButton && hintButton.nextSibling !== toggleBtn) {
             hintButton.parentNode.insertBefore(toggleBtn, hintButton.nextSibling);
        } else if (!hintButton && buttonRow && buttonRow.lastChild !== toggleBtn) {
            // Fallback: append to the end of the row
            buttonRow.appendChild(toggleBtn);
        }
        return;
    }

    // Cache the problem container element
    problemContainerEl = findProblemContainer();
    if (!problemContainerEl) return;


    // Create the main button
    toggleBtn = document.createElement("button");
    toggleBtn.id = "hinglish-toggle-btn";
    
    // Applying the exact same Tailwind classes as the other buttons in the row 
    // (e.g., Topics, Companies, Hint) for a perfect match.
    toggleBtn.className = "relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary cursor-pointer transition-colors hover:bg-fill-primary hover:text-text-primary text-sd-secondary-foreground hover:opacity-80 whitespace-nowrap";
    
    // The button needs its own wrapper content for icon and text, mimicking the other buttons
    toggleBtn.innerHTML = `
        <div class="relative text-[14px] leading-[normal] p-[1px] before:block before:h-3.5 before:w-3.5 h-3.5 w-3.5 fill-none stroke-current">
            <svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="language" class="svg-inline--fa fa-language absolute left-1/2 top-1/2 h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em]" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path fill="currentColor" d="M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 32c10.3 0 19.8-3.4 27.5-9.1c7.7-5.7 13.5-13.6 16.8-23.1H218.4c3.3 9.5 9.1 17.4 16.8 23.1c7.7 5.7 17.2 9.1 27.5 9.1zm-84.8-32c0-10.3-3.4-19.8-9.1-27.5c-5.7-7.7-13.6-13.5-23.1-16.8V204.7c9.5-3.3 17.4-9.1 23.1-16.8c5.7-7.7 9.1-17.2 9.1-27.5H163.6c-3.3 9.5-9.1 17.4-16.8 23.1c-7.7 5.7-17.2 9.1-27.5 9.1v32c10.3 0 19.8 3.4 27.5 9.1c7.7 5.7 13.5 13.6 16.8 23.1H171.2zm184 0c0-10.3-3.4-19.8-9.1-27.5c-5.7-7.7-13.6-13.5-23.1-16.8V204.7c9.5-3.3 17.4-9.1 23.1-16.8c5.7-7.7 9.1-17.2 9.1-27.5h-32.4c-3.3 9.5-9.1 17.4-16.8 23.1c-7.7 5.7-17.2 9.1-27.5 9.1v32c10.3 0 19.8 3.4 27.5 9.1c7.7 5.7 13.5 13.6 16.8 23.1h32.4zM256 48c-42.3 0-82.3 14.8-114.7 41.5c-32.4 26.7-50.5 64.9-50.5 105.7H421.2c0-40.8-18.1-78.9-50.5-105.7C338.3 62.8 298.3 48 256 48zM174.1 352h163.8c-1.7 8.7-6.5 16.9-13.8 23.9c-7.3 7-16.2 12.5-26.2 16.4c-10 4-20.7 6.1-31.9 6.1s-21.9-2-31.9-6.1c-10-3.9-18.9-9.4-26.2-16.4c-7.3-7-12.1-15.2-13.8-23.9zm-29.4-32h234.6c-17.1 53-65.7 90.7-120.9 90.7s-103.8-37.7-120.9-90.7zM450.7 274.7c3.3-9.5 9.1-17.4 16.8-23.1c5.7-4.3 9.1-10.5 9.1-17.6s-3.4-13.3-9.1-17.6c-7.7-5.7-13.5-13.6-16.8-23.1h32.4c3.3 9.5 9.1 17.4 16.8 23.1c5.7 4.3 9.1 10.5 9.1 17.6s-3.4 13.3-9.1 17.6c-7.7 5.7-13.5 13.6-16.8 23.1h-32.4zM53.3 274.7c-3.3-9.5-9.1-17.4-16.8-23.1c-5.7-4.3-9.1-10.5-9.1-17.6s3.4-13.3 9.1-17.6c7.7 5.7 13.5 13.6 16.8 23.1H20.9c-3.3 9.5-9.1 17.4-16.8 23.1c-5.7 4.3-9.1 10.5-9.1 17.6s3.4 13.3 9.1 17.6c7.7 5.7 13.5 13.6 16.8 23.1h32.4z"/>
            </svg>
        </div>
        <span>${INITIAL_BTN_TEXT}</span>
    `;

    // Insert AFTER the hint button
    if (hintButton) {
        hintButton.parentNode.insertBefore(toggleBtn, hintButton.nextSibling);
    } else {
        // Fallback: append to the entire button row
        buttonRow.appendChild(toggleBtn);
    }

    // Attach handler
    toggleBtn.addEventListener("click", handleTranslation);
}

// Poll the DOM every second to inject the button once the problem content is available
let injectionInterval = setInterval(() => {
    // Check for the main container and the button row (which guarantees the hint button is near)
    if (findProblemContainer() && document.querySelector(BUTTON_ROW_SELECTOR)) {
        injectHinglishButton();
        // Clear interval once button is successfully injected
        if (document.getElementById("hinglish-toggle-btn")) {
             clearInterval(injectionInterval);
        }
    }
}, 1000);
