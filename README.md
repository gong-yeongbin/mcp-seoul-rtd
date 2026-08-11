# mcp-seoul-rtd

서울시 실시간 도시데이터(citydata)를 제공하는 MCP 서버입니다. 서울 주요 121개 장소의 실시간 인구 혼잡도, 도로소통, 주차장, 지하철·버스, 따릉이, 전기차충전소, 날씨, 문화행사, 상권, 사고통제, 재난문자, 뉴스를 조회할 수 있습니다.

## Tools

| Tool | 설명 |
| --- | --- |
| `list_places` | 실시간 도시데이터가 제공되는 121개 장소 목록. `query` 로 부분 일치 필터 |
| `get_citydata` | 한 장소의 실시간 도시데이터 조회. `place` 는 장소명(부분 일치)/장소코드, `categories` 로 섹션 선택 |

`categories` 값: `population`, `traffic`, `parking`, `subway`, `bus`, `bike`, `charger`, `weather`, `event`, `commercial`, `accident`, `alert`, `news`

## API 키

[서울 열린데이터광장](https://data.seoul.go.kr)에서 인증키를 발급받아 `SEOUL_OPEN_API_KEY` 환경변수로 전달합니다.

- 샘플키 `sample` 로는 '광화문·덕수궁' 한 곳만 조회할 수 있습니다.
- 주의: API 엔드포인트(`openapi.seoul.go.kr:8088`)는 평문 HTTP 이며 인증키가 URL 에 포함됩니다.

## Claude Code / Claude Desktop 설정

```json
{
  "mcpServers": {
    "seoul-rtd": {
      "command": "npx",
      "args": ["-y", "mcp-seoul-rtd"],
      "env": {
        "SEOUL_OPEN_API_KEY": "<발급받은 인증키>"
      }
    }
  }
}
```

## 개발

```bash
pnpm install
pnpm typecheck   # 타입 검사
pnpm test        # node --test (Node 23.6+ 필요)
pnpm build       # tsc → dist/
```

테스트는 라이브 API 를 호출하지 않고 fixture 와 스텁으로 동작합니다.

## 릴리즈

main 에 push 되면 GitHub Actions 가 conventional commit 타입으로 버전을 결정해 npm 에 배포합니다. repo secret 에 `NPM_TOKEN` 이 필요합니다.

## 라이선스

- 이 패키지의 코드는 MIT 라이선스입니다.
- 제공되는 데이터의 저작권은 **서울특별시**에 있으며, [공공누리 제1유형(출처표시)](https://www.kogl.or.kr/info/license.do)에 따라 상업적 이용과 변경이 가능합니다. 데이터를 이용할 때는 출처를 표시해야 합니다. 예: "출처: 서울 열린데이터광장(서울특별시)"
