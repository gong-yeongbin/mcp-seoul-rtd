// 실시간 도시데이터가 제공되는 서울 주요 121개 장소 목록과 장소명 해석 로직

export interface Place {
    name: string;
    category: string;
}

// 서울 실시간 도시데이터 대시보드(data.seoul.go.kr/SeoulRtd) 기준. 2026-08-11 확보.
export const PLACES: readonly Place[] = [
    { name: '강남 MICE 관광특구', category: '관광특구' },
    { name: '동대문 관광특구', category: '관광특구' },
    { name: '명동 관광특구', category: '관광특구' },
    { name: '이태원 관광특구', category: '관광특구' },
    { name: '잠실 관광특구', category: '관광특구' },
    { name: '종로·청계 관광특구', category: '관광특구' },
    { name: '홍대 관광특구', category: '관광특구' },
    { name: '경복궁', category: '고궁·문화유산' },
    { name: '광화문·덕수궁', category: '고궁·문화유산' },
    { name: '보신각', category: '고궁·문화유산' },
    { name: '서울 암사동 유적', category: '고궁·문화유산' },
    { name: '창덕궁·종묘', category: '고궁·문화유산' },
    { name: '가산디지털단지역', category: '인구밀집지역' },
    { name: '강남역', category: '인구밀집지역' },
    { name: '건대입구역', category: '인구밀집지역' },
    { name: '고덕역', category: '인구밀집지역' },
    { name: '고속터미널역', category: '인구밀집지역' },
    { name: '교대역', category: '인구밀집지역' },
    { name: '구로디지털단지역', category: '인구밀집지역' },
    { name: '구로역', category: '인구밀집지역' },
    { name: '군자역', category: '인구밀집지역' },
    { name: '대림역', category: '인구밀집지역' },
    { name: '동대문역', category: '인구밀집지역' },
    { name: '뚝섬역', category: '인구밀집지역' },
    { name: '미아사거리역', category: '인구밀집지역' },
    { name: '발산역', category: '인구밀집지역' },
    { name: '사당역', category: '인구밀집지역' },
    { name: '삼각지역', category: '인구밀집지역' },
    { name: '서울대입구역', category: '인구밀집지역' },
    { name: '서울식물원·마곡나루역', category: '인구밀집지역' },
    { name: '서울역', category: '인구밀집지역' },
    { name: '선릉역', category: '인구밀집지역' },
    { name: '성신여대입구역', category: '인구밀집지역' },
    { name: '수유역', category: '인구밀집지역' },
    { name: '숭례문', category: '인구밀집지역' },
    { name: '시의회 앞', category: '인구밀집지역' },
    { name: '신논현역·논현역', category: '인구밀집지역' },
    { name: '신도림역', category: '인구밀집지역' },
    { name: '신림역', category: '인구밀집지역' },
    { name: '신정네거리역', category: '인구밀집지역' },
    { name: '신촌·이대역', category: '인구밀집지역' },
    { name: '쌍문역', category: '인구밀집지역' },
    { name: '양재역', category: '인구밀집지역' },
    { name: '역삼역', category: '인구밀집지역' },
    { name: '연신내역', category: '인구밀집지역' },
    { name: '오목교역·목동운동장', category: '인구밀집지역' },
    { name: '왕십리역', category: '인구밀집지역' },
    { name: '용산역', category: '인구밀집지역' },
    { name: '이태원역', category: '인구밀집지역' },
    { name: '잠실새내역', category: '인구밀집지역' },
    { name: '잠실역', category: '인구밀집지역' },
    { name: '장지역', category: '인구밀집지역' },
    { name: '장한평역', category: '인구밀집지역' },
    { name: '천호역', category: '인구밀집지역' },
    { name: '총신대입구(이수)역', category: '인구밀집지역' },
    { name: '충정로역', category: '인구밀집지역' },
    { name: '합정역', category: '인구밀집지역' },
    { name: '혜화역', category: '인구밀집지역' },
    { name: '홍대입구역(2호선)', category: '인구밀집지역' },
    { name: '회기역', category: '인구밀집지역' },
    { name: 'DDP(동대문디자인플라자)', category: '발달상권' },
    { name: 'DMC(디지털미디어시티)', category: '발달상권' },
    { name: '가락시장', category: '발달상권' },
    { name: '가로수길', category: '발달상권' },
    { name: '광장(전통)시장', category: '발달상권' },
    { name: '김포공항', category: '발달상권' },
    { name: '남대문시장', category: '발달상권' },
    { name: '노량진', category: '발달상권' },
    { name: '덕수궁길·정동길', category: '발달상권' },
    { name: '북창동 먹자골목', category: '발달상권' },
    { name: '북촌한옥마을', category: '발달상권' },
    { name: '서촌', category: '발달상권' },
    { name: '성수카페거리', category: '발달상권' },
    { name: '송리단길·호수단길', category: '발달상권' },
    { name: '신촌 스타광장', category: '발달상권' },
    { name: '압구정로데오거리', category: '발달상권' },
    { name: '여의도', category: '발달상권' },
    { name: '연남동', category: '발달상권' },
    { name: '영등포 타임스퀘어', category: '발달상권' },
    { name: '용리단길', category: '발달상권' },
    { name: '이태원 앤틱가구거리', category: '발달상권' },
    { name: '익선동', category: '발달상권' },
    { name: '인사동', category: '발달상권' },
    { name: '잠실롯데타워·석촌호수', category: '발달상권' },
    { name: '창동 신경제 중심지', category: '발달상권' },
    { name: '청담동 명품거리', category: '발달상권' },
    { name: '청량리 제기동 일대 전통시장', category: '발달상권' },
    { name: '해방촌·경리단길', category: '발달상권' },
    { name: '강서한강공원', category: '공원' },
    { name: '고척돔', category: '공원' },
    { name: '광나루한강공원', category: '공원' },
    { name: '광화문광장', category: '공원' },
    { name: '국립중앙박물관·용산가족공원', category: '공원' },
    { name: '난지한강공원', category: '공원' },
    { name: '남산공원', category: '공원' },
    { name: '노들섬', category: '공원' },
    { name: '뚝섬한강공원', category: '공원' },
    { name: '망원한강공원', category: '공원' },
    { name: '반포한강공원', category: '공원' },
    { name: '보라매공원', category: '공원' },
    { name: '북서울꿈의숲', category: '공원' },
    { name: '서대문독립공원', category: '공원' },
    { name: '서리풀공원·몽마르뜨공원', category: '공원' },
    { name: '서울대공원', category: '공원' },
    { name: '서울숲공원', category: '공원' },
    { name: '송현녹지광장', category: '공원' },
    { name: '아차산', category: '공원' },
    { name: '안양천', category: '공원' },
    { name: '양화한강공원', category: '공원' },
    { name: '어린이대공원', category: '공원' },
    { name: '여의도한강공원', category: '공원' },
    { name: '여의서로', category: '공원' },
    { name: '올림픽공원', category: '공원' },
    { name: '월드컵공원', category: '공원' },
    { name: '응봉산', category: '공원' },
    { name: '이촌한강공원', category: '공원' },
    { name: '잠실종합운동장', category: '공원' },
    { name: '잠실한강공원', category: '공원' },
    { name: '잠원한강공원', category: '공원' },
    { name: '청계산', category: '공원' },
    { name: '홍제폭포', category: '공원' },
];

/**
 * 사용자 입력을 API 호출용 장소 식별자로 해석한다.
 *
 * 장소코드(POIxxx)는 그대로 통과시키고, 이름은 정확 일치 → 유일한 부분 일치 순으로
 * 찾는다. 복수 일치면 후보를 안내하고, 목록에 없으면 입력을 그대로 API 에 전달해
 * 목록이 낡아도 신규 장소가 동작하게 한다.
 */
export function resolvePlace(input: string): string {
    const q = input.trim();
    if (/^POI\d{3}$/i.test(q)) return q.toUpperCase();

    const exact = PLACES.find((p) => p.name === q);
    if (exact) return exact.name;

    const partial = PLACES.filter((p) => p.name.includes(q));
    if (partial.length === 1) return partial[0]!.name;
    if (partial.length > 1) {
        throw new Error(
            `'${input}' 에 해당하는 장소가 ${partial.length}곳입니다. 하나를 선택하세요: ` +
                partial.map((p) => p.name).join(', '),
        );
    }
    return q;
}
