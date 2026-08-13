// MCP 서버 구성. tool 등록과 핸들러를 담당한다.

import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import type { CitydataClient } from './client.ts';
import { PLACES, PLACE_CATEGORIES, resolvePlace } from './places.ts';
import { CATEGORIES, formatCitydata, formatCongestionRanking, formatPlaceList } from './format.ts';

/** tool 핸들러의 예외를 MCP 에러 응답으로 바꾼다. API 오류가 프로세스를 죽이면 안 된다. */
async function guard(fn: () => Promise<string>) {
    try {
        return { content: [{ type: 'text' as const, text: await fn() }] };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { content: [{ type: 'text' as const, text: `오류: ${message}` }], isError: true };
    }
}

export function buildServer(client: CitydataClient): McpServer {
    const server = new McpServer({ name: 'mcp-seoul-rtd', version: '0.1.0' });

    server.registerTool(
        'list_places',
        {
            title: '장소 목록',
            description:
                '서울시 실시간 도시데이터가 제공되는 주요 121개 장소를 나열합니다. ' +
                'query 로 장소명을 부분 일치 필터링할 수 있습니다.',
            inputSchema: z.object({
                query: z.string().optional().describe('장소명 부분 일치 필터. 생략하면 전체'),
            }),
            annotations: { readOnlyHint: true },
        },
        ({ query }) => guard(async () => formatPlaceList(PLACES, query)),
    );

    server.registerTool(
        'get_citydata',
        {
            title: '실시간 도시데이터',
            description:
                '서울 주요 장소 한 곳의 실시간 도시데이터를 조회합니다. ' +
                '인구 혼잡도, 도로소통, 주차장, 지하철, 버스, 따릉이, 전기차충전소, 날씨, ' +
                '문화행사, 상권, 사고통제, 재난문자, 뉴스를 제공합니다. ' +
                'categories 로 필요한 데이터만 고르면 출력이 줄어듭니다.',
            inputSchema: z.object({
                place: z.string().describe('장소명(부분 일치 지원) 또는 장소코드(POIxxx). 예: 광화문, 강남역'),
                categories: z
                    .array(z.enum(CATEGORIES))
                    .optional()
                    .describe('조회할 데이터 종류. 생략하면 전체'),
            }),
            annotations: { readOnlyHint: true },
        },
        ({ place, categories }) =>
            guard(async () => {
                const area = resolvePlace(place);
                const data = await client.fetchCitydata(area);
                return formatCitydata(data, categories ?? CATEGORIES);
            }),
    );

    server.registerTool(
        'get_congestion_ranking',
        {
            title: '혼잡도 순위',
            description:
                '서울 주요 121개 장소를 현재 혼잡도(붐빔 > 약간 붐빔 > 보통 > 여유) 순으로 정렬해 반환합니다. ' +
                '"지금 가장 붐비는 곳이 어디야?" 같은 질문에 사용하세요. category 로 분류를 좁힐 수 있습니다.',
            inputSchema: z.object({
                top: z.number().int().min(1).max(121).optional().describe('상위 몇 곳을 표시할지. 기본 10'),
                category: z.enum(PLACE_CATEGORIES).optional().describe('분류 필터. 생략하면 전체'),
            }),
            annotations: { readOnlyHint: true },
        },
        ({ top, category }) =>
            guard(async () => {
                const snapshot = await client.fetchCongestionRanking();
                return formatCongestionRanking(snapshot, top ?? 10, category);
            }),
    );

    return server;
}
