// tool 등록과 핸들러 동작을 클라이언트 스텁으로 검증하는 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { buildServer } from '../src/server.ts';
import type { Citydata, CitydataClient } from '../src/client.ts';

function stubClient(over: Partial<CitydataClient> = {}): CitydataClient {
    return {
        fetchCitydata: async (): Promise<Citydata> => ({
            AREA_NM: '광화문·덕수궁',
            AREA_CD: 'POI009',
            LIVE_PPLTN_STTS: [{ AREA_CONGEST_LVL: '보통', AREA_PPLTN_MIN: '38000', AREA_PPLTN_MAX: '40000' }],
        }),
        ...over,
    };
}

/** 서버를 메모리 트랜스포트로 클라이언트에 연결한다. */
async function connect(citydata: CitydataClient) {
    const server = buildServer(citydata);
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0' });
    await Promise.all([server.connect(serverT), client.connect(clientT)]);
    return { client, close: () => client.close() };
}

test('tool 2개를 노출한다', async () => {
    const { client, close } = await connect(stubClient());
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['get_citydata', 'list_places']);
    assert.ok(tools.every((t) => t.annotations?.readOnlyHint === true));
    await close();
});

test('list_places 가 121곳을 렌더링한다', async () => {
    const { client, close } = await connect(stubClient());
    const r = await client.callTool({ name: 'list_places', arguments: {} });
    assert.match(JSON.stringify(r.content), /121곳\./);
    await close();
});

test('list_places 가 query 를 적용한다', async () => {
    const { client, close } = await connect(stubClient());
    const r = await client.callTool({ name: 'list_places', arguments: { query: '난지' } });
    const text = JSON.stringify(r.content);
    assert.match(text, /난지한강공원/);
    assert.match(text, /1곳\./);
    await close();
});

test('get_citydata 는 장소명을 해석해 클라이언트로 전달한다', async () => {
    let seen = '';
    const { client, close } = await connect(
        stubClient({
            fetchCitydata: async (area) => {
                seen = area;
                return { AREA_NM: '광화문·덕수궁' };
            },
        }),
    );
    await client.callTool({ name: 'get_citydata', arguments: { place: '난지' } });
    assert.equal(seen, '난지한강공원');
    await close();
});

test('get_citydata 는 categories 로 섹션을 제한한다', async () => {
    const { client, close } = await connect(stubClient());
    const r = await client.callTool({
        name: 'get_citydata',
        arguments: { place: '광화문·덕수궁', categories: ['population'] },
    });
    const text = JSON.stringify(r.content);
    assert.match(text, /실시간 인구/);
    assert.doesNotMatch(text, /## 날씨/);
    await close();
});

test('클라이언트 예외는 프로세스를 죽이지 않고 isError 로 온다', async () => {
    const { client, close } = await connect(
        stubClient({
            fetchCitydata: async () => {
                throw new Error('API 오류 INFO-100: 인증키가 유효하지 않습니다.');
            },
        }),
    );
    const r = await client.callTool({ name: 'get_citydata', arguments: { place: '광화문·덕수궁' } });
    assert.equal(r.isError, true);
    assert.match(JSON.stringify(r.content), /INFO-100/);
    await close();
});

test('복수 일치 장소는 isError 로 후보를 안내한다', async () => {
    const { client, close } = await connect(stubClient());
    const r = await client.callTool({ name: 'get_citydata', arguments: { place: '광화문' } });
    assert.equal(r.isError, true);
    assert.match(JSON.stringify(r.content), /하나를 선택하세요/);
    await close();
});
