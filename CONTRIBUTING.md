# Contributing

이 프로젝트에 관심을 가져줘서 고마워.

## 시작하기

1. Issue에서 버그나 제안을 먼저 공유한다.
2. 작은 범위의 branch에서 변경한다.
3. Windows PowerShell에서 `npm run typecheck`와 `npm run build`를 실행한다.
4. 변경 이유와 직접 확인한 동작을 Pull Request에 적는다.

앱 의존성은 `github-desktop-companion` 디렉터리에서 설치한다.

```powershell
cd github-desktop-companion
npm ci --include=optional
npm run typecheck
npm run build
```

## 개발 원칙

- GitHub Desktop을 포크하지 않고 독립적인 Companion으로 유지한다.
- Git commit, branch, push/pull 같은 GitHub Desktop의 기능을 중복 구현하지 않는다.
- GitHub Desktop 내부 저장 형식에 관한 코드는 `electron/main/detector`에 격리한다.
- 개인 경로, 로그, 사용자 데이터, 자격 증명을 commit하지 않는다.

큰 UI 변경이나 새 의존성은 구현 전에 Issue에서 방향을 합의하는 편을 권장한다.
