import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('MCP public import purity', () => {
  it('imports every server/barrel entry without sockets or process-signal ownership', async () => {
    const getActiveHandles = (process as NodeJS.Process & { _getActiveHandles(): readonly object[] })._getActiveHandles;
    const beforeHandles = new Set(getActiveHandles.call(process));
    const beforeSignals = Object.fromEntries(
      ['SIGINT', 'SIGTERM'].map((name) => [name, process.listenerCount(name as NodeJS.Signals)]),
    );

    await import('../../../packages/mcp-server/src/index.js');
    await import('../../../packages/mcp-server/src/http.js');
    await import('../../../packages/mcp-server/src/stdio.js');
    await import('../../../packages/mcp-server/src/http-server.js');
    await import('../../../packages/mcp-server/src/stdio-server.js');
    await new Promise<void>((resolveTurn) => setImmediate(resolveTurn));

    const addedHandleTypes = getActiveHandles
      .call(process)
      .filter((handle) => !beforeHandles.has(handle))
      .map((handle) => handle.constructor.name);
    const afterSignals = Object.fromEntries(
      ['SIGINT', 'SIGTERM'].map((name) => [name, process.listenerCount(name as NodeJS.Signals)]),
    );
    expect(addedHandleTypes).not.toContain('Server');
    expect(afterSignals).toEqual(beforeSignals);
  });

  it('keeps pure transports disconnected from executable bootstrap modules', () => {
    const http = readFileSync(resolve(REPO, 'packages/mcp-server/src/http.ts'), 'utf8');
    const stdio = readFileSync(resolve(REPO, 'packages/mcp-server/src/stdio.ts'), 'utf8');
    const httpServer = readFileSync(resolve(REPO, 'packages/mcp-server/src/http-server.ts'), 'utf8');
    const stdioServer = readFileSync(resolve(REPO, 'packages/mcp-server/src/stdio-server.ts'), 'utf8');

    expect(http).not.toMatch(/import\s+['"]\.\/http-server\.js['"]/u);
    expect(stdio).not.toMatch(/import\s+['"]\.\/stdio-server\.js['"]/u);
    expect(httpServer).not.toMatch(/argv\[1\].*endsWith/u);
    expect(stdioServer).not.toMatch(/argv\[1\].*endsWith/u);
  });
});
