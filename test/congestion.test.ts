// 혼잡도 순위 수집(대시보드 우선, citydata_ppltn 폴백)을 stub fetch 로 검증하는 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchCongestionSnapshot } from '../src/congestion.ts';

const dashboardBody = readFileSync(new URL('./fixtures/hotspot-category.json', import.meta.url), 'utf8');
const queuePage = readFileSync(new URL('./fixtures/queue-page.html', import.meta.url), 'utf8');
const ppltnBody = readFileSync(new URL('./fixtures/citydata-ppltn.json', import.meta.url), 'utf8');

const isDashboardUrl = (url: string) => url.startsWith('https://data.seoul.go.kr/SeoulRtd/');

/** URL 에 따라 응답을 나눠주는 stub fetch. 호출 기록을 남긴다. */
function stubFetch(
    handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
    calls: { url: string; init?: RequestInit }[] = [],
): typeof fetch {
    return (async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return handler(String(url), init);
    }) as typeof fetch;
}

test('대시보드 성공 시 121곳을 혼잡도 내림차순으로 반환한다', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const snapshot = await fetchCongestionSnapshot('KEY', stubFetch(() => new Response(dashboardBody), calls));

    assert.equal(snapshot.source, 'dashboard');
    assert.equal(snapshot.failedCount, 0);
    assert.equal(snapshot.entries.length, 8);
    assert.equal(snapshot.entries[0]!.name, '보라매공원');
    const nums = snapshot.entries.map((e) => e.levelNum);
    assert.deepEqual(nums, [...nums].sort((a, b) => b - a), 'levelNum 내림차순이어야 합니다');

    assert.equal(calls.length, 1);
    const headers = calls[0]!.init?.headers as Record<string, string>;
    assert.equal(headers['Referer'], 'https://data.seoul.go.kr/SeoulRtd/map');
});

test('대시보드가 대기열 HTML(200) 을 반환하면 공식 API 로 폴백한다', async () => {
    const snapshot = await fetchCongestionSnapshot(
        'KEY',
        stubFetch((url) => new Response(isDashboardUrl(url) ? queuePage : ppltnBody)),
    );
    assert.equal(snapshot.source, 'official');
    assert.equal(snapshot.entries.length, 121);
    assert.equal(snapshot.failedCount, 0);
    assert.equal(snapshot.entries[0]!.ppltnMax, '34000');
});

test('대시보드 오류 envelope 도 폴백한다', async () => {
    const errorBody = JSON.stringify({ 'RESULT.CODE': 'ERROR-300', 'RESULT.MESSAGE': '필수 값이 누락되었습니다.' });
    const snapshot = await fetchCongestionSnapshot(
        'KEY',
        stubFetch((url) => new Response(isDashboardUrl(url) ? errorBody : ppltnBody)),
    );
    assert.equal(snapshot.source, 'official');
});

test('대시보드 응답에 row 가 없어도 폴백한다', async () => {
    const emptyBody = JSON.stringify({ pageRange: [1], total: 0, row: [] });
    const snapshot = await fetchCongestionSnapshot(
        'KEY',
        stubFetch((url) => new Response(isDashboardUrl(url) ? emptyBody : ppltnBody)),
    );
    assert.equal(snapshot.source, 'official');
});

test('폴백 부분 실패는 성공분만 순위화하고 실패 수를 센다', async () => {
    const ok = (name: string, max: string) =>
        JSON.stringify({
            'SeoulRtd.citydata_ppltn': [
                { AREA_NM: name, AREA_CONGEST_LVL: '붐빔', AREA_PPLTN_MIN: '1000', AREA_PPLTN_MAX: max, PPLTN_TIME: '2026-08-13 09:05' },
            ],
        });
    const snapshot = await fetchCongestionSnapshot(
        'KEY',
        stubFetch((url) => {
            if (isDashboardUrl(url)) return new Response(queuePage);
            if (url.endsWith(encodeURIComponent('강남역'))) return new Response(ok('강남역', '50000'));
            if (url.endsWith(encodeURIComponent('보라매공원'))) return new Response(ok('보라매공원', '90000'));
            return new Response('', { status: 500 });
        }),
    );
    assert.equal(snapshot.source, 'official');
    assert.equal(snapshot.entries.length, 2);
    assert.equal(snapshot.failedCount, 119);
    // 같은 단계(붐빔)면 인구수 상한으로 2차 정렬한다.
    assert.deepEqual(snapshot.entries.map((e) => e.name), ['보라매공원', '강남역']);
    assert.equal(snapshot.entries[0]!.category, '공원');
});

test('폴백까지 전부 실패하면 오류를 던진다', async () => {
    await assert.rejects(
        () =>
            fetchCongestionSnapshot(
                'KEY',
                stubFetch((url) => new Response(isDashboardUrl(url) ? queuePage : '', { status: isDashboardUrl(url) ? 200 : 500 })),
            ),
        /전부 실패/,
    );
});

test('샘플키는 폴백 없이 명확한 오류를 던진다', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    await assert.rejects(
        () => fetchCongestionSnapshot('sample', stubFetch(() => new Response(queuePage), calls)),
        /샘플키/,
    );
    assert.equal(calls.length, 1, '대시보드 1회 외에 폴백 호출이 없어야 합니다');
});

test('폴백 동시 호출은 8개를 넘지 않는다', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const snapshot = await fetchCongestionSnapshot(
        'KEY',
        stubFetch(async (url) => {
            if (isDashboardUrl(url)) return new Response(queuePage);
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((r) => setTimeout(r, 1));
            inFlight -= 1;
            return new Response(ppltnBody);
        }),
    );
    assert.equal(snapshot.entries.length, 121);
    assert.ok(maxInFlight <= 8, `동시 호출 ${maxInFlight}개는 상한 8을 넘습니다`);
});
