let originalProblemContent = null;
let translatedHinglishText = null;
let isTranslated = false;
let problemContainerEl = null;
let toggleBtn = null;
const INITIAL_BTN_TEXT = "Convert to Hinglish";

const SWAP_SVG_ICON = `
    <div class="relative text-[14px] leading-[normal] p-[1px] before:block before:h-3.5 before:w-3.5 h-3.5 w-3.5 fill-none stroke-current">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="absolute left-1/2 top-1/2 h-[1em] -translate-x-1/2 -translate-y-1/2 align-[-0.125em] svg-icon-hinglish" role="img" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
        </svg>
    </div>
`;

const LOADING_STYLE_ID = "hinglish-loading-style";

function injectLoadingStyle() {
    if (document.getElementById(LOADING_STYLE_ID)) return;
    
    const style = document.createElement('style');
    style.id = LOADING_STYLE_ID;
    style.innerHTML = `
        /* Fades the button in and out slightly */
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; } /* Reduced opacity for a subtler effect */
            100% { opacity: 1; }
        }
        .loading-animation {
            animation: pulse 1.5s infinite ease-in-out;
        }
        
        /* ⭐ NEW: Side-to-side animation for the SVG icon */
        @keyframes shift {
            0% { transform: translate(-50%, -50%) translateX(0px); }
            25% { transform: translate(-50%, -50%) translateX(2px); } /* Shift right */
            75% { transform: translate(-50%, -50%) translateX(-2px); } /* Shift left */
            100% { transform: translate(-50%, -50%) translateX(0px); }
        }
        
        .loading-animation .svg-icon-hinglish {
            animation: shift 2.5s infinite ease-in-out;
        }
    `;
    document.head.appendChild(style);
}

const CONTENT_SELECTORS = [
    ".content__u3I1.question-content__JfgR", 
    ".description__2b0c",                    
    ".not-prose",                           
    ".elfjS",                               
    ".question-description"                
];

const BUTTON_ROW_SELECTOR = "div.flex.gap-1"; 
const HINT_BUTTON_SELECTOR = 'div.relative.inline-flex.items-center.justify-center.text-caption:has(svg[data-icon="lightbulb"])';
const DIFFICULTY_TAG_SELECTOR = 'div[class*="text-difficulty-"]';

function findProblemContainer() {
    for (const selector of CONTENT_SELECTORS) {
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 50) { 
            return el;
        }
    }
    return null;
}

function getTranslatedHtml(text) {
    return `<div id="hinglish-translation-output" class="text-sm pb-10">${text}</div>`;
}

/**
 * Updates the button's content, classes, and text for the given state.
 */
function updateButtonState(state) {
    if (!toggleBtn) return;

    // Reset classes
    toggleBtn.classList.remove('loading-animation', 'active');
    toggleBtn.disabled = false;
    
    switch (state) {
        case 'initial':
            toggleBtn.innerHTML = `${SWAP_SVG_ICON}<span>${INITIAL_BTN_TEXT}</span>`;
            isTranslated = false;
            break;
        case 'translated':
            toggleBtn.innerHTML = `${SWAP_SVG_ICON}<span>Show Original English</span>`;
            toggleBtn.classList.add('active');
            isTranslated = true;
            break;
        case 'loading':
            toggleBtn.innerHTML = `${SWAP_SVG_ICON}<span>Translating... (Wait a moment)</span>`;
            toggleBtn.classList.add('loading-animation');
            toggleBtn.disabled = true;
            break;
    }
}


function toggleTranslation() {
    if (!problemContainerEl || !originalProblemContent || !translatedHinglishText) {
        console.error("Toggle failed: Missing content or container.");
        return;
    }
    
    if (!toggleBtn) {
        console.error("Toggle button element missing.");
        return;
    }

    if (isTranslated) {
        problemContainerEl.innerHTML = originalProblemContent;
        updateButtonState('initial');
    } else {
        problemContainerEl.innerHTML = getTranslatedHtml(translatedHinglishText); 
        updateButtonState('translated');
    }
    
    injectHinglishButton();
}


/**
 * Handles the initial translation request and subsequent toggles.
 */
async function handleTranslation() {
    // 1. Check for cached result
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
    
    const button = document.getElementById("hinglish-toggle-btn");
    if (!button) {
        console.error("Toggle button not found during handleTranslation.");
        return;
    }

    // Capture the original content
    const originalClone = problemContainerEl.cloneNode(true);
    const injectedElements = originalClone.querySelectorAll('#hinglish-translation-output, .error-div');
    injectedElements.forEach(el => el.remove());

    originalProblemContent = originalClone.innerHTML;
    const problemText = originalClone.innerText; 

    
    // ⭐ Show Loading State with Animation
    updateButtonState('loading');

    // 3. Send API Request via Service Worker (assuming this part is correct)
    chrome.runtime.sendMessage(
        { action: "translate", text: problemText },
        (response) => {
            const result = response?.result;

            if (result && (result.includes("(Error)") || result.includes("[Info]"))) {
                // Handle error
                problemContainerEl.innerHTML = originalProblemContent;
                injectHinglishButton();
                
                const errorDiv = document.createElement('div');
                errorDiv.className = "error-div";
                errorDiv.style.cssText = "padding: 5px; color: red; border: 1px solid red; margin-top: 10px; margin-bottom: 10px; font-weight: bold; border-radius: 4px;";
                errorDiv.innerText = result;
                
                problemContainerEl.prepend(errorDiv);
                
                updateButtonState('initial');
                return;
            }

            // 4. Cache Result and Display
            translatedHinglishText = result;
            
            problemContainerEl.innerHTML = getTranslatedHtml(translatedHinglishText); 
            
            // ⭐ Display Translated State
            updateButtonState('translated');
            
            injectHinglishButton(); 
        }
    );
}

/**
 * Creates and inserts the main button/toggle into the page.
 */
function injectHinglishButton() {
    const hintButton = document.querySelector(HINT_BUTTON_SELECTOR);
    const difficultyTag = document.querySelector(DIFFICULTY_TAG_SELECTOR); 
    const buttonRow = document.querySelector(BUTTON_ROW_SELECTOR);
    
    if (!buttonRow) return;
    
    // Check if the button is already injected
    if (document.getElementById("hinglish-toggle-btn")) {
        toggleBtn = document.getElementById("hinglish-toggle-btn");
        
        let injectionPoint = hintButton || difficultyTag; 
        
        // Re-insert button if it's not in the right spot
        if (injectionPoint && injectionPoint.nextSibling !== toggleBtn) {
             injectionPoint.parentNode.insertBefore(toggleBtn, injectionPoint.nextSibling);
        } else if (!injectionPoint && buttonRow.lastChild !== toggleBtn) {
            buttonRow.appendChild(toggleBtn);
        }
        return;
    }

    problemContainerEl = findProblemContainer();
    if (!problemContainerEl) return;
    
    // Create the main button
    toggleBtn = document.createElement("button");
    toggleBtn.id = "hinglish-toggle-btn";
    
    // Apply LeetCode styling classes
    toggleBtn.className = "relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1 rounded-full bg-fill-secondary cursor-pointer transition-colors hover:bg-fill-primary hover:text-text-primary text-sd-secondary-foreground hover:opacity-80 whitespace-nowrap";
    
    // ⭐ Set initial state content
    updateButtonState('initial');

    // Determine injection point
    let injectionPoint = hintButton || difficultyTag; 

    if (injectionPoint) {
        injectionPoint.parentNode.insertBefore(toggleBtn, injectionPoint.nextSibling);
    } else {
        buttonRow.appendChild(toggleBtn);
    }

    // Attach handler
    toggleBtn.addEventListener("click", handleTranslation);
}

// Inject the custom CSS for the loading animation once
injectLoadingStyle();

// Poll the DOM until the main elements are available
let injectionInterval = setInterval(() => {
    
    const injectionTargetFound = document.querySelector(HINT_BUTTON_SELECTOR) || 
                                 document.querySelector(DIFFICULTY_TAG_SELECTOR); 

    if (findProblemContainer() && document.querySelector(BUTTON_ROW_SELECTOR) && injectionTargetFound) {
        injectHinglishButton();
        if (document.getElementById("hinglish-toggle-btn")) {
             clearInterval(injectionInterval);
        }
    }
}, 1000);
// Stop trying after 30 seconds
setTimeout(() => clearInterval(injectionInterval), 30000);
