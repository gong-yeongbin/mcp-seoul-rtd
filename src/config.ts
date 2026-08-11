// SEOUL_OPEN_API_KEY 환경변수를 읽고 검증하는 모듈

export interface Config {
    apiKey: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
    const apiKey = env['SEOUL_OPEN_API_KEY']?.trim();
    if (!apiKey) {
        throw new Error(
            'SEOUL_OPEN_API_KEY 환경변수가 필요합니다. ' +
                'https://data.seoul.go.kr 에서 인증키를 발급받으세요. ' +
                "샘플키 'sample' 로는 '광화문·덕수궁' 만 조회할 수 있습니다.",
        );
    }
    return { apiKey };
}
