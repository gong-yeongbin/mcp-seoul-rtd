// fixture 기반으로 formatCitydata / formatPlaceList 의 렌더링을 검증하는 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, formatCitydata, formatPlaceList } from '../src/format.ts';
import type { Citydata } from '../src/client.ts';

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
