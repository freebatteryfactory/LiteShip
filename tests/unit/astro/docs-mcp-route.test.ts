import { describe, expect, test, vi, afterEach } from 'vitest';
import { docsMcpRoute, loadDocsMcpBundle } from '../../../packages/astro/src/docs-mcp-route.js';
import { emitDocsBundle } from '../../../scripts/docs-bundle.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('docsMcpRoute (#113)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('list/search/get round-trip over a sealed bundle', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    const bundle = loadDocsMcpBundle(dir);
    const route = docsMcpRoute(bundle);

    const list = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'docs/list' }),
      }),
    );
    const listJson = (await list.json()) as { result: { paths: string[] } };
    expect(listJson.result.paths).toContain('GLOSSARY.md');

    const get = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'docs/get', params: { path: 'GLOSSARY.md' } }),
      }),
    );
    const getJson = (await get.json()) as { result: { text: string } };
    expect(getJson.result.text).toContain('LiteShip');
  });
});
