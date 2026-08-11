// citydata 클라이언트의 URL 구성과 응답 envelope 처리를 검증하는 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/client.ts';

function stubFetch(status: number, body: unknown): typeof fetch {
    return async () =>
        new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('성공 envelope(점 포함 키)을 파싱해 CITYDATA 를 반환한다', async () => {
    const client = createClient('KEY', stubFetch(200, {
        RESULT: { 'RESULT.CODE': 'INFO-000', 'RESULT.MESSAGE': '정상 처리되었습니다.' },
        CITYDATA: { AREA_NM: '광화문·덕수궁', AREA_CD: 'POI009' },
    }));
    const data = await client.fetchCitydata('광화문·덕수궁');
    assert.equal(data.AREA_NM, '광화문·덕수궁');
});

test('오류 envelope(평평한 키)은 코드와 메시지로 실패한다', async () => {
    const client = createClient('BAD', stubFetch(200, {
        RESULT: { CODE: 'INFO-100', MESSAGE: '인증키가 유효하지 않습니다.' },
    }));
    await assert.rejects(() => client.fetchCitydata('광화문·덕수궁'), /INFO-100.*인증키/);
});

test('INFO-000 이라도 CITYDATA 가 없으면 실패한다', async () => {
    const client = createClient('KEY', stubFetch(200, {
        RESULT: { 'RESULT.CODE': 'INFO-000', 'RESULT.MESSAGE': '정상 처리되었습니다.' },
    }));
    await assert.rejects(() => client.fetchCitydata('광화문·덕수궁'), /CITYDATA 가 없습니다/);
});

test('HTTP 오류 상태는 실패한다', async () => {
    const client = createClient('KEY', stubFetch(500, {}));
    await assert.rejects(() => client.fetchCitydata('광화문·덕수궁'), /HTTP 500/);
});

test('키와 장소명을 URL 인코딩해 호출한다', async () => {
    let seen = '';
    const client = createClient('K/E Y', (async (url: RequestInfo | URL) => {
        seen = String(url);
        return new Response(JSON.stringify({
            RESULT: { 'RESULT.CODE': 'INFO-000' },
            CITYDATA: {},
        }));
    }) as typeof fetch);
    await client.fetchCitydata('광화문·덕수궁');
    assert.match(seen, /^http:\/\/openapi\.seoul\.go\.kr:8088\/K%2FE%20Y\/json\/citydata\/1\/5\//);
    assert.ok(seen.endsWith(encodeURIComponent('광화문·덕수궁')));
});
