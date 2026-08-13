// citydata 응답을 LLM 이 읽기 쉬운 compact 텍스트로 렌더링하는 모듈

import type { Citydata } from './client.ts';
import type { CongestionSnapshot } from './congestion.ts';
import type { Place } from './places.ts';

export const CATEGORIES = [
    'population',
    'traffic',
    'parking',
    'subway',
    'bus',
    'bike',
    'charger',
    'weather',
    'event',
    'commercial',
    'accident',
    'alert',
    'news',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** 목록형 데이터의 표시 상한. 원본이 수십~수백 건이라 그대로 내보내면 출력이 넘친다. */
const LIST_CAP = 10;
const FORECAST_CAP = 6;

function val(v: unknown): string {
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
}

function capNote(total: number, shown: number): string[] {
    return total > shown ? [`(${total}건 중 ${shown}건 표시)`] : [];
}

function section(title: string, lines: string[]): string {
    if (lines.length === 0) return `## ${title}\n(데이터 없음)`;
    return [`## ${title}`, ...lines].join('\n');
}

function formatPopulation(d: Citydata): string {
    const p = d.LIVE_PPLTN_STTS?.[0];
    if (!p) return section('실시간 인구', []);
    const lines = [
        `혼잡도: ${val(p.AREA_CONGEST_LVL)} — ${val(p.AREA_CONGEST_MSG)}`,
        `실시간 인구: ${val(p.AREA_PPLTN_MIN)}~${val(p.AREA_PPLTN_MAX)}명 (${val(p.PPLTN_TIME)} 기준)`,
        `남 ${val(p.MALE_PPLTN_RATE)}% | 여 ${val(p.FEMALE_PPLTN_RATE)}%`,
    ];
    const fcst = p.FCST_PPLTN ?? [];
    if (fcst.length > 0) {
        lines.push('예측:');
        for (const f of fcst.slice(0, FORECAST_CAP)) {
            lines.push(`  ${val(f.FCST_TIME)} | ${val(f.FCST_CONGEST_LVL)} | ${val(f.FCST_PPLTN_MIN)}~${val(f.FCST_PPLTN_MAX)}명`);
        }
        lines.push(...capNote(fcst.length, Math.min(fcst.length, FORECAST_CAP)));
    }
    return section('실시간 인구', lines);
}

function formatTraffic(d: Citydata): string {
    const avg = d.ROAD_TRAFFIC_STTS?.AVG_ROAD_DATA;
    if (!avg) return section('도로소통', []);
    const roadCount = d.ROAD_TRAFFIC_STTS?.ROAD_TRAFFIC_STTS?.length ?? 0;
    return section('도로소통', [
        `평균 ${val(avg.ROAD_TRAFFIC_SPD)}km/h (${val(avg.ROAD_TRAFFIC_IDX)}) — ${val(avg.ROAD_MSG)}`,
        `도로구간 ${roadCount}개 집계 (${val(avg.ROAD_TRAFFIC_TIME)} 기준)`,
    ]);
}

function formatParking(d: Citydata): string {
    const prks = d.PRK_STTS ?? [];
    if (prks.length === 0) return section('주차장', []);
    const lines = ['주차장명 | 가능/수용 | 요금'];
    for (const p of prks.slice(0, LIST_CAP)) {
        const cur = p.CUR_PRK_YN === 'Y' ? val(p.CUR_PRK_CNT) : '?';
        const fee = p.PAY_YN === 'Y' ? `${val(p.RATES)}원/${val(p.TIME_RATES)}분` : '무료';
        lines.push(`${val(p.PRK_NM)} | ${cur}/${val(p.CPCTY)} | ${fee}`);
    }
    lines.push(...capNote(prks.length, Math.min(prks.length, LIST_CAP)));
    return section('주차장', lines);
}

function formatSubway(d: Citydata): string {
    const stns = d.SUB_STTS ?? [];
    const lines: string[] = [];
    for (const s of stns.slice(0, LIST_CAP)) {
        lines.push(`${val(s.SUB_STN_NM)}역 (${val(s.SUB_STN_LINE)}호선)`);
        for (const a of (s.SUB_DETAIL ?? []).slice(0, 3)) {
            lines.push(`  ${val(a.SUB_ROUTE_NM)} | ${val(a.SUB_DIR)} | ${val(a.SUB_ARVTIME)}초 후 도착`);
        }
    }
    lines.push(...capNote(stns.length, Math.min(stns.length, LIST_CAP)));
    const p = d.LIVE_SUB_PPLTN;
    if (p) {
        lines.push(
            `당일 누적 승차 ${val(p['SUB_ACML_GTON_PPLTN_MIN'])}~${val(p['SUB_ACML_GTON_PPLTN_MAX'])}명 | ` +
                `하차 ${val(p['SUB_ACML_GTOFF_PPLTN_MIN'])}~${val(p['SUB_ACML_GTOFF_PPLTN_MAX'])}명`,
            `최근 30분 승차 ${val(p['SUB_30WTHN_GTON_PPLTN_MIN'])}~${val(p['SUB_30WTHN_GTON_PPLTN_MAX'])}명 | ` +
                `하차 ${val(p['SUB_30WTHN_GTOFF_PPLTN_MIN'])}~${val(p['SUB_30WTHN_GTOFF_PPLTN_MAX'])}명`,
        );
    }
    return section('지하철', lines);
}

function formatBus(d: Citydata): string {
    const stops = d.BUS_STN_STTS ?? [];
    const lines: string[] = [];
    if (stops.length > 0) {
        lines.push(`정류소 ${stops.length}곳: ` +
            stops.slice(0, LIST_CAP).map((s) => `${val(s.BUS_STN_NM)}(${val(s.BUS_ARS_ID)})`).join(', ') +
            (stops.length > LIST_CAP ? ' 외' : ''));
    }
    const p = d.LIVE_BUS_PPLTN;
    if (p) {
        lines.push(
            `당일 누적 승차 ${val(p['BUS_ACML_GTON_PPLTN_MIN'])}~${val(p['BUS_ACML_GTON_PPLTN_MAX'])}명 | ` +
                `하차 ${val(p['BUS_ACML_GTOFF_PPLTN_MIN'])}~${val(p['BUS_ACML_GTOFF_PPLTN_MAX'])}명`,
            `최근 30분 승차 ${val(p['BUS_30WTHN_GTON_PPLTN_MIN'])}~${val(p['BUS_30WTHN_GTON_PPLTN_MAX'])}명 | ` +
                `하차 ${val(p['BUS_30WTHN_GTOFF_PPLTN_MIN'])}~${val(p['BUS_30WTHN_GTOFF_PPLTN_MAX'])}명`,
        );
    }
    return section('버스', lines);
}

function formatBike(d: Citydata): string {
    const spots = d.SBIKE_STTS ?? [];
    if (spots.length === 0) return section('따릉이', []);
    const lines = ['대여소 | 주차/거치대'];
    for (const s of spots.slice(0, LIST_CAP)) {
        lines.push(`${val(s.SBIKE_SPOT_NM)} | ${val(s.SBIKE_PARKING_CNT)}/${val(s.SBIKE_RACK_CNT)}`);
    }
    lines.push(...capNote(spots.length, Math.min(spots.length, LIST_CAP)));
    return section('따릉이', lines);
}

function formatCharger(d: Citydata): string {
    const stations = d.CHARGER_STTS ?? [];
    if (stations.length === 0) return section('전기차충전소', []);
    const lines: string[] = [];
    for (const s of stations.slice(0, LIST_CAP)) {
        const detail = (s.CHARGER_DETAILS ?? [])
            .map((c) => `${val(c.CHARGER_TYPE)} ${val(c.CHARGER_STAT)}`)
            .join(', ');
        lines.push(`${val(s.STAT_NM)} | ${detail || '-'}`);
    }
    lines.push(...capNote(stations.length, Math.min(stations.length, LIST_CAP)));
    return section('전기차충전소', lines);
}

function formatWeather(d: Citydata): string {
    const w = d.WEATHER_STTS?.[0];
    if (!w) return section('날씨', []);
    const lines = [
        `기온 ${val(w.TEMP)}℃ (최저 ${val(w.MIN_TEMP)}/최고 ${val(w.MAX_TEMP)}) | 습도 ${val(w.HUMIDITY)}% | ` +
            `강수 ${val(w.PRECPT_TYPE)} ${val(w.PRECIPITATION)}`,
        `미세먼지 ${val(w.PM10_INDEX)}(${val(w.PM10)}) | 초미세먼지 ${val(w.PM25_INDEX)}(${val(w.PM25)}) | ` +
            `통합대기 ${val(w.AIR_IDX)} | 자외선 ${val(w.UV_INDEX_LVL)}`,
        `${val(w.PCP_MSG)} (${val(w.WEATHER_TIME)} 기준)`,
    ];
    const fcst = w.FCST24HOURS ?? [];
    if (fcst.length > 0) {
        lines.push('예보:');
        for (const f of fcst.slice(0, FORECAST_CAP)) {
            lines.push(`  ${val(f.FCST_DT)} | ${val(f.SKY_STTS)} | ${val(f.TEMP)}℃ | 강수확률 ${val(f.RAIN_CHANCE)}%`);
        }
        lines.push(...capNote(fcst.length, Math.min(fcst.length, FORECAST_CAP)));
    }
    return section('날씨', lines);
}

function formatEvent(d: Citydata): string {
    const events = d.EVENT_STTS ?? [];
    if (events.length === 0) return section('문화행사', []);
    const lines = ['행사명 | 기간 | 장소 | 유/무료'];
    for (const e of events.slice(0, LIST_CAP)) {
        lines.push(`${val(e.EVENT_NM)} | ${val(e.EVENT_PERIOD)} | ${val(e.EVENT_PLACE)} | ${val(e.PAY_YN)}`);
    }
    lines.push(...capNote(events.length, Math.min(events.length, LIST_CAP)));
    return section('문화행사', lines);
}

function formatCommercial(d: Citydata): string {
    const c = d.LIVE_CMRCL_STTS;
    if (!c) return section('상권', []);
    const lines = [
        `활성도: ${val(c.AREA_CMRCL_LVL)} | 결제 ${val(c.AREA_SH_PAYMENT_CNT)}건, ` +
            `${val(c.AREA_SH_PAYMENT_AMT_MIN)}~${val(c.AREA_SH_PAYMENT_AMT_MAX)}원 (${val(c.CMRCL_TIME)} 기준)`,
    ];
    const rsb = c.CMRCL_RSB ?? [];
    if (rsb.length > 0) {
        lines.push('업종별:');
        for (const r of rsb.slice(0, 5)) {
            lines.push(`  ${val(r.RSB_MID_CTGR)} | ${val(r.RSB_PAYMENT_LVL)} | ${val(r.RSB_SH_PAYMENT_CNT)}건`);
        }
        lines.push(...capNote(rsb.length, Math.min(rsb.length, 5)));
    }
    return section('상권', lines);
}

function formatAccident(d: Citydata): string {
    const items = d.ACDNT_CNTRL_STTS ?? [];
    if (items.length === 0) return section('사고통제', []);
    const lines: string[] = [];
    for (const a of items.slice(0, LIST_CAP)) {
        lines.push(`${val(a.ACDNT_TYPE)}/${val(a.ACDNT_DTYPE)} | ${val(a.ACDNT_INFO)} | ~${val(a.EXP_CLR_DT)}`);
    }
    lines.push(...capNote(items.length, Math.min(items.length, LIST_CAP)));
    return section('사고통제', lines);
}

function formatAlert(d: Citydata): string {
    const items = d.LIVE_DST_MESSAGE ?? [];
    const lines = items
        .slice(0, LIST_CAP)
        .map((m) => `[${val(m.DST_SE_NM)}/${val(m.EMRG_STEP_NM)}] ${val(m.MSG_CN)} (${val(m.CRT_DT)})`);
    return section('긴급재난문자', lines);
}

function formatNews(d: Citydata): string {
    const items = d.LIVE_YNA_NEWS ?? [];
    const lines = items
        .slice(0, LIST_CAP)
        .map((n) => `${val(n.YNA_TTL)} (${val(n.YNA_WRTR_NM)}, ${val(n.YNA_YMD)})`);
    return section('연합뉴스', lines);
}

const FORMATTERS: Record<Category, (d: Citydata) => string> = {
    population: formatPopulation,
    traffic: formatTraffic,
    parking: formatParking,
    subway: formatSubway,
    bus: formatBus,
    bike: formatBike,
    charger: formatCharger,
    weather: formatWeather,
    event: formatEvent,
    commercial: formatCommercial,
    accident: formatAccident,
    alert: formatAlert,
    news: formatNews,
};

export function formatCitydata(d: Citydata, categories: readonly Category[]): string {
    const header = `# ${d.AREA_NM ?? '(장소명 없음)'} (${d.AREA_CD ?? '-'})`;
    const sections = categories.map((c) => FORMATTERS[c](d));
    return [header, ...sections].join('\n\n');
}

export function formatPlaceList(places: readonly Place[], query?: string): string {
    const q = query?.trim();
    const filtered = q ? places.filter((p) => p.name.includes(q)) : places;
    if (filtered.length === 0) {
        return `'${q}' 에 해당하는 장소가 없습니다. query 없이 호출하면 전체 목록을 볼 수 있습니다.`;
    }
    const lines = ['장소명 | 분류'];
    for (const p of filtered) {
        lines.push(`${p.name} | ${p.category}`);
    }
    lines.push('', `${filtered.length}곳.`);
    return lines.join('\n');
}

const LEVEL_ORDER = ['붐빔', '약간 붐빔', '보통', '여유'] as const;

export function formatCongestionRanking(s: CongestionSnapshot, top: number, category?: string): string {
    const filtered = category ? s.entries.filter((e) => e.category === category) : s.entries;
    if (filtered.length === 0) {
        return `'${category}' 분류에 해당하는 혼잡도 데이터가 없습니다.`;
    }
    const shown = filtered.slice(0, top);
    const scope = category ? ` — ${category}` : '';
    const lines = [`# 서울 실시간 혼잡도 순위 (상위 ${shown.length}곳 / 전체 ${filtered.length}곳${scope})`, ''];
    shown.forEach((e, i) => {
        const ppltn = e.ppltnMin && e.ppltnMax ? ` | ${e.ppltnMin}~${e.ppltnMax}명` : '';
        lines.push(`${i + 1}. ${e.name} | ${e.level} | ${e.category}${ppltn}`);
    });
    const dist = LEVEL_ORDER.map((lvl) => ({ lvl, n: filtered.filter((e) => e.level === lvl).length }))
        .filter((d) => d.n > 0)
        .map((d) => `${d.lvl} ${d.n}곳`)
        .join(' | ');
    lines.push('', `단계별 분포: ${dist}`);
    if (s.source === 'dashboard') {
        lines.push('주의: 같은 단계 내 순서는 의미가 없습니다 (붐빔 > 약간 붐빔 > 보통 > 여유).');
        lines.push('데이터 경로: SeoulRtd 대시보드');
    } else {
        const time = shown[0]?.time;
        if (time) lines.push(`기준 시각: ${time}`);
        if (s.failedCount > 0) lines.push(`조회 실패 ${s.failedCount}곳 제외.`);
        lines.push('데이터 경로: 공식 citydata_ppltn API');
    }
    lines.push('출처: 서울 열린데이터광장(서울특별시)');
    return lines.join('\n');
}
