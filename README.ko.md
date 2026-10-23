# RepoSide

<p align="center">
  <strong>GitHub Desktop에서 선택한 저장소를 감지해 파일 트리와 터미널 세션을 전환하는 로컬 개발 컴패니언</strong>
</p>

<p align="center">
  <a href="https://github.com/ddunddun-labs/RepoSide/releases/latest"><img src="https://img.shields.io/github/v/release/ddunddun-labs/RepoSide?color=22c55e&label=릴리스" alt="Release"></a>
  <img src="https://img.shields.io/badge/플랫폼-Windows-0284c7" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/라이선스-MIT-emerald" alt="License: MIT">
  <a href="https://ddunddun-hub.pages.dev/ko/"><img src="https://img.shields.io/badge/생태계-ddunddun--labs-f43f5e" alt="ddunddun-labs Hub"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a>
</p>

---

## ⚡ 왜 RepoSide인가요?

**GitHub Desktop**으로 여러 프로젝트를 넘나들며 작업할 때마다 터미널을 새로 열고 `cd`로 디렉터리를 찾아가거나, 복잡한 IDE 창들을 일일이 전환하는 과정은 개발의 몰입을 깨뜨립니다.

**RepoSide**는 GitHub Desktop 바로 옆에 붙어 실행되는 든든한 동반자(Companion)입니다. GitHub Desktop에서 Repository를 클릭하는 순간:
1. **해당 프로젝트의 파일 탐색기**로 전환합니다 (폴더 펼침 상태 및 스크롤 위치 유지).
2. **저장소 전용 터미널 세션**으로 전환합니다 (저장소별 독립된 PTY 탭과 출력 상태 유지).

---

## ✨ 주요 기능

- 🔄 **활성 저장소 감지**: GitHub Desktop의 저장소 선택 변경을 확인해 파일 트리와 터미널을 전환.
- 📂 **상태 보존 파일 트리**: 저장소별 폴더 펼침, 스크롤 위치, 패널 레이아웃을 보존.
- 💻 **저장소별 독립 터미널**: 저장소마다 터미널 탭과 출력 상태를 유지.
- 🚀 **파일 작업**: 파일·폴더 우클릭 메뉴에서 열기, 탐색기에서 보기, 절대 경로·상대 경로 복사를 지원.
- ✨ **Gemini AI Commit**: GitHub Desktop에서 확인 가능한 커밋 범위로 한국어 커밋 제목과 본문을 생성하고 입력을 시도.
- 🌐 **영어·한국어 UI**: 영어가 기본이며 Settings에서 언제든 한국어로 전환 가능.
- ⚡ **저장소 감지**: Windows UI Automation을 우선 사용하고 Chromium 로컬 저장소를 폴백으로 확인.
- 🐧 **다양한 쉘 환경**: Windows PowerShell 기본 지원 및 실험적인 WSL Linux 환경 지원.

---

## 📥 설치 및 사용 방법

**[GitHub Releases](https://github.com/ddunddun-labs/RepoSide/releases/latest)**에서 최신 빌드를 다운로드할 수 있습니다:

| 배포 형태 | 설명 |
| :--- | :--- |
| **`GitHub Desktop Companion-Setup-0.2.0-x64.exe`** | 사용자 계정에 설치하고 시작 메뉴·바탕화면 바로가기를 생성합니다. |
| **`GitHub Desktop Companion-Portable-0.2.0-x64.exe`** | 설치 없이 실행하는 포터블 파일입니다. |
| **`SHA256SUMS.txt`** | Windows 실행 파일의 SHA-256 체크섬입니다. |

> **참고**: 현재 초기 프로토타입 단계로 코드 서명이 적용되지 않아 Windows SmartScreen 경고가 표시될 수 있습니다. 공식 릴리스 페이지의 파일인지 확인하신 후 *추가 정보* → *실행*을 눌러 진행해 주세요.

### 빠른 시작 가이드
1. **RepoSide**를 실행합니다.
2. GitHub Desktop을 별도로 실행하고 저장소를 선택합니다. RepoSide가 Windows 접근성 인터페이스와 필요 시 로컬 Chromium 저장소를 통해 선택 저장소를 감지합니다.
3. 파일 트리에서 파일·폴더를 우클릭해 열기, 탐색기에서 보기, 전체 경로 또는 상대 경로 복사를 선택할 수 있습니다. **Settings**에서 한국어 UI를 선택할 수 있습니다.
4. **Settings**에서 Gemini API 키와 모델을 저장한 뒤 GitHub Desktop에서 커밋할 변경을 선택하고 **AI Commit**을 누릅니다.

API 키는 Electron의 운영체제 기반 보안 저장소로 암호화해 저장합니다. UI 언어와 무관하게 한국어 Conventional Commit 제목·본문을 생성합니다. AI Commit은 메시지 생성과 입력만 수행하며 자동 Stage, Commit, Push를 하지 않습니다. 기존 입력은 덮어쓰지 않습니다. 입력 직전 저장소, 브랜치, 확인 가능한 커밋 범위를 다시 검사합니다. 부분 라인 선택 등 정확한 범위를 검증할 수 없는 경우 전체 작업 파일을 선택한 것처럼 처리하지 않고 안내합니다. 자동 입력을 확인할 수 없으면 생성 결과를 RepoSide에 남겨 복사할 수 있습니다.

---

## 🛠 감지 메커니즘

- **UI Automation**: 사용 가능한 경우 GitHub Desktop의 Windows 접근성 인터페이스에서 선택 저장소와 커밋 입력란을 확인합니다. GitHub Desktop 내부 데이터를 수정하지 않습니다.
- **저장소 감지 폴백**: 접근성 정보가 부족하면 로컬 Chromium IndexedDB / LocalStorage를 확인합니다. 저장소 감지와 커밋 범위 확인은 별도 기능이며, 커밋 범위를 확인할 수 없을 때 전체 작업 파일로 대체하지 않습니다.

---

## 💻 개발 및 빌드 환경

### 요구 사항
- Windows 10/11
- Node.js 22.12 이상
- GitHub Desktop (3.6.x 버전에서 검증됨)

### 로컬 개발 실행
```powershell
# 저장소 복제 및 의존성 설치
git clone https://github.com/ddunddun-labs/RepoSide.git
cd RepoSide/github-desktop-companion
npm ci --include=optional

# Electron 개발 서버 실행
npm run dev
```

### 빌드 및 배포 패키징
```powershell
# 타입 체크 및 빌드
npm run typecheck
npm run build

# Windows 설치 프로그램 및 포터블 실행 파일 생성
npm run dist:win
```
패키징된 결과물은 `github-desktop-companion/release/` 디렉터리에 생성됩니다.

---

## 🗺️ 현재 한계 및 안내 사항

- 공식 지원 운영체제는 Windows 10/11입니다 (WSL Linux 환경은 실험적으로 지원됩니다).
- 커밋 범위를 확인할 수 없으면 staged된 Git index diff만 대체 분석할 수 있고 자동 입력을 건너뜁니다. 해당 diff도 없으면 전체 작업 파일을 대신 분석하지 않습니다.
- 부분 라인 선택 또는 아직 Git이 추적하지 않는 새 파일은 정확한 범위를 확인할 수 없어 AI Commit을 중단합니다.
- AI Commit은 설치된 GitHub Desktop 버전에서 노출하는 Windows UI Automation 컨트롤에 의존합니다. 입력란의 실제 반영 여부를 브리지에서 확인한 경우에만 입력 성공으로 표시하며 버전에 따라 동작이 다를 수 있습니다.
- 실행 파일은 코드 서명되지 않았습니다.

---

## 📜 면책 조항 및 라이선스

본 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용 및 수정할 수 있습니다.

*안내: RepoSide는 [ddunddun-labs](https://github.com/ddunddun-labs)에서 개발한 독립적인 오픈소스 프로젝트이며, GitHub, Inc.의 공식 제품이 아니며 제휴되어 있지 않습니다. GitHub 및 GitHub Desktop은 해당 소유자의 등록 상표입니다.*
