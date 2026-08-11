#!/usr/bin/env node
// MCP 서버 엔트리. 설정을 읽고 stdio 로 서버를 띄운다.

import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { loadConfig } from './config.ts';
import { createClient } from './client.ts';
import { buildServer } from './server.ts';

async function main() {
    const config = loadConfig();
    const server = buildServer(createClient(config.apiKey));
    await server.connect(new StdioServerTransport());
    // stdout 은 JSON-RPC 전용이다. 로그는 반드시 stderr 로 보낸다.
    console.error('mcp-seoul-rtd 시작.');
}

main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
});
