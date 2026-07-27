import { describe, expect, it } from 'vitest';
import { runHttp } from '../../../packages/mcp-server/src/http-server.js';

describe('MCP HTTP embedded lifecycle', () => {
  it('starts, serves, stops idempotently, and restarts without owning SIGINT', async () => {
    const sigintBefore = process.listenerCount('SIGINT');
    const first = await runHttp(':0');
    const firstPort = first.port;

    try {
      expect(first.transport).toBe('http');
      expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
      const response = await fetch(first.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });
      expect(response.status).toBe(200);
      expect((await response.json()) as { id: number }).toMatchObject({ id: 1 });
    } finally {
      await Promise.all([first.stop(), first.stop()]);
    }

    await expect(first.done).resolves.toBeUndefined();
    expect(process.listenerCount('SIGINT')).toBe(sigintBefore);

    const second = await runHttp(`127.0.0.1:${firstPort}`);
    try {
      expect(second.port).toBe(firstPort);
      expect(process.listenerCount('SIGINT')).toBe(sigintBefore);
    } finally {
      await second.stop();
    }
  });
});
