# mcp-seoul-rtd

서울시 실시간 도시데이터(citydata)를 제공하는 MCP 서버입니다. 서울 주요 121개 장소의 실시간 인구 혼잡도, 도로소통, 주차장, 지하철·버스, 따릉이, 전기차충전소, 날씨, 문화행사, 상권, 사고통제, 재난문자, 뉴스를 조회할 수 있습니다.

## Tools

| Tool | 설명 |
| --- | --- |
| `list_places` | 실시간 도시데이터가 제공되는 121개 장소 목록. `query` 로 부분 일치 필터 |
| `get_citydata` | 한 장소의 실시간 도시데이터 조회. `place` 는 장소명(부분 일치)/장소코드, `categories` 로 섹션 선택 |
| `get_congestion_ranking` | 121개 장소를 현재 혼잡도 순으로 정렬. `top` 으로 상위 개수(기본 10), `category` 로 분류 필터 |

`categories` 값: `population`, `traffic`, `parking`, `subway`, `bus`, `bike`, `charger`, `weather`, `event`, `commercial`, `accident`, `alert`, `news`

## API 키

[서울 열린데이터광장](https://data.seoul.go.kr)에서 인증키를 발급받아 `SEOUL_OPEN_API_KEY` 환경변수로 전달합니다.

- 샘플키 `sample` 로는 '광화문·덕수궁' 한 곳만 조회할 수 있습니다.
- 주의: API 엔드포인트(`openapi.seoul.go.kr:8088`)는 평문 HTTP 이며 인증키가 URL 에 포함됩니다.

## Claude Code / Claude Desktop 설정

Claude Code 는 CLI 로 등록할 수 있습니다.

```bash
claude mcp add seoul-rtd -e SEOUL_OPEN_API_KEY=<발급받은 인증키> -- npx -y mcp-seoul-rtd
```

기본으로 현재 프로젝트의 local 범위에 저장됩니다. `--scope user` 를 주면 모든 프로젝트에서, `--scope project` 를 주면 `.mcp.json` 파일로 팀과 공유할 수 있습니다. 등록 후 `/mcp` 로 연결 상태를 확인하세요.

Claude Desktop 은 `claude_desktop_config.json` (설정 → Developer → Edit Config) 에 아래 블록을 추가합니다.

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

## 라이선스

- 이 패키지의 코드는 MIT 라이선스입니다.
- 제공되는 데이터의 저작권은 **서울특별시**에 있으며, [공공누리 제1유형(출처표시)](https://www.kogl.or.kr/info/license.do)에 따라 상업적 이용과 변경이 가능합니다. 데이터를 이용할 때는 출처를 표시해야 합니다. 예: "출처: 서울 열린데이터광장(서울특별시)"
- 모든 tool 의 출력에는 위 출처표시 줄이 자동으로 포함됩니다.
