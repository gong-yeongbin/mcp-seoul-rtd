// fixture 기반으로 formatCitydata / formatPlaceList 의 렌더링을 검증하는 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, formatCitydata, formatCongestionRanking, formatPlaceList } from '../src/format.ts';
import type { Citydata } from '../src/client.ts';
import type { CongestionSnapshot } from '../src/congestion.ts';

const fixture = JSON.parse(
    readFileSync(new URL('./fixtures/citydata.json', import.meta.url), 'utf8'),
) as { CITYDATA: Citydata };
const data = fixture.CITYDATA;

test('전체 카테고리를 렌더링하면 모든 섹션 헤더가 나온다', () => {
    const text = formatCitydata(data, CATEGORIES);
    assert.match(text, /^# 광화문·덕수궁 \(POI009\)/);
    for (const title of ['실시간 인구', '도로소통', '주차장', '지하철', '버스', '따릉이', '전기차충전소', '날씨', '문화행사', '상권', '사고통제', '긴급재난문자', '연합뉴스']) {
        assert.match(text, new RegExp(`## ${title}`), `${title} 섹션이 없습니다`);
    }
});

test('카테고리를 고르면 그 섹션만 나온다', () => {
    const text = formatCitydata(data, ['population']);
    assert.match(text, /## 실시간 인구/);
    assert.match(text, /혼잡도: /);
    assert.doesNotMatch(text, /## 날씨/);
    assert.doesNotMatch(text, /## 주차장/);
});

test('목록형 데이터는 상한을 넘으면 잘라내고 표시한다', () => {
    const text = formatCitydata(data, ['parking']);
    assert.match(text, /12건 중 10건 표시/);
});

test('예측 목록도 상한을 적용한다', () => {
    const text = formatCitydata(data, ['population']);
    assert.match(text, /8건 중 6건 표시/);
});

test('빈 목록 섹션은 (데이터 없음) 으로 나온다', () => {
    const text = formatCitydata(data, ['alert', 'news']);
    assert.match(text, /## 긴급재난문자\n\(데이터 없음\)/);
    assert.match(text, /## 연합뉴스\n\(데이터 없음\)/);
});

test('formatPlaceList 는 전체 목록과 개수를 렌더링한다', () => {
    const text = formatPlaceList([
        { name: '광화문·덕수궁', category: '고궁·문화유산' },
        { name: '강남역', category: '인구밀집지역' },
    ]);
    assert.match(text, /광화문·덕수궁 \| 고궁·문화유산/);
    assert.match(text, /2곳\./);
});

test('formatPlaceList 는 query 로 필터링한다', () => {
    const places = [
        { name: '광화문·덕수궁', category: '고궁·문화유산' },
        { name: '강남역', category: '인구밀집지역' },
    ];
    const text = formatPlaceList(places, '강남');
    assert.match(text, /강남역/);
    assert.doesNotMatch(text, /광화문/);
    assert.match(formatPlaceList(places, '없는곳'), /해당하는 장소가 없습니다/);
});

const dashboardSnapshot: CongestionSnapshot = {
    source: 'dashboard',
    entries: [
        { name: '보라매공원', category: '공원', level: '붐빔', levelNum: 4 },
        { name: '강남역', category: '인구밀집지역', level: '약간 붐빔', levelNum: 3 },
        { name: '가락시장', category: '발달상권', level: '보통', levelNum: 2 },
        { name: '난지한강공원', category: '공원', level: '여유', levelNum: 1 },
    ],
    failedCount: 0,
};

test('formatCongestionRanking 은 순위·분포·출처를 렌더링한다', () => {
    const text = formatCongestionRanking(dashboardSnapshot, 10);
    assert.match(text, /# 서울 실시간 혼잡도 순위 \(상위 4곳 \/ 전체 4곳\)/);
    assert.match(text, /1\. 보라매공원 \| 붐빔 \| 공원/);
    assert.match(text, /단계별 분포: 붐빔 1곳 \| 약간 붐빔 1곳 \| 보통 1곳 \| 여유 1곳/);
    assert.match(text, /같은 단계 내 순서는 의미가 없습니다/);
    assert.match(text, /데이터 경로: SeoulRtd 대시보드/);
    assert.match(text, /출처: 서울 열린데이터광장\(서울특별시\)/);
});

test('formatCongestionRanking 은 top 으로 상위만 자른다', () => {
    const text = formatCongestionRanking(dashboardSnapshot, 2);
    assert.match(text, /상위 2곳 \/ 전체 4곳/);
    assert.match(text, /2\. 강남역/);
    assert.doesNotMatch(text, /3\. 가락시장/);
});

test('formatCongestionRanking 은 category 로 필터링한다', () => {
    const text = formatCongestionRanking(dashboardSnapshot, 10, '공원');
    assert.match(text, /전체 2곳 — 공원/);
    assert.match(text, /보라매공원/);
    assert.doesNotMatch(text, /강남역/);
    assert.match(formatCongestionRanking({ ...dashboardSnapshot, entries: [] }, 10, '공원'), /해당하는 혼잡도 데이터가 없습니다/);
});

test('formatCongestionRanking 폴백 모드는 인구수·기준 시각·실패 수를 표기한다', () => {
    const official: CongestionSnapshot = {
        source: 'official',
        entries: [
            { name: '보라매공원', category: '공원', level: '붐빔', levelNum: 4, ppltnMin: '80000', ppltnMax: '90000', time: '2026-08-13 09:05' },
            { name: '강남역', category: '인구밀집지역', level: '붐빔', levelNum: 4, ppltnMin: '45000', ppltnMax: '50000', time: '2026-08-13 09:05' },
        ],
        failedCount: 3,
    };
    const text = formatCongestionRanking(official, 10);
    assert.match(text, /1\. 보라매공원 \| 붐빔 \| 공원 \| 80000~90000명/);
    assert.match(text, /기준 시각: 2026-08-13 09:05/);
    assert.match(text, /조회 실패 3곳 제외\./);
    assert.match(text, /데이터 경로: 공식 citydata_ppltn API/);
    assert.doesNotMatch(text, /같은 단계 내 순서는 의미가 없습니다/);
});
