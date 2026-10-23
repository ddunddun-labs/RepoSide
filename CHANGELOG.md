# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2026-10-23

### Added

- Gemini AI Commit message generation from a verifiable GitHub Desktop commit scope, with guarded Summary and Description input.
- File-tree context menus for opening items, revealing them in Explorer, and copying absolute or relative paths.
- English-default UI with a persistent Korean language option in Settings.
- Updated Windows application icon.

### Changed

- Hardened AI Commit scope and target checks to avoid overwriting existing text or entering a message after repository, branch, or selection changes.
- Report generated messages separately from verified automatic input and preserve the result for copying when input cannot be confirmed.

## [0.1.2] - 2026-09-01

### Changed

- 기본 창 크기를 1100x700으로, 최소 크기를 900x560으로 조정
- 창 위치와 크기를 종료 시 저장하고 다음 실행 시 복원하며, 화면 밖 bounds는 현재 디스플레이 안으로 보정

### Fixed

- 터미널이 툴바 아래 남은 세로 공간을 채우도록 flex 높이 체인과 xterm fit 동작 개선
- 초기 attach, 폰트 로딩, 창 리사이즈 시 xterm fit과 PTY resize를 안정적으로 동기화
- 터미널 탭 전환 시 xterm을 불필요하게 재생성하지 않도록 정리

## [0.1.1] - 2026-08-25

### Fixed

- 선택 영역이 있을 때 터미널 `Ctrl+C`로 텍스트 복사
- Repository 파일 변경 시 펼침과 스크롤 상태를 유지하는 파일 트리 자동 새로고침
- 파일 watcher가 일시적으로 종료됐을 때 현재 Repository에 자동 재연결
- 터미널의 작업 디렉터리 참조가 유효하지 않을 때 안전한 복구 안내 표시

## [0.1.0] - 2026-08-24

### Added

- GitHub Desktop의 현재 Repository 감지
- Windows UI Automation을 이용한 빠른 Repository 전환
- Local Storage와 IndexedDB를 이용한 지연 감지 fallback
- Repository별 상태를 보존하는 파일 트리
- Repository별 다중 PTY 터미널 탭과 출력 유지
- Windows용 설치 프로그램과 포터블 실행 파일
- README 기능 데모 GIF와 MP4

[Unreleased]: https://github.com/ddunddun-labs/RepoSide/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ddunddun-labs/RepoSide/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/ddunddun-labs/RepoSide/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ddunddun-labs/RepoSide/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ddunddun-labs/RepoSide/releases/tag/v0.1.0
