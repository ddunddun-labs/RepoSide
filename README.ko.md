# RepoSide

<p align="center">
  <strong>GitHub Desktop에서 선택한 저장소를 실시간으로 따라다니며, 파일 트리와 터미널 세션을 자동으로 즉시 전환하는 로컬 개발 컴패니언</strong>
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

<p align="center">
  <a href="docs/assets/companion-demo.mp4">
    <img src="docs/assets/companion-demo.gif" alt="RepoSide 데모: GitHub Desktop에서 저장소를 변경하면 컴패니언의 파일 트리와 터미널이 즉시 동기화됨" width="850">
  </a>
</p>

<p align="center">
  <em>위 이미지를 클릭하면 전체 MP4 데모 영상을 확인할 수 있습니다.</em>
</p>

---

## ⚡ 왜 RepoSide인가요?

**GitHub Desktop**으로 여러 프로젝트를 넘나들며 작업할 때마다 터미널을 새로 열고 `cd`로 디렉터리를 찾아가거나, 복잡한 IDE 창들을 일일이 전환하는 과정은 개발의 몰입을 깨뜨립니다.

**RepoSide**는 GitHub Desktop 바로 옆에 붙어 실행되는 든든한 동반자(Companion)입니다. GitHub Desktop에서 Repository를 클릭하는 순간:
1. **해당 프로젝트의 파일 탐색기**가 즉시 열립니다 (폴더 펼침 상태 및 스크롤 위치 유지).
2. **저장소 전용 터미널 세션**이 즉시 전환됩니다 (저장소별 독립된 PTY 탭, 작업 히스토리, 출력 로그 유지).

---

## ✨ 주요 기능

- 🔄 **활성 저장소 실시간 감지**: GitHub Desktop의 선택 변경을 딜레이 없이 감지하여 즉각 동기화.
- 📂 **상태 보존 파일 트리**: 저장소별로 폴더 펼침, 스크롤 위치, 패널 레이아웃 상태를 완벽하게 기억.
- 💻 **저장소별 독립 터미널**: 각 프로젝트마다 멀티 탭 터미널 세션을 유지하여 다른 저장소로 갔다가 돌아와도 작업 내용 그대로 보존.
- 🚀 **빠른 파일 제어**: 기본 앱으로 열기, 탐색기에서 보기, 파일 경로 복사 단축 지원.
- ⚡ **고속 UI Automation 감지**: Windows UI Automation 기반 제로 딜레이 감지 + Chromium 로컬 저장소 폴백 감지 지원.
- 🐧 **다양한 쉘 환경**: Windows PowerShell 기본 지원 및 실험적인 WSL Linux 환경 지원.

---

## 📥 설치 및 사용 방법

**[GitHub Releases](https://github.com/ddunddun-labs/RepoSide/releases/latest)**에서 최신 빌드를 다운로드할 수 있습니다:

| 배포 형태 | 설명 |
| :--- | :--- |
| **`RepoSide-Setup-...exe`** | 사용자 계정에 설치하며 시작 메뉴 및 바탕화면 바로가기를 생성합니다. |
| **`RepoSide-Portable-...exe`** | 설치 없이 단일 실행 파일로 즉시 실행할 수 있습니다. |

> **참고**: 현재 초기 프로토타입 단계로 코드 서명이 적용되지 않아 Windows SmartScreen 경고가 표시될 수 있습니다. 공식 릴리스 페이지의 파일인지 확인하신 후 *추가 정보* → *실행*을 눌러 진행해 주세요.

### 빠른 시작 가이드
1. **RepoSide**를 실행합니다.
2. 화면 상단의 **Launch GitHub Desktop** 버튼을 눌러 접근성 옵션과 함께 GitHub Desktop을 시작합니다.
3. GitHub Desktop에서 저장소를 변경할 때마다 파일 트리와 터미널이 마법처럼 따라오는 것을 확인하세요!

---

## 🛠 감지 메커니즘

- **빠른 연결 모드 (UI Automation)**: Windows 접근성 트리를 직접 읽어 GitHub Desktop의 저장소 전환 이벤트를 딜레이 없이 즉시 처리합니다.
- **지연 폴백 모드 (Chromium Storage)**: UI Automation을 사용할 수 없는 경우 GitHub Desktop 내부의 IndexedDB / LocalStorage 상태를 조회하여 동기화합니다.

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
- 저장소 기본 폴더명이 완전히 동일한 경우 빠른 감지 시 구분이 필요할 수 있습니다.
- 프로토타입 단계로 EV 코드 서명 및 자동 업데이트는 추후 지원될 예정입니다.

---

## 📜 면책 조항 및 라이선스

본 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용 및 수정할 수 있습니다.

*안내: RepoSide는 [ddunddun-labs](https://github.com/ddunddun-labs)에서 개발한 독립적인 오픈소스 프로젝트이며, GitHub, Inc.의 공식 제품이 아니며 제휴되어 있지 않습니다. GitHub 및 GitHub Desktop은 해당 소유자의 등록 상표입니다.*
