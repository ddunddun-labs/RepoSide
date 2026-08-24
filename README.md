# GitHub Desktop Companion

GitHub Desktop에서 선택한 Repository를 따라다니며 해당 프로젝트의 파일과 터미널을
자동으로 전환하는 Windows용 로컬 개발 Companion이다.

> 현재는 초기 프로토타입이다. 소스에서 개발 실행할 수 있지만 설치 프로그램과
> 안정적인 공개 릴리스는 아직 제공하지 않는다.

## 주요 기능

- GitHub Desktop에서 현재 선택한 Repository 자동 감지
- Repository가 바뀌면 파일 트리와 터미널을 함께 전환
- Repository별 파일 트리 펼침, 스크롤, 패널 상태 보존
- Repository별 PTY 터미널 세션과 출력 유지
- 파일 열기, Explorer에서 보기, 경로 복사
- PowerShell, cmd, WSL 터미널 지원 기반

## 감지 방식

빠른 연결 모드에서는 Windows UI Automation으로 GitHub Desktop의 선택 변경을 읽는다.
이 모드를 사용하려면 Companion의 실행 버튼으로 GitHub Desktop을 접근성 옵션과 함께
시작해야 한다. 이미 일반 모드로 실행 중이라면 버튼이 재시작 여부를 안내한다.

UI Automation을 사용할 수 없을 때는 GitHub Desktop의 Chromium Local Storage와
IndexedDB를 읽는 지연 모드로 전환한다. 이 방식은 GitHub Desktop의 비공개 내부 저장
구조에 의존하므로 버전 변경에 따라 감지기 수정이 필요할 수 있다.

## 요구 사항

- Windows 10/11
- GitHub Desktop (개발 중 3.6.4에서 확인)
- Node.js 20.19 이상

## 개발 실행

저장소를 clone한 뒤 Windows PowerShell에서 실행한다.

```powershell
cd github-desktop-companion
npm ci --include=optional
npm run dev
```

WSL과 Windows는 네이티브 의존성 구성이 다르다. 같은 작업 디렉터리에서 두 환경의
`npm install`을 번갈아 실행하지 않는 것을 권장한다.

검증 명령은 다음과 같다.

```powershell
npm run typecheck
npm run build
```

## 저장소 구조

```text
github-desktop-companion/      Electron 앱
github-desktop-companion-poc/  저장소 감지 진단 CLI
```

## 현재 한계

- Windows와 GitHub Desktop의 내부 구현에 의존한다.
- 같은 이름의 Repository가 여러 개면 빠른 UI 감지가 모호할 수 있다.
- 코드 서명된 설치 프로그램과 자동 업데이트는 아직 없다.
- GitHub Desktop이 일반 모드로 실행 중이면 지연 감지를 사용하거나 재시작해야 한다.

## 기여와 보안

기여 방법은 [CONTRIBUTING.md](CONTRIBUTING.md), 보안 문제 제보 방법은
[SECURITY.md](SECURITY.md)를 참고해줘.

## 라이선스와 상표

[MIT License](LICENSE)로 배포한다.

이 프로젝트는 GitHub, Inc.와 제휴하거나 GitHub의 승인을 받은 공식 제품이 아니다.
GitHub와 GitHub Desktop은 각 소유자의 상표다.
