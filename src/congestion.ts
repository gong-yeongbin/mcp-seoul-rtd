// 실시간 혼잡도 순위 수집. SeoulRtd 대시보드 API 우선, 실패 시 공식 citydata_ppltn 폴백.

import { PLACES } from './places.ts';

// 대시보드 내부 API 는 비공식이다 (2026-08-13 실측 확보). 호출 1번으로 121곳 전체가 오지만
// 접속자가 많으면 HTTP 200 으로 대기열 HTML 을 반환하므로 JSON 파싱 실패를 폴백 신호로 쓴다.
const DASHBOARD_URL =
    'https://data.seoul.go.kr/SeoulRtd/api/hotspot-category?page=1&category=' +
    encodeURIComponent('전체보기') +
    '&count=121';
const DASHBOARD_HEADERS = {
    Referer: 'https://data.seoul.go.kr/SeoulRtd/map',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
};
const PPLTN_BASE_URL = 'http://openapi.seoul.go.kr:8088';
const TIMEOUT_MS = 15_000;
const FALLBACK_CONCURRENCY = 8;

const LEVEL_NUM: Record<string, number> = { 여유: 1, 보통: 2, '약간 붐빔': 3, 붐빔: 4 };

export interface CongestionEntry {
    name: string;
    category: string;
    level: string; // 여유/보통/약간 붐빔/붐빔
    levelNum: number; // 1~4, 알 수 없으면 0
    ppltnMin?: string; // 폴백(공식 API)에서만 제공
    ppltnMax?: string;
    time?: string;
}

export interface CongestionSnapshot {
    source: 'dashboard' | 'official';
    entries: CongestionEntry[]; // levelNum 내림차순 정렬 완료 상태
    failedCount: number; // 폴백에서 조회 실패한 장소 수 (대시보드는 0)
}

interface DashboardRow {
    area_nm?: string;
    category?: string;
    area_congest_lvl?: string;
    area_congest_num?: number;
}

interface PpltnRow {
    AREA_NM?: string;
    AREA_CONGEST_LVL?: string;
    AREA_PPLTN_MIN?: string;
    AREA_PPLTN_MAX?: string;
    PPLTN_TIME?: string;
}

function sortEntries(entries: CongestionEntry[]): CongestionEntry[] {
    return entries.sort(
        (a, b) => b.levelNum - a.levelNum || Number(b.ppltnMax ?? 0) - Number(a.ppltnMax ?? 0),
    );
}

async function fetchFromDashboard(fetchFn: typeof fetch): Promise<CongestionEntry[]> {
    const res = await fetchFn(DASHBOARD_URL, {
        headers: DASHBOARD_HEADERS,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
        throw new Error(`대시보드 API 가 HTTP ${res.status} 를 반환했습니다.`);
    }
    const text = await res.text();
    let body: { 'RESULT.CODE'?: string; 'RESULT.MESSAGE'?: string; row?: DashboardRow[] };
    try {
        body = JSON.parse(text) as typeof body;
    } catch {
        throw new Error('대시보드가 JSON 이 아닌 응답(접속 대기 페이지)을 반환했습니다.');
    }
    if (body['RESULT.CODE']) {
        throw new Error(`대시보드 API 오류 ${body['RESULT.CODE']}: ${body['RESULT.MESSAGE'] ?? '알 수 없는 오류'}`);
    }
    if (!Array.isArray(body.row) || body.row.length === 0) {
        throw new Error('대시보드 응답에 row 배열이 없습니다.');
    }
    return body.row.map((r) => ({
        name: r.area_nm ?? '-',
        category: r.category ?? '-',
        level: r.area_congest_lvl ?? '-',
        levelNum:
            typeof r.area_congest_num === 'number'
                ? r.area_congest_num
                : (LEVEL_NUM[r.area_congest_lvl ?? ''] ?? 0),
    }));
}

/** 고정 동시성 워커 풀. 실패한 항목은 null 로 남긴다. */
async function mapLimit<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<(R | null)[]> {
    const out: (R | null)[] = new Array<R | null>(items.length).fill(null);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            try {
                out[i] = await fn(items[i]!);
            } catch {
                out[i] = null;
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
}

async function fetchFromOfficial(
    apiKey: string,
    fetchFn: typeof fetch,
): Promise<{ entries: CongestionEntry[]; failedCount: number }> {
    const results = await mapLimit(PLACES, FALLBACK_CONCURRENCY, async (place) => {
        const url =
            `${PPLTN_BASE_URL}/${encodeURIComponent(apiKey)}/json/citydata_ppltn/1/5/` +
            encodeURIComponent(place.name);
        const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const body = (await res.json()) as { 'SeoulRtd.citydata_ppltn'?: PpltnRow[] };
        const p = body['SeoulRtd.citydata_ppltn']?.[0];
        if (!p?.AREA_CONGEST_LVL) {
            throw new Error('citydata_ppltn 데이터 없음');
        }
        const entry: CongestionEntry = {
            name: p.AREA_NM ?? place.name,
            category: place.category,
            level: p.AREA_CONGEST_LVL,
            levelNum: LEVEL_NUM[p.AREA_CONGEST_LVL] ?? 0,
            ppltnMin: p.AREA_PPLTN_MIN,
            ppltnMax: p.AREA_PPLTN_MAX,
            time: p.PPLTN_TIME,
        };
        return entry;
    });
    const entries = results.filter((r): r is CongestionEntry => r !== null);
    if (entries.length === 0) {
        throw new Error('공식 citydata_ppltn API 조회가 전부 실패했습니다.');
    }
    return { entries, failedCount: results.length - entries.length };
}

export async function fetchCongestionSnapshot(
    apiKey: string,
    fetchFn: typeof fetch = globalThis.fetch,
): Promise<CongestionSnapshot> {
    try {
        const entries = await fetchFromDashboard(fetchFn);
        return { source: 'dashboard', entries: sortEntries(entries), failedCount: 0 };
    } catch (e) {
        // stdout 은 JSON-RPC 전용이므로 stderr 로만 로그한다.
        console.error(`대시보드 혼잡도 조회 실패, 공식 API 폴백: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (apiKey === 'sample') {
        throw new Error(
            '대시보드 조회에 실패했고, 샘플키로는 121곳 폴백 조회를 할 수 없습니다. ' +
                '실사용 인증키(SEOUL_OPEN_API_KEY)를 설정한 뒤 다시 시도하세요.',
        );
    }
    const { entries, failedCount } = await fetchFromOfficial(apiKey, fetchFn);
    return { source: 'official', entries: sortEntries(entries), failedCount };
}
