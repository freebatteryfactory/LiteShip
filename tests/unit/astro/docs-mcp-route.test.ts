import { describe, expect, test, vi, afterEach } from 'vitest';
import { docsMcpRoute, loadDocsMcpBundle } from '../../../packages/astro/src/docs-mcp-route.js';
import { emitDocsBundle } from '../../../scripts/docs-bundle.ts';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureDiagnosticsAsync } from '../../helpers/diagnostics.js';

/** JSON-RPC 2.0 response envelope. `error` XOR `result` — never both, never neither. */
type JsonRpcResponse = {
  jsonrpc?: string;
  id?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/**
 * Assert the JSON-RPC XOR invariant: exactly one of `error` / `result` is
 * present. This is the contract F-PROTO-1 restores — a failure must surface as
 * a top-level `error`, never be laundered into a `result` success envelope.
 */
function expectErrorXorResult(json: JsonRpcResponse): void {
  expect(json.jsonrpc).toBe('2.0');
  const hasError = json.error !== undefined;
  const hasResult = json.result !== undefined;
  expect(hasError !== hasResult).toBe(true); // exactly one, never both, never neither
}

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
    const listJson = (await list.json()) as JsonRpcResponse & { result: { paths: string[] } };
    expectErrorXorResult(listJson); // success carries result, NO error
    expect(listJson.error).toBeUndefined();
    expect(listJson.result.paths).toContain('GLOSSARY.md');

    const get = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'docs/get', params: { path: 'GLOSSARY.md' } }),
      }),
    );
    const getJson = (await get.json()) as JsonRpcResponse & { result: { text: string } };
    expectErrorXorResult(getJson);
    expect(getJson.error).toBeUndefined();
    expect(getJson.result.text).toContain('LiteShip');

    const search = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'docs/search', params: { query: 'glossary' } }),
      }),
    );
    const searchJson = (await search.json()) as JsonRpcResponse & { result: { hits: string[] } };
    expectErrorXorResult(searchJson);
    expect(searchJson.error).toBeUndefined();
    expect(searchJson.result.hits).toContain('GLOSSARY.md');
  });

  test('malformed JSON body → TOP-LEVEL parse error (-32700, id: null), never a result envelope', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    const route = docsMcpRoute(loadDocsMcpBundle(dir));

    const res = await route(
      new Request('http://localhost/mcp', { method: 'POST', body: '{ not: valid json' }),
    );
    expect(res.status).toBe(200); // JSON-RPC-over-HTTP: transport OK, the RPC failed
    const json = (await res.json()) as JsonRpcResponse;
    expectErrorXorResult(json);
    expect(json.error?.code).toBe(-32700);
    expect(json.id).toBeNull(); // id could not be read → null per JSON-RPC 2.0
    expect(json.result).toBeUndefined();
  });

  test('unknown method → TOP-LEVEL method-not-found error (-32601), never nested under result', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    const route = docsMcpRoute(loadDocsMcpBundle(dir));

    const res = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'docs/nope' }),
      }),
    );
    const json = (await res.json()) as JsonRpcResponse;
    expectErrorXorResult(json);
    expect(json.error?.code).toBe(-32601);
    expect(json.id).toBe(99);
    expect(json.result).toBeUndefined();
  });

  test('unknown doc path → TOP-LEVEL invalid-params error (-32602), not laundered into result', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    const route = docsMcpRoute(loadDocsMcpBundle(dir));

    const res = await route(
      new Request('http://localhost/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'docs/get', params: { path: 'NOPE.md' } }),
      }),
    );
    const json = (await res.json()) as JsonRpcResponse;
    expectErrorXorResult(json);
    expect(json.error?.code).toBe(-32602);
    expect(json.result).toBeUndefined();
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

    // The route boundary answers with a STRUCTURED JSON-RPC internal error carried
    // in the TOP-LEVEL `error` member — never "Unknown doc", never a raw escaped
    // throw (framework 500 + stack), never a `result` success envelope.
    const route = docsMcpRoute(bundle);
    const events = await captureDiagnosticsAsync(async ({ events }) => {
      const res = await route(
        new Request('http://localhost/mcp', {
          method: 'POST',
          body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'docs/get', params: { path: 'GLOSSARY.md' } }),
        }),
      );
      const json = (await res.json()) as JsonRpcResponse;
      expectErrorXorResult(json);
      expect(json.error?.code).toBe(-32603);
      expect(json.error?.message).not.toContain('ENOENT'); // no raw detail leaks to the client
      expect(json.result).toBeUndefined();
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

  test('tampered top-level bundleId with valid entry shas is rejected at load', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-docs-bundle-'));
    const manifest = await emitDocsBundle({ outDir: dir, sources: ['GLOSSARY.md'], version: 'test' });
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ ...manifest, bundleId: '0'.repeat(64) }, null, 2) + '\n',
    );
    expect(() => loadDocsMcpBundle(dir)).toThrow(/docs-bundle-id-mismatch/);
  });
});
