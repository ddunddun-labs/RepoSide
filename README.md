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

## ⚡ Why RepoSide?

When managing multiple repositories in **GitHub Desktop**, constantly opening new terminals, navigating directories (`cd`), and managing scattered IDE windows breaks your flow.

**RepoSide** sits alongside GitHub Desktop like a faithful co-pilot. Whenever you select a repository in GitHub Desktop, RepoSide instantly switches:
1. **The project file explorer** (preserving your expanded tree state and scroll position).
2. **Dedicated terminal sessions** (preserving multiple PTY tabs, shell state, and output history per repository).

---

## ✨ Key Features

- 🔄 **Active Repo Auto-Sync**: Instantly detects active repository changes in GitHub Desktop.
- 📂 **Stateful File Tree**: Preserves file expansion, scroll position, and panel width for each repository.
- 💻 **Persistent Terminals**: Keeps repository-specific terminal tabs and output when switching repositories.
- 🚀 **File Actions**: Open files, reveal files or folders in Explorer, and copy absolute or repository-relative paths from the file tree context menu.
- ✨ **Gemini AI Commit**: Generate a Korean commit summary and description from the commit changes GitHub Desktop exposes, then fill its commit fields.
- 🌐 **English and Korean UI**: English is the default; switch to Korean in Settings at any time.
- ⚡ **Repository Detection**: Uses GitHub Desktop UI Automation when available and Chromium storage inspection as a fallback.
- 🐧 **Shell Flexibility**: Built-in support for Windows PowerShell and experimental WSL Linux environments.

---

## 📥 Installation & Getting Started

Download the latest version from **[GitHub Releases](https://github.com/ddunddun-labs/RepoSide/releases/latest)**:

| Distribution | Description |
| :--- | :--- |
| **`GitHub Desktop Companion-Setup-0.2.0-x64.exe`** | Installs to your user account with Start Menu and Desktop shortcuts. |
| **`GitHub Desktop Companion-Portable-0.2.0-x64.exe`** | Standalone executable that runs without installation. |
| **`SHA256SUMS.txt`** | SHA-256 checksums for the Windows executables. |

> **Note**: As code signing is not yet applied to prototype builds, Windows SmartScreen may show an alert. Click *More info* → *Run anyway* after verifying the download from official releases.

### Quick Start
1. Install and launch RepoSide, then open GitHub Desktop separately.
2. Select a repository in GitHub Desktop. RepoSide detects the selected repository using its Windows accessibility UI and, when needed, its local Chromium storage.
3. Use the file tree context menu to open a file, reveal an item in Explorer, or copy its absolute or relative path. Use **Settings** to choose English or 한국어.
4. In **Settings**, save a Gemini API key and model. Select the intended changes in GitHub Desktop, then click **AI Commit**.

The API key is encrypted using Electron's operating-system-backed secure storage. AI Commit generates a Korean Conventional Commit summary and description regardless of the UI language. It only generates a message and attempts to enter it: it never stages, commits, or pushes. Existing text is not overwritten. RepoSide rechecks the repository, branch, and verifiable commit selection before input; unsupported or ambiguous selections (including partial-line selections) are reported instead of being treated as the whole worktree. If automatic input cannot be verified, the generated message remains available in RepoSide for copying.

---

## 🛠 How Detection Works

- **UI Automation**: Reads GitHub Desktop's Windows accessibility interface to detect the selected repository and commit fields when available. This does not modify GitHub Desktop.
- **Fallback Detection**: Reads GitHub Desktop's local Chromium IndexedDB/LocalStorage when accessibility data is unavailable. Repository detection and commit-selection inspection have different capabilities; an unverified selection is not substituted with the full worktree.

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
- **Commit scope**: Only a commit scope RepoSide can verify is used. If selection details are unavailable, RepoSide may analyze the staged index diff and leave the result in RepoSide without entering it; it does not substitute the full worktree.
- **Partial changes**: Partial-line selections and untracked files are skipped when their exact commit diff cannot be verified.
- **GitHub Desktop compatibility**: AI Commit relies on the Windows UI Automation controls exposed by the installed GitHub Desktop version. Input is reported as successful only after the bridge verifies the text in the target fields; behavior can vary by version.
- **Code Signing**: Binaries are not yet code-signed with an EV certificate.

---

## 📜 Disclaimer & License

Distributed under the [MIT License](LICENSE).

*Disclaimer: RepoSide is an independent open-source project created by [ddunddun-labs](https://github.com/ddunddun-labs) and is not affiliated with, endorsed by, or sponsored by GitHub, Inc. GitHub and GitHub Desktop are trademarks of their respective owners.*
