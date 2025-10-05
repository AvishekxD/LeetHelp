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

    const style = document.createElement("style");
    style.id = LOADING_STYLE_ID;
    style.innerHTML = `
    /* Fade pulse */
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    .loading-animation {
      animation: pulse 1.5s infinite ease-in-out;
    }

    /* SVG shift animation */
    @keyframes shift {
      0% { transform: translate(-50%, -50%) translateX(0); }
      25% { transform: translate(-50%, -50%) translateX(2px); }
      75% { transform: translate(-50%, -50%) translateX(-2px); }
      100% { transform: translate(-50%, -50%) translateX(0); }
    }
    .loading-animation .svg-icon-hinglish {
      animation: shift 2.5s infinite ease-in-out;
    }

    /* Translation container styling */
    #hinglish-translation-output {
      margin-top: -12px;
      margin-bottom: -24px;
      padding: 8px 0;
      line-height: 1.65;
    }

    /* Reset extra paragraph spacing */
    #hinglish-translation-output p {
      margin: 0 0 10px 0;
    }
  `;
    document.head.appendChild(style);
}

/* Enhanced markdown conversion */
function markdownToHtml(markdownText) {
    if (!markdownText) return "";

    let html = markdownText;

    // Convert fenced code blocks (```code```)
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

    // Italics
    html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, "<em>$1</em>");
    html = html.replace(/(?<!_)_(?!_)(.*?)_(?!_)/g, "<em>$1</em>");

    // Blockquotes
    html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");

    // Clean up multiple newlines
    html = html.replace(/(\n\s*){2,}/g, "\n\n");

    // Wrap paragraphs properly without creating empty <p></p>
html = html
    .split(/\n{2,}/)
    .map(block => {
      const trimmed = block.trim();
      if (
        trimmed.startsWith("<pre>") ||
        trimmed.startsWith("<ul>") ||
        trimmed.startsWith("<ol>") ||
        trimmed.startsWith("Constraints:") ||
        trimmed.match(/^(\d+\.|\*|\-)\s+/)
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("");
    // Lists (unordered and ordered)
    html = html.replace(/^(?:\*|\-|\+)\s+(.*)$/gm, "<ul><li>$1</li></ul>");
    html = html.replace(/^(\d+)\.\s+(.*)$/gm, "<ol><li>$2</li></ol>");

    // Merge adjacent lists
    html = html.replace(/<\/ul>\s*<ul>/g, "");
    html = html.replace(/<\/ol>\s*<ol>/g, "");

    // Headings
    html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
    html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
    html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />');

    // Tables
    html = html.replace(/^\|(.+?)\|$/gm, (match) => {
      const rows = match.trim().split("\n");
      const headerCells = rows[0].split("|").map(cell => cell.trim()).filter(cell => cell);
      let tableHtml = "<table><thead><tr>";
      headerCells.forEach(cell => {
        tableHtml += `<th>${cell}</th>`;
      });
      tableHtml += "</tr></thead><tbody>";

      for (let i = 1; i < rows.length; i++) {
        const dataCells = rows[i].split("|").map(cell => cell.trim()).filter(cell => cell);
        if (dataCells.length === headerCells.length) {
          tableHtml += "<tr>";
          dataCells.forEach(cell => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += "</tr>";
        }
      }
      tableHtml += "</tbody></table>";
      return tableHtml;
    });

    // Remove extra spaces/newlines between block elements
    html = html.replace(/<\/(h[1-6]|p|ul|ol|li|pre|code|blockquote|table)>\s*<\1>/g, `</$1><$1>`);
    return html;
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
    // APPLY MARKDOWN CONVERSION HERE
    const convertedHtml = markdownToHtml(text);
    // Use line-height: 1.6 and text-base for better readability/spacing
    return `<div id="hinglish-translation-output" class="text-base leading-relaxed pb-10">${convertedHtml}</div>`;
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
    problemContainerEl = findProblemContainer();
    toggleBtn = document.getElementById("hinglish-toggle-btn");

    if (!problemContainerEl || !originalProblemContent || !translatedHinglishText || !toggleBtn) {
        console.error("Toggle failed: Missing content, container, or button.");
        if (toggleBtn) updateButtonState('initial');
        return;
    }

    if (isTranslated) {
        problemContainerEl.innerHTML = originalProblemContent;
        updateButtonState('initial');
    } else {
        problemContainerEl.innerHTML = getTranslatedHtml(translatedHinglishText);
        updateButtonState('translated');
    }
}


/**
 * Handles the initial translation request and subsequent toggles.
 */
async function handleTranslation() {
    // 1. Check for cached result (Stops repeated API calls)
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

    // Send raw HTML content to the model
    const problemContentToSend = originalClone.innerHTML;


    // Show Loading State with Animation
    updateButtonState('loading');

    // 3. Send API Request via Service Worker
    chrome.runtime.sendMessage(
        { action: "translate", text: problemContentToSend },
        (response) => {
            const result = response?.result;

            if (result && (result.includes("(Error)") || result.includes("[Info]"))) {
                // Handle error
                problemContainerEl.innerHTML = originalProblemContent;

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

            // Display Translated State
            updateButtonState('translated');
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

    // Set initial state content
    updateButtonState('initial');

    // Determine injection point
    let injectionPoint = hintButton || difficultyTag;

    if (injectionPoint) {
        injectionPoint.parentNode.insertBefore(toggleBtn, injectionPoint.nextSibling);
    } else {
        buttonRow.appendChild(toggleBtn);
    }

    // Attach handler - only executed once
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
