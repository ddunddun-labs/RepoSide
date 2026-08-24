# GitHub Desktop Companion app

Electron 기반 Windows 앱의 소스다. 저장소 최상위 [README](../README.md)에서 기능,
설치 방법, 현재 한계를 확인할 수 있다.

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

GitHub Desktop의 Windows UI Automation 트리를 조사하려면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\inspect-github-desktop-ui.ps1
```
