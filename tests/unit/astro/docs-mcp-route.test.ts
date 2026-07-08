import { describe, expect, test, vi, afterEach } from 'vitest';
import { docsMcpRoute, loadDocsMcpBundle } from '../../../packages/astro/src/docs-mcp-route.js';
import { emitDocsBundle } from '../../../scripts/docs-bundle.ts';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

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

  test('unknown doc path returns a JSON-RPC error, not a throw', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    const route = docsMcpRoute(loadDocsMcpBundle(dir));

    const res = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'docs/get', params: { path: 'NOPE.md' } }),
      }),
    );
    const json = (await res.json()) as { result: { error?: { code: number } } };
    expect(json.result.error?.code).toBe(-32602);
  });

  test('manifest-listed doc MISSING on disk throws loudly — integrity loss is never laundered to "unknown doc"', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    const bundle = loadDocsMcpBundle(dir);

    // Corrupt the sealed bundle: the manifest still lists the entry, the bytes are gone.
    const filesDir = join(dir, 'files');
    for (const file of readdirSync(filesDir)) {
      rmSync(join(filesDir, file));
    }

    expect(() => bundle.readDoc('GLOSSARY.md')).toThrow(/ENOENT/);

    // The route boundary answers with a STRUCTURED JSON-RPC internal error —
    // never "Unknown doc", never a raw escaped throw (framework 500 + stack).
    const route = docsMcpRoute(bundle);
    const events = await captureDiagnosticsAsync(async ({ events }) => {
      const res = await route(
        new Request('http://localhost/mcp', {
          method: 'POST',
          body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'docs/get', params: { path: 'GLOSSARY.md' } }),
        }),
      );
      const json = (await res.json()) as { result: { error?: { code: number; message: string } } };
      expect(json.result.error?.code).toBe(-32603);
      expect(json.result.error?.message).not.toContain('ENOENT'); // no raw detail leaks to the client
      return [...events];
    });
    expect(events.map((event) => event.code)).toContain('docs-bundle-corruption');
  });

  test('manifest-listed doc whose BYTES drifted after docs:bundle throws (content-addressed seal)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });

    const filesDir = join(dir, 'files');
    const [file] = readdirSync(filesDir);
    writeFileSync(join(filesDir, file!), 'tampered content after sealing');

    const bundle = loadDocsMcpBundle(dir);
    expect(() => bundle.readDoc('GLOSSARY.md')).toThrow(/does not match its sealed manifest hash/);
  });
});
