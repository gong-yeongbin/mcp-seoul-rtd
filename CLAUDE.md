# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

서울시 실시간 도시데이터(citydata) API 를 노출하는 MCP 서버. TypeScript + ESM, stdio transport, npm 패키지 `mcp-seoul-rtd`.

## 명령어

- 패키지 매니저는 **pnpm** (npm 아님).
- `pnpm typecheck` / `pnpm test` / `pnpm build`. 테스트는 `node --test` 로 TS 를 직접 실행하므로 Node 23.6+ 필요 (런타임 floor 는 >=20).
- ESLint/Prettier 없음. 린트 도구를 추가하지 말 것.

## 코드 규칙

- 상대 import 는 `.ts` 확장자로 쓴다 (`import { x } from './client.ts'`). tsc 가 빌드 시 `.js` 로 재작성한다 (`rewriteRelativeImportExtensions`).
- `src/index.ts` 는 bin 전용이며 import 하면 `main()` 이 즉시 실행된다. 테스트와 다른 모듈은 `src/server.ts` 의 `buildServer()` 를 import 할 것. `import.meta.main` 게이트는 Node 24.2+ 전용이라 일부러 쓰지 않는다.
- 커밋 메시지는 conventional commits + 한국어. main push 시 GitHub Actions 가 feat/fix 커밋 타입으로 버전을 올려 npm 에 자동 배포한다 (`NPM_TOKEN` secret 필요).

## 서울 API 의 함정 (고치지 말 것)

- 응답 envelope 이 비일관적이다. 성공 시 `RESULT` 의 키가 `"RESULT.CODE"` (점 포함), 오류 시 `CODE`. `src/client.ts` 가 의도적으로 둘 다 읽는다.
- 실응답은 공식 명세와 다르다. 문화행사 키는 명세의 `CULTURALEVENTINFO` 가 아니라 `EVENT_STTS` 이며, 지하철 도착은 `SUB_DETAIL`, 충전기는 `CHARGER_DETAILS` 중첩 배열이다. 명세 문서보다 fixture(`test/fixtures/citydata.json`)를 믿을 것.
- 엔드포인트는 평문 HTTP (`openapi.seoul.go.kr:8088`) 이고 인증키가 URL 에 들어간다. 공식 방식이므로 HTTPS 로 바꾸지 말 것.

## 데이터 참고

- `src/places.ts` 의 121곳 목록은 SeoulRtd 대시보드 내부 API 에서 확보한 생성 데이터 (이름+분류만, POI 코드 없음). 갱신 방법은 context-notes.md 참고.
- '광화문' 은 광화문·덕수궁/광화문광장 복수 일치. 테스트에서 유일 부분 일치가 필요하면 '난지' 를 쓴다.
- 테스트는 라이브 API 를 호출하지 않는다. fixture 재캡처: `http://openapi.seoul.go.kr:8088/sample/json/citydata/1/5/광화문·덕수궁` (샘플키는 이 장소만 가능).
- 데이터 저작권은 서울특별시, 공공누리 제1유형(출처표시). 데이터를 노출하는 기능을 만들 때 출처표시("출처: 서울 열린데이터광장(서울특별시)")를 빼먹지 말 것. 코드는 MIT.
- `checklist.md` / `context-notes.md` 는 gitignore 된 로컬 작업 메모다. 작업 시작 전에 읽고, 결정 사항을 덧붙일 것.
