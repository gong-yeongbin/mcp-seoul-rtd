// 서울 열린데이터광장 citydata API 를 호출하는 fetch 클라이언트와 응답 타입

const BASE_URL = 'http://openapi.seoul.go.kr:8088';

/** 응답 중 format.ts 가 렌더링하는 필드만 타입으로 정의한다. 나머지는 무시된다. */
export interface Citydata {
    AREA_NM?: string;
    AREA_CD?: string;
    LIVE_PPLTN_STTS?: LivePpltn[];
    ROAD_TRAFFIC_STTS?: { AVG_ROAD_DATA?: AvgRoadData; ROAD_TRAFFIC_STTS?: unknown[] };
    PRK_STTS?: Parking[];
    SUB_STTS?: SubwayStation[];
    LIVE_SUB_PPLTN?: TransitPpltn;
    BUS_STN_STTS?: BusStop[];
    LIVE_BUS_PPLTN?: TransitPpltn;
    ACDNT_CNTRL_STTS?: Accident[];
    SBIKE_STTS?: Sbike[];
    WEATHER_STTS?: Weather[];
    CHARGER_STTS?: Charger[];
    EVENT_STTS?: CultureEvent[];
    LIVE_CMRCL_STTS?: Commercial;
    LIVE_DST_MESSAGE?: DisasterMessage[];
    LIVE_YNA_NEWS?: YnaNews[];
}

export interface LivePpltn {
    AREA_CONGEST_LVL?: string;
    AREA_CONGEST_MSG?: string;
    AREA_PPLTN_MIN?: string;
    AREA_PPLTN_MAX?: string;
    MALE_PPLTN_RATE?: string;
    FEMALE_PPLTN_RATE?: string;
    PPLTN_TIME?: string;
    FCST_PPLTN?: PpltnForecast[];
}

export interface PpltnForecast {
    FCST_TIME?: string;
    FCST_CONGEST_LVL?: string;
    FCST_PPLTN_MIN?: string;
    FCST_PPLTN_MAX?: string;
}

export interface AvgRoadData {
    ROAD_MSG?: string;
    ROAD_TRAFFIC_IDX?: string;
    ROAD_TRAFFIC_SPD?: string;
    ROAD_TRAFFIC_TIME?: string;
}

export interface Parking {
    PRK_NM?: string;
    CPCTY?: string;
    CUR_PRK_CNT?: string;
    CUR_PRK_YN?: string;
    PAY_YN?: string;
    RATES?: string;
    TIME_RATES?: string;
}

export interface SubwayStation {
    SUB_STN_NM?: string;
    SUB_STN_LINE?: string;
    SUB_DETAIL?: SubwayArrival[];
}

export interface SubwayArrival {
    SUB_ROUTE_NM?: string;
    SUB_DIR?: string;
    SUB_ARVTIME?: string;
}

export interface TransitPpltn {
    [key: string]: string | undefined;
}

export interface BusStop {
    BUS_STN_NM?: string;
    BUS_ARS_ID?: string;
}

export interface Accident {
    ACDNT_TYPE?: string;
    ACDNT_DTYPE?: string;
    ACDNT_INFO?: string;
    EXP_CLR_DT?: string;
}

export interface Sbike {
    SBIKE_SPOT_NM?: string;
    SBIKE_PARKING_CNT?: string;
    SBIKE_RACK_CNT?: string;
}

export interface Weather {
    TEMP?: string;
    MIN_TEMP?: string;
    MAX_TEMP?: string;
    HUMIDITY?: string;
    PRECIPITATION?: string;
    PRECPT_TYPE?: string;
    PCP_MSG?: string;
    PM10_INDEX?: string;
    PM10?: string;
    PM25_INDEX?: string;
    PM25?: string;
    AIR_IDX?: string;
    UV_INDEX_LVL?: string;
    WEATHER_TIME?: string;
    FCST24HOURS?: WeatherForecast[];
}

export interface WeatherForecast {
    FCST_DT?: string;
    TEMP?: string;
    SKY_STTS?: string;
    RAIN_CHANCE?: string;
}

export interface Charger {
    STAT_NM?: string;
    CHARGER_DETAILS?: ChargerDetail[];
}

export interface ChargerDetail {
    CHARGER_TYPE?: string;
    CHARGER_STAT?: string;
}

export interface CultureEvent {
    EVENT_NM?: string;
    EVENT_PERIOD?: string;
    EVENT_PLACE?: string;
    PAY_YN?: string | null;
    URL?: string;
}

export interface Commercial {
    AREA_CMRCL_LVL?: string;
    AREA_SH_PAYMENT_CNT?: string;
    AREA_SH_PAYMENT_AMT_MIN?: number | string;
    AREA_SH_PAYMENT_AMT_MAX?: number | string;
    CMRCL_RSB?: CommercialRsb[];
    CMRCL_TIME?: string;
}

export interface CommercialRsb {
    RSB_MID_CTGR?: string;
    RSB_PAYMENT_LVL?: string;
    RSB_SH_PAYMENT_CNT?: string;
}

export interface DisasterMessage {
    DST_SE_NM?: string;
    EMRG_STEP_NM?: string;
    MSG_CN?: string;
    CRT_DT?: string;
}

export interface YnaNews {
    YNA_TTL?: string;
    YNA_YMD?: string;
    YNA_WRTR_NM?: string;
}

/** 성공 시 RESULT 키가 'RESULT.CODE' 처럼 점을 포함하고, 오류 시 CODE 로 온다. */
interface ResultEnvelope {
    CODE?: string;
    MESSAGE?: string;
    'RESULT.CODE'?: string;
    'RESULT.MESSAGE'?: string;
}

export interface CitydataClient {
    fetchCitydata(area: string): Promise<Citydata>;
}

export function createClient(apiKey: string, fetchFn: typeof fetch = globalThis.fetch): CitydataClient {
    return {
        async fetchCitydata(area) {
            const url = `${BASE_URL}/${encodeURIComponent(apiKey)}/json/citydata/1/5/${encodeURIComponent(area)}`;
            const res = await fetchFn(url, { signal: AbortSignal.timeout(15_000) });
            if (!res.ok) {
                throw new Error(`서울 열린데이터광장 API 가 HTTP ${res.status} 를 반환했습니다.`);
            }
            const body = (await res.json()) as { RESULT?: ResultEnvelope; CITYDATA?: Citydata };
            const envelope = body.RESULT ?? {};
            const code = envelope['RESULT.CODE'] ?? envelope.CODE;
            const message = envelope['RESULT.MESSAGE'] ?? envelope.MESSAGE;
            if (code !== 'INFO-000') {
                throw new Error(`API 오류 ${code ?? '(코드 없음)'}: ${message ?? '알 수 없는 오류'}`);
            }
            if (!body.CITYDATA) {
                throw new Error('응답에 CITYDATA 가 없습니다.');
            }
            return body.CITYDATA;
        },
    };
}
