/**
 * CUT D5 — live MCP Apps VIEW resource + capsule.inspect linkage (node-side law).
 *
 * LiteShip is the PROVIDER: it ships one interactive `ui://liteship/app/*` resource
 * and links the `capsule.inspect` tool to it via `_meta.ui.resourceUri`. The AI host
 * owns the iframe + postMessage bridge and injects the result; the server NEVER
 * pushes — it rejects `ui/*` with -32601. D3 JSON + D4 static surfaces stay frozen.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { COMMAND_CATALOG } from '@liteship/command';
import { fnv1a } from '@liteship/core';
import { dispatch, dispatchToolCall, listTools } from '../../../packages/mcp-server/src/dispatch.js';
import { listUiResources, readUiResource } from '../../../packages/mcp-server/src/ui-resources.js';
import { listAppResources, readAppResource } from '../../../packages/mcp-server/src/app-resources.js';
import type { JsonRpcRequest } from '../../../packages/mcp-server/src/jsonrpc.js';

const APP_URI = 'ui://liteship/app/capsule-inspect';
const UI_MIME = 'text/html;profile=mcp-app';

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

describe('D5 — D4 static surface stays frozen', () => {
  it('the D4 static UI registry adds the components twin (commands, components, glossary) and its pin holds', () => {
    expect(listUiResources().map((r) => r.uri)).toEqual([
      'ui://liteship/registry/commands',
      'ui://liteship/registry/components',
      'ui://liteship/glossary',
    ]);
    const pin = fnv1a(
      JSON.stringify({
        list: listUiResources(),
        bodies: listUiResources().map((r) => readUiResource(r.uri).contents[0]!.text),
      }),
    );
    // CUT D9b-2: `audit` joined COMMAND_CATALOG → the registry/commands UI body changed.
    // Gauntlet hardening: the `gauntlet` glossary definition moved 32 -> 34 phases
    // (rig-check + audit:floor), re-pinning the glossary UI body.
    // 0.2.0 framework primitives: added ui://liteship/registry/components static twin.
    // CUT A2: `plumb` (the plumb-gate, migrated from scripts/) joined COMMAND_CATALOG
    // → the registry/commands UI body changed, re-pinning the digest.
    // CUT A3: `check-invariants` (the invariant gate, migrated from scripts/) joined
    // COMMAND_CATALOG → the registry/commands UI body changed, re-pinning the digest.
    // CUT A4: `audit-floor` (the warning-floor gate, migrated from scripts/) joined
    // COMMAND_CATALOG → the registry/commands UI body changed, re-pinning the digest.
    // CUT A5: `package-smoke` (the release pack/install smoke, migrated from scripts/)
    // joined COMMAND_CATALOG → the registry/commands UI body changed, re-pinning it.
    // B5b CLI-only: `check-invariants` went MCP-exposed → CLI-only (its scan needs
    // @liteship/audit's normalizeRepoPath), flipping its annotations (mcpExposed dropped,
    // cliOnly added) in COMMAND_CATALOG → the registry/commands UI body shifted.
    // Re-pinned again when the capsule-verify handler command (CLI-only) joined
    // the registry, growing the commands UI projection by one entry.
    // Re-pinned again when `check` (the PURE gauntlet gate fold, litelaunchGauntlet)
    // joined COMMAND_CATALOG as a handler-backed, MCP-exposed command — the
    // registry/commands UI body grew by one entry, re-pinning the digest.
    // Re-pinned again when `lsp` (the LSP rigor skin launcher, B3) joined
    // COMMAND_CATALOG — the registry/commands UI body grew by one entry.
    // Re-pinned again when Astro 7 background-dev commands (`astro.dev`,
    // `astro.status`, `astro.stop`) joined COMMAND_CATALOG.
    // Re-pinned again when the glossary shake-down/first-run entries were
    // reworded for the `pnpm verify` rename (shakedown script retired).
    // Re-pinned for the LiteShip brand consolidation (engine-name glossary entry removed; catalog content changed).
    // Re-pinned again when the standard dev-experience verbs (`dev`, `build`, `info`,
    // `add`) joined COMMAND_CATALOG as CLI-owned commands — the registry/commands UI
    // body grew by four entries.
    // P10 nautical CLI-string sweep: the `doctor` descriptor summary was de-nauticalized
    // ("Preflight rig-check:" -> "Preflight environment check:"); the registry/commands UI
    // body embeds command summaries, so its digest shifted. (The castoff -> setup group
    // rename is NOT rendered into the UI body and does not affect this pin.)
    // Re-pinned again when the `explain` (diagnostic-code / symbol lookup) and `context`
    // (task-oriented pointer map) reference commands joined COMMAND_CATALOG as
    // handler-backed, MCP-exposed commands — the registry/commands UI body grew by two.
    // De-nauticalization sweep: the `gauntlet` glossary entry was reworded to drop the
    // stale spelled-out phase count ("Thirty-five phases…") and the `rig-check` literal.
    // renderGlossary embeds each entry's definition, so the glossary UI body shifted.
    // P17 nautical glossary trim: the retired maritime entries (hull, keel, cast off,
    // moored, shake-down, quay) were dropped from GLOSSARY_ENTRIES — the catalog now keeps
    // only terms still used in CLI source — so the glossary UI body digest shifted again.
    // P11 check contract completion: profile execution owns `check`; the pure fold is
    // the distinct handler/MCP command `check.gates`, changing the commands projection.
    expect(pin).toBe('fnv1a:26ecfa3a');
  });
});

describe('D5 — app resource is an additive third class', () => {
  it('resources/list is [JSON…, static UI…, app…] in that order', async () => {
    const r = await result<{ resources: Array<{ uri: string }> }>('resources/list', {});
    const uris = r.resources.map((x) => x.uri);
    const apps = uris.filter((u) => u.startsWith('ui://liteship/app/'));
    expect(apps).toEqual([APP_URI]);
    // app resources follow the JSON + static-UI classes; the D6 manifest is the final entry.
    expect(uris[uris.length - 1]).toBe('liteship://mcp-app/manifest');
    expect(new Set(uris).size).toBe(uris.length);
  });

  it('listAppResources() agrees with the app slice and is mcp-app mimeType', async () => {
    const r = await result<{ resources: Array<{ uri: string; mimeType: string }> }>('resources/list', {});
    expect(r.resources.filter((x) => x.uri.startsWith('ui://liteship/app/'))).toEqual(listAppResources());
    expect(listAppResources().every((x) => x.mimeType === UI_MIME)).toBe(true);
  });
});

describe('D5 — capsule.inspect tool linkage (registry-governed, additive)', () => {
  it('exactly capsule.inspect carries _meta.ui.resourceUri; no other tool does', () => {
    const tools = listTools();
    const linked = tools.filter((t) => t._meta?.ui?.resourceUri);
    expect(linked.map((t) => t.name)).toEqual(['capsule.inspect']);
    expect(linked[0]!._meta!.ui.resourceUri).toBe(APP_URI);
  });

  it('the descriptor carries the ui link and CSP is NOT on tool metadata', () => {
    const d = COMMAND_CATALOG.find((c) => c.name === 'capsule.inspect')!;
    expect(d.ui?.resourceUri).toBe(APP_URI);
    expect((d as { _meta?: unknown })._meta).toBeUndefined();
    expect((d.annotations as { csp?: unknown } | undefined)?.csp).toBeUndefined();
  });

  it('the linked resourceUri resolves to a real app resource (not -32002, not a D4 static URI)', async () => {
    const linkedUri = listTools().find((t) => t.name === 'capsule.inspect')!._meta!.ui.resourceUri;
    expect(listUiResources().map((r) => r.uri)).not.toContain(linkedUri); // not a static twin
    const read = await result<{ contents: Array<{ uri: string }> }>('resources/read', { uri: linkedUri });
    expect(read.contents[0]!.uri).toBe(linkedUri);
  });
});

describe('D5 — the app resource is genuinely interactive + safe', () => {
  it('the app body embeds the view-side bridge (script + message listener + tool-result branch)', () => {
    const html = readAppResource(APP_URI).contents[0]!.text;
    expect(html).toContain('<script');
    expect(html).toContain("addEventListener('message'");
    expect(html).toContain('ui/notifications/tool-result');
    expect(html).toContain('ui/initialize');
  });

  it('the app body has a waiting/empty state and renders via textContent (no innerHTML injection)', () => {
    const html = readAppResource(APP_URI).contents[0]!.text;
    expect(html).toContain('Waiting for capsule result');
    expect(html).toContain('.textContent');
    expect(html).not.toContain('.innerHTML');
  });

  it('the app body uses ONLY the bridge — no network/eval/inline-handlers/remote sinks', () => {
    const html = readAppResource(APP_URI).contents[0]!.text;
    for (const banned of [
      'fetch(',
      'XMLHttpRequest',
      'eval(',
      'new Function',
      'http://',
      'https://',
      'src="',
      'href="',
    ]) {
      expect(html, `app body must not contain '${banned}'`).not.toContain(banned);
    }
    expect(/\son[a-z]+\s*=/i.test(html), 'app body must have no inline event-handler attributes').toBe(false);
  });

  it('CSP is default-deny on the RESOURCE meta', () => {
    const meta = readAppResource(APP_URI).contents[0]!._meta;
    expect(meta.ui.csp).toEqual({ connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] });
  });

  it('an unknown app uri → -32002 (consistent with D3/D4)', async () => {
    expect(await errCode('resources/read', { uri: 'ui://liteship/app/__nope__' })).toBe(-32002);
  });
});

describe('D5 — server honesty (no faked push channel)', () => {
  it('the server rejects host-only ui/* notifications with -32601; ui/call-tool is implemented (D10)', async () => {
    expect(await errCode('ui/initialize', {})).toBe(-32601);
    expect(await errCode('ui/notifications/tool-result', {})).toBe(-32601);
    expect(await errCode('ui/notifications/initialized', {})).toBe(-32601);
    const call = await dispatch(req('ui/call-tool', { name: 'capsule.list', arguments: {} }));
    expect('result' in (call as object)).toBe(true);
  });

  it('D10 declares ui.callServerTool capability honestly', async () => {
    const caps = (
      await result<{ capabilities: Record<string, unknown> }>('initialize', { protocolVersion: '2025-11-25' })
    ).capabilities;
    expect(caps).toEqual({
      tools: { listChanged: false },
      resources: { listChanged: false },
      prompts: { listChanged: false },
      ui: { callServerTool: true },
    });
    expect('apps' in caps).toBe(false);
  });
});

describe('D5 — D1/D2 non-regression', () => {
  it('D1: capsule.inspect tools/call still returns the envelope with a text fallback', async () => {
    const r = await dispatchToolCall({ name: 'capsule.inspect', arguments: { id: '__x__' } });
    expect(typeof r.content[0]!.text).toBe('string');
    expect(r.content[0]!.text).toBe(JSON.stringify(r.structuredContent));
    expect(r._meta?.['liteship/result']).toBeDefined();
  });

  it('D2: tools/list still emits 12 tools each with an object outputSchema', () => {
    const tools = listTools();
    expect(tools.length).toBe(12);
    for (const t of tools) expect((t.outputSchema as { type?: string }).type).toBe('object');
  });
});
