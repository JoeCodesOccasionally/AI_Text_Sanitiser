# 🧹 AI Text Chat Sanitiser

Did you know the text you copy from **ChatGPT, Claude, Copilot, Gemini, or Deepseek** often includes *invisible Unicode characters*?  
These can confuse applications, cause formatting issues, or even act as subtle **AI “fingerprints”** detectable by automated systems.

**AI Text Chat Sanitiser** is a lightweight Chrome extension that automatically cleans text you copy from popular AI chat sites (or any site you choose).  
It logs every sanitised character — and attempts to categorise them — so you can see *exactly* what’s being removed and understand what metadata might be hiding in your clipboard.

---

## ✨ Features

Whether you’re worried about **AI-detection “fingerprints”** or simply hate stray invisible characters cluttering your text, this extension has you covered.

When you copy text on a monitored site, the extension automatically removes:
- Non-standard Unicode characters  
- Zero-width and hidden joining characters  
- Directional and bidirectional marks  
- Non-Latin characters and symbols  
- Diacritics, variation selectors, and combining marks  
- (Optional) Emoji  
- (Optional) AI Citation markers (e.g., `[1]`, `[cite: 123]`) from Gemini, ChatGPT, and others.
- **Programmatic Copy Support:** Intercepts "Copy" buttons on sites like Gemini code blocks and ChatGPT.

> ⚙️ Configuration and per-site exception lists are planned features.

---

## 🧭 Installation (from GitHub – no coding required)

### 1️⃣ Download the extension files
1. Open the project’s GitHub page.  
2. Click the green **Code** button → **Download ZIP**.  
3. Once downloaded, **extract/unzip** the file.  
4. Move the extracted folder somewhere stable (e.g. `C:\Extensions\AI_Chat_Sanitiser`).

---

### 2️⃣ Enable Developer Mode in Chrome
1. Open a new tab and visit `chrome://extensions/`.  
2. Toggle **Developer mode** (top-right corner).

---

### 3️⃣ Load the unpacked extension
1. Click **Load unpacked** (top-left).  
2. Select the folder you extracted in step 1.  
3. Click **Select Folder** (Windows/Linux) or **Open** (macOS).

Chrome will install **AI_Chat_Sanitiser**.  
A yellow warning about permissions is normal for local (unpacked) extensions.

---

### 4️⃣ (Optional) Pin it to your toolbar
1. Click the **puzzle piece** icon (Extensions) at the top-right.  
2. Pin **AI_Chat_Sanitiser** for quick access.

---

## 🧰 Using the Extension
- Click the extension’s icon to open it, and if your site of choice isn't listed, add it.
- Refresh your chrome page to make sure the extension has loaded, and copy any text. A pop-up will appear in the bottom right telling you if any characters would removed, and how many.
- <img width="350" height="260" alt="image" src="https://github.com/user-attachments/assets/c227e610-b212-4025-96f4-82ad5d7eb76a" />
- All current settings and logs are displayed on one page.  
- You’ll see a live table showing which characters were removed — and why.

---

## 🔄 Updating to a Newer Version
Manual installs don’t auto-update. To upgrade:
1. Redownload the latest ZIP from GitHub and extract it.  
2. Replace the old folder in your saved location with the new one.  
3. Restart Chrome to refresh the extension.  
4. Recheck your settings if you had modified any.

> 💡 Updating this way **won’t wipe your stats**, since Chrome preserves storage when you keep the same folder and extension ID.  
> The **Update** button on `chrome://extensions/` only refreshes existing files — it doesn’t pull from GitHub.

---

## 🧯 Common Issues & Fixes

| Problem | Solution |
|----------|-----------|
| **“Load unpacked” button missing** | Turn on **Developer mode** at the top-right of `chrome://extensions/`. |
| **“Manifest file is missing or unreadable”** | You selected the ZIP itself or wrong folder. Load the folder containing `manifest.json`. |
| **“This extension may be corrupted”** | Click **Repair**, or remove and reload via **Load unpacked**. |
| **The icon appears but nothing happens** | Refresh the page, restart Chrome, and make sure the site is in your sanitisation list. |
| **Using Edge / Brave / Chromium** | Use `edge://extensions/` or `brave://extensions/` instead — same process applies. |

---

## 💡 Coming Soon
- Export/import of sanitisation logs  
- Categorized removal stats breakdown

---

### 🧩 Feedback & Contributions
This is a small personal project made for fun and friends, but contributions, bug reports, or improvement ideas are welcome.
If you discover characters that *shouldn’t* be removed (or ones that slip through), please open an issue or pull request on GitHub.
rs that *shouldn’t* be removed (or ones that slip through), please open an issue or pull request on GitHub.
