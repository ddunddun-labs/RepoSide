# RepoSide desktop app

Electron 기반 Windows 앱의 소스다. 기능과 설치 방법은 저장소 최상위 [영문 README](../README.md)와 [한국어 README](../README.ko.md)를 참고한다. 배포 파일 이름은 `GitHub Desktop Companion` product name을 사용한다.

Repository마다 여러 터미널 탭을 만들 수 있으며 Repository를 전환해도 각 탭의
프로세스와 출력이 유지된다. Windows에서는 PowerShell, Linux에서는 기본 셸을 사용한다.

## 개발

Windows PowerShell에서 실행한다. WSL과 Windows가 서로 다른 네이티브 패키지를
설치할 수 있으므로 같은 `node_modules`를 두 환경에서 번갈아 사용하지 않는 편이 좋다.

```powershell
npm ci --include=optional
npm run dev
```

`node-pty` 1.1은 Windows용 사전 빌드 바이너리를 제공하므로 Visual Studio를 이용한
별도 rebuild는 필요하지 않다.

## 검증

```powershell
npm run typecheck
npm run build
```

## Windows 배포 파일

설치 프로그램과 포터블 실행 파일을 모두 만들려면:

```powershell
npm run dist:win
```

빠른 패키징 확인만 하려면 `npm run pack:win`을 사용한다. 결과물은 `release`에
생성되며, 일반 사용자는 패키징된 앱을 실행할 때 Node.js가 필요하지 않다.

GitHub Desktop의 Windows UI Automation 트리를 조사하려면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\inspect-github-desktop-ui.ps1
```
