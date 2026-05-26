/**
 * CUT D6 — the MCP-app manifest, reachable as a resource + proven drift-free.
 *
 * The server feeds its REAL registries to the pure `@czap/compiler` projector and
 * serves the result at `liteship://mcp-app/manifest`. This is the integration seam
 * (the only place importing both @czap/mcp-server and @czap/command): it proves the
 * manifest is a true projection — no second source of truth, no orphan.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { COMMAND_CATALOG } from '@czap/command';
import {
  dispatch,
  listTools,
  listResources,
  listUiResources,
  listAppResources,
  listPrompts,
  mcpAppManifest,
} from '@czap/mcp-server';
import type { JsonRpcRequest } from '../../../packages/mcp-server/src/jsonrpc.js';

const MANIFEST_URI = 'liteship://mcp-app/manifest';

function req(method: string, params?: unknown, id: string | number = 1): JsonRpcRequest {
  return params === undefined
    ? { jsonrpc: '2.0', id, method }
    : { jsonrpc: '2.0', id, method, params: params as Record<string, unknown> };
}
async function result<T>(method: string, params?: unknown): Promise<T> {
  return ((await dispatch(req(method, params))) as { result: T }).result;
}
async function errCode(method: string, params?: unknown): Promise<number> {
  return ((await dispatch(req(method, params))) as { error: { code: number } }).error.code;
}

describe('D6 — manifest is reachable as a resource', () => {
  it('resources/list includes liteship://mcp-app/manifest as application/json (the final entry)', async () => {
    const r = await result<{ resources: Array<{ uri: string; mimeType: string }> }>('resources/list', {});
    const entry = r.resources.find((x) => x.uri === MANIFEST_URI);
    expect(entry).toBeDefined();
    expect(entry!.mimeType).toBe('application/json');
    expect(r.resources[r.resources.length - 1]!.uri).toBe(MANIFEST_URI);
  });

  it('resources/read returns the manifest JSON, deterministically', async () => {
    const a = await result<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>('resources/read', { uri: MANIFEST_URI });
    const b = await result<{ contents: Array<{ text: string }> }>('resources/read', { uri: MANIFEST_URI });
    expect(a.contents[0]!.mimeType).toBe('application/json');
    expect(a.contents[0]!.text).toBe(b.contents[0]!.text); // deterministic
    expect(() => JSON.parse(a.contents[0]!.text)).not.toThrow();
  });

  it('an unknown liteship://mcp-app/ uri → -32002 (resource not found)', async () => {
    expect(await errCode('resources/read', { uri: 'liteship://mcp-app/__nope__' })).toBe(-32002);
  });
});

describe('D6 — the manifest is a projection (NO drift, NO second source)', () => {
  it('KILLSHOT: manifest.tools deep-equals listTools() (same projection of the same descriptors)', () => {
    expect(mcpAppManifest().tools).toEqual(listTools());
  });

  it('manifest resources/uiResources/appResources/prompts equal the real registries verbatim', () => {
    const m = mcpAppManifest();
    expect(m.resources).toEqual(listResources());
    expect(m.uiResources).toEqual(listUiResources());
    expect(m.appResources).toEqual(listAppResources());
    expect(m.prompts).toEqual(listPrompts());
  });

  it('the capsule.inspect tool carries its UI link from the descriptor; appResources holds the matching view', () => {
    const m = mcpAppManifest();
    const inspect = m.tools.find((t) => t.name === 'capsule.inspect')!;
    expect(inspect._meta?.ui.resourceUri).toBe('ui://liteship/app/capsule-inspect');
    expect(m.appResources.map((r) => r.uri)).toContain('ui://liteship/app/capsule-inspect');
  });

  it('no manifest tool exists without a backing mcpExposed handler descriptor', () => {
    const m = mcpAppManifest();
    const backed = new Set(COMMAND_CATALOG.filter((d) => d.annotations?.mcpExposed).map((d) => d.name));
    for (const t of m.tools) expect(backed.has(t.name), `${t.name} has no backing handler`).toBe(true);
  });

  it('the manifest does NOT list itself in resources (no self-reference)', () => {
    expect(mcpAppManifest().resources.map((r) => r.uri)).not.toContain(MANIFEST_URI);
  });

  it('namespace law holds across the whole manifest (no heyoub, no czap://)', () => {
    const json = JSON.stringify(mcpAppManifest());
    expect(json).not.toContain('heyoub');
    expect(json).not.toContain('czap://');
  });
});
