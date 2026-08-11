// resolvePlace 의 장소명/코드 해석 규칙을 검증하는 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLACES, resolvePlace } from '../src/places.ts';

test('장소는 121곳이다', () => {
    assert.equal(PLACES.length, 121);
});

test('정확한 이름은 그대로 반환한다', () => {
    assert.equal(resolvePlace('광화문·덕수궁'), '광화문·덕수궁');
});

test('유일한 부분 일치는 전체 이름으로 확장한다', () => {
    assert.equal(resolvePlace('난지'), '난지한강공원');
});

test('정확 일치가 부분 일치보다 우선한다', () => {
    // '여의도' 는 '여의도한강공원' 의 부분 문자열이기도 하다
    assert.equal(resolvePlace('여의도'), '여의도');
});

test('장소코드는 대문자로 통과시킨다', () => {
    assert.equal(resolvePlace('poi009'), 'POI009');
});

test('복수 일치는 후보 목록과 함께 실패한다', () => {
    // '광화문' 은 광화문·덕수궁, 광화문광장 두 곳에 걸린다
    assert.throws(() => resolvePlace('광화문'), /해당하는 장소가 \d+곳입니다/);
});

test('목록에 없는 이름은 그대로 API 로 전달한다', () => {
    assert.equal(resolvePlace('미래에생긴새장소'), '미래에생긴새장소');
});

test('앞뒤 공백은 무시한다', () => {
    assert.equal(resolvePlace('  광화문·덕수궁  '), '광화문·덕수궁');
});
