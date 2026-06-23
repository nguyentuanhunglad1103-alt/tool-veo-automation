# Veo Automation 🚀

Welcome to **Veo Automation**, a state-of-the-art Electron desktop application designed for automated video creation, subtitle burning, multi-provider AI text-to-speech (TTS), and web automation.

Veo Automation leverages a hybrid local-and-cloud architecture, ensuring highly secure API key handling, robust browser orchestration via Puppeteer, and high-performance offline media tasks powered by bundled FFmpeg runtimes.

---

## 🌟 Core Features

- 🖥️ **Desktop Electron Interface**: A polished, responsive desktop dashboard with native OS integrations.
- 🤖 **Multi-Provider Cloud AI**: Native integrations with **Gemini**, **OpenAI**, and **Groq** for high-quality translation and Speech-to-Text (STT) capabilities.
- 🔑 **Secure Token Storage**: Encrypted credential storage using Electron's native `safeStorage` API to protect your API keys.
- 🎥 **FFmpeg Subtitle Burner**: Seamless, fast rendering of subtitles onto video files using an embedded FFmpeg backend.
- 📥 **Integrated YouTube Downloader**: Native YouTube video downloading directly inside Node.js using `@distube/ytdl-core`, with real-time download progress.
- 🕸️ **Browser Automation**: Automated resource harvesting and web actions powered by Puppeteer with stealth plugins.
- 🧪 **Comprehensive Smoke Testing**: Built-in verification scripts to check security profiles, verify IPC contract signatures, and execute automated Electron launch checks.

---

## 📁 Repository Structure

```tree
├── .runtime/               # Portable Node (v22.12.0) and NPM (10.9.0) runtime
├── archive/                # Legacy code references and backup modules
├── dist/                   # Bundled React frontend files (production assets)
├── dist-electron/          # Reference configuration and Electron main/preload binaries
├── docs/                   # Developer documentation (Test plans, IPC catalog, Feature matrix)
├── python/                 # Legacy python services (retained for reference)
├── resources/              # Packed runtimes (Grok Engine and Antigravity Core)
├── scripts/                # Verification, contract checks, and runtime launch tests
├── deobfuscated.js         # Core Electron main process (bundled/optimized backend code)
├── preload.js              # Native preload bridge
├── preload-entry.js        # Final preload entry (combines native + Cloud AI features)
├── cloud-ai.js             # Cloud AI manager (STT, translation, profile orchestration)
├── chay_automation.bat     # Windows launcher script for the Electron application
├── package.json            # Project dependencies and script runner configurations
└── README.md               # Main project documentation
```

---

## 🛠️ Getting Started

### 📋 Prerequisites

- **Operating System**: Windows 10/11
- **Node.js**: The repository includes a portable Node environment under `.runtime/node/node.exe`. However, you can also use your system-installed Node.js (`v18` or newer is recommended).

### 🚀 Installation

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/nguyentuanhunglad1103-alt/tool-veo-automation.git
   cd tool-veo-automation
   ```

2. Install the required Node.js dependencies:
   ```bash
   npm install
   ```

### ⚡ Running the App

- **Quick Launch (Windows)**: Double-click the `chay_automation.bat` file in the root folder.
- **Via Command Line**: Run the start script defined in `package.json`:
   ```bash
   npm start
   ```

---

## 🧪 Testing & Verification

We have developed a comprehensive testing pipeline to ensure IPC integrity, API contract validity, and runtime startup stability.

### 1. Static IPC Contract Check
Validates all IPC handlers exposed in `deobfuscated.js` and their corresponding preload bindings to ensure no broken bridges:
```bash
npm run verify:contract
```

### 2. Secure Cloud AI Check
Validates that Cloud AI integrations, secure profile databases, and `safeStorage` encryption work without leaking API keys:
```bash
npm run verify:cloud
```

### 3. All-in-One Verification
Runs both the IPC and Cloud contract tests consecutively:
```bash
npm test
```

### 4. Interactive Runtime Launch Smoke Test
Launches the Electron application inside a sandboxed profile, monitors its output logs for 5 seconds to ensure no Javascript exceptions or crashes occur, and terminates it gracefully:
```bash
node scripts/verify-runtime-launch.js
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](file:///c:/Users/le%20van%20cuong/Desktop/4%20tool/3%20tool/LICENSE) file for more information.