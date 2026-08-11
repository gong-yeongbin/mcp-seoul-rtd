#!/usr/bin/env node
// MCP 서버 엔트리. tool 을 등록하고 stdio 로 요청을 받는다.

import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

export function buildServer(): McpServer {
    const server = new McpServer({ name: 'mcp-seoul-rtd', version: '0.1.0' });
    // tool 은 사용할 API 가 확정되면 등록한다.
    return server;
}

async function main() {
    const server = buildServer();
    await server.connect(new StdioServerTransport());
    // stdout 은 JSON-RPC 전용이다. 로그는 반드시 stderr 로 보낸다.
    console.error('mcp-seoul-rtd 시작.');
}

main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
});
