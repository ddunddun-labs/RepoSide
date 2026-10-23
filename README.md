# RepoSide

<p align="center">
  <strong>A lightweight desktop companion for GitHub Desktop that automatically switches file trees and terminal sessions as you switch repositories.</strong>
</p>

<p align="center">
  <a href="https://github.com/ddunddun-labs/RepoSide/releases/latest"><img src="https://img.shields.io/github/v/release/ddunddun-labs/RepoSide?color=22c55e&label=Release" alt="Release"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-0284c7" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/License-MIT-emerald" alt="License: MIT">
  <a href="https://ddunddun-hub.pages.dev"><img src="https://img.shields.io/badge/Ecosystem-ddunddun--labs-f43f5e" alt="ddunddun-labs Hub"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a>
</p>

---

<p align="center">
  <a href="docs/assets/companion-demo.mp4">
    <img src="docs/assets/companion-demo.gif" alt="RepoSide Demo: Switching repositories in GitHub Desktop automatically synchronizes the companion file tree and terminal" width="850">
  </a>
</p>

<p align="center">
  <em>Click the image above to watch the full MP4 demo video.</em>
</p>

---

## ⚡ Why RepoSide?

When managing multiple repositories in **GitHub Desktop**, constantly opening new terminals, navigating directories (`cd`), and managing scattered IDE windows breaks your flow.

**RepoSide** sits alongside GitHub Desktop like a faithful co-pilot. Whenever you select a repository in GitHub Desktop, RepoSide instantly switches:
1. **The project file explorer** (preserving your expanded tree state and scroll position).
2. **Dedicated terminal sessions** (preserving multiple PTY tabs, shell state, and output history per repository).

---

## ✨ Key Features

- 🔄 **Active Repo Auto-Sync**: Instantly detects active repository changes in GitHub Desktop.
- 📂 **Stateful File Tree**: Preserves file expansion, scroll position, and panel width for each individual repository.
- 💻 **Persistent Terminals**: Multi-tab PTY terminal sessions per repo that keep your commands and outputs intact when switching back and forth.
- 🚀 **Quick Actions**: One-click file opening, Reveal in File Explorer, and path copying.
- ✨ **Gemini AI Commit**: Generate a Korean commit title and body from GitHub Desktop's checked changes and fill its commit fields.
- ⚡ **Zero-Friction Detection**: Uses Windows UI Automation for zero-latency detection, with automatic fallback to Chromium storage inspection.
- 🐧 **Shell Flexibility**: Built-in support for Windows PowerShell and experimental WSL Linux environments.

---

## 📥 Installation & Getting Started

Download the latest version from **[GitHub Releases](https://github.com/ddunddun-labs/RepoSide/releases/latest)**:

| Distribution | Description |
| :--- | :--- |
| **`RepoSide-Setup-...exe`** | Installs to your user account with Start Menu and Desktop shortcuts. |
| **`RepoSide-Portable-...exe`** | Standalone executable that runs immediately without installation. |

> **Note**: As code signing is not yet applied to prototype builds, Windows SmartScreen may show an alert. Click *More info* → *Run anyway* after verifying the download from official releases.

### Quick Start
1. Launch **RepoSide**.
2. Click **Launch GitHub Desktop** inside the app to enable zero-latency UI Automation detection.
3. Switch repositories in GitHub Desktop and watch your workspace follow seamlessly!
4. Save a Gemini API key and model in **AI Commit Settings**, then click **AI Commit** when files are checked for commit.

The API key is encrypted with the operating system's secure storage. RepoSide refuses to overwrite existing commit text and skips input if the repository or selected changes move during generation. AI Commit only creates and enters a message; it does not change file selections, the Git index, worktree files, commits, or pushes.

---

## 🛠 How Detection Works

- **Fast Hook Mode (UI Automation)**: Hooks into GitHub Desktop's accessibility tree for instantaneous repository switch events. Enabled automatically when starting GitHub Desktop via RepoSide's launcher button.
- **Fallback Polling Mode**: Reads GitHub Desktop's local Chromium IndexedDB/LocalStorage when UI Automation is unavailable.

---

## 💻 Development

### Prerequisites
- Windows 10/11
- Node.js 22.12+
- GitHub Desktop (Tested on 3.6.x)

### Running Locally
```powershell
# Clone and install dependencies
git clone https://github.com/ddunddun-labs/RepoSide.git
cd RepoSide/github-desktop-companion
npm ci --include=optional

# Start Electron app in development mode
npm run dev
```

### Verification & Packaging
```powershell
# Typecheck & Build
npm run typecheck
npm run build

# Package Windows installer and portable binary
npm run dist:win
```
The packaged binaries will be output to `github-desktop-companion/release/`.

---

## 🗺️ Current Limitations

- **Platform**: Officially supports Windows 10/11 (WSL Linux integration is experimental).
- **Multiple Identical Repo Names**: If multiple repositories share the exact same base folder name, UI Automation may require fallback verification.
- **Commit scope fallback**: If GitHub Desktop's selection cannot be read, RepoSide may analyze only the staged Git index diff and will leave the result in RepoSide without entering it. It will not substitute the full worktree.
- **Partial changes**: Partial line selections and untracked files are skipped when their exact commit diff cannot be verified.
- **Code Signing**: Binaries are not yet code-signed with an EV certificate.

---

## 📜 Disclaimer & License

Distributed under the [MIT License](LICENSE).

*Disclaimer: RepoSide is an independent open-source project created by [ddunddun-labs](https://github.com/ddunddun-labs) and is not affiliated with, endorsed by, or sponsored by GitHub, Inc. GitHub and GitHub Desktop are trademarks of their respective owners.*
