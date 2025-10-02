# LeetHelp 🔥  
_LeetHelp is a lightweight Chrome extension built to help students and developers understand LeetCode problems more easily. With just one click, you can translate any problem statement from English into Hinglish (a mix of Hindi + English) - making concepts clearer and easier to grasp._

---

## 📸 Screenshots
will add later..

---

## 📌 Features
- 📝 **One-click Hinglish translation** of LeetCode problem statements.  
- 🔄 **Toggle button beside the "Hint" button** → switch between English and Hinglish.  
- 📖 **Inline translation display** → Hinglish text appears right below the original problem statement.  
- 💾 **Caching support** → no duplicate API calls for the same problem.  
- ⚡ **Non-intrusive UI** → follows LeetCode’s styling to feel native.  

---

## 🛠 Tech Stack
- JavaScript (content scripts + DOM manipulation)
- Chrome Extensions API
- Gemini-Api 2.5 flash

---

## 📁 Folder Structure
```bash
LeetHelp/
│
├── manifest.json          # Chrome extension manifest (v3)
├── content.js             # Main script injected into LeetCode pages
├── background.js          # Handles API requests, caching, messaging
├── styles.css             # Custom CSS (button styling, translation box)
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── README.md              # Project documentation
└── .gitignore             # Ignore node_modules, build, etc.
```
---

## ✨ Future Ideas
- 📌 Images of examples in our mode.
- 🌙 Dark mode optimized UI.
- 📚 Multi-Language Support(for example - Runglish (Russian + English), Portuñol / Portenglish (Portuguese + English), Konglish (Korean + English)).

---

## 🚀 Installation (Developer Mode)
1. Clone this repository:
   ```bash
    git clone https://github.com/avishekxd/LeetHelp.git
    cd LeetHelp
    Open Chrome → chrome://extensions/.

    Enable Developer Mode (top right).

    Click Load unpacked and select the LeetHelp folder.

    Open LeetCode
    and you’ll see the "Convert to Hinglish" button appear. click on it and setup your gemini api key and 
    you know what thats all, enjoy :D.

---

Made with ❤️ by [AvishekxD](https://github.com/AvishekxD)