# GitHub Desktop Companion detector PoC

GitHub Desktop의 Chromium Local Storage WAL에서
`last-selected-repository-id`를 읽고 선택 변경을 감지하는 무의존성 진단 CLI다.

Repository ID를 감지하고, 실행 중인 Chromium IndexedDB의 snapshot에서 LevelDB
SSTable과 Snappy 압축 블록을 읽어 V8 직렬화 Repository 레코드의 `ID -> path`를 연결한다.

## 요구 사항

- 정식 앱 디렉터리에 의존성이 설치된 Node.js 20.19 이상 환경
- Windows용 GitHub Desktop

## 실행

Windows 터미널에서:

```powershell
cd <repository-root>\github-desktop-companion
npm ci --include=optional
cd ..\github-desktop-companion-poc
npm run detect
npm run watch
```

WSL에서도 같은 데이터를 읽어 비교할 수 있다.

```bash
cd <repository-root>/github-desktop-companion
npm ci --include=optional
cd ../github-desktop-companion-poc
npm run detect
npm run watch
```

IndexedDB에 보이는 Windows 경로 후보를 함께 출력하려면:

```bash
npm run inspect
```

자동 탐색이 실패하면 GitHub Desktop 사용자 데이터 디렉터리를 지정한다.

```powershell
node src/index.mjs --watch --data-dir "$env:APPDATA\GitHub Desktop"
```

## 현재 한계

- Local Storage의 WAL(`*.log`)과 compact된 SSTable(`*.ldb`)을 모두 읽는다.
- 원본 DB의 `LOCK`을 열지 않고 임시 snapshot에서 읽는다.
- IndexedDB 파서는 현재 확인된 V8 직렬화 형식과 LevelDB SSTable 형식을 대상으로 한다.
- snapshot은 잠긴 `LOCK` 파일을 제외하고 시스템 임시 디렉터리에 생성되며 조회 후 삭제된다.
