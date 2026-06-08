/**
 * CUT D4 — static MCP Apps UI resource projection.
 *
 * LiteShip adopts the MCP Apps extension (io.modelcontextprotocol/ui, 2026-01-26)
 * on MCP core 2025-11-25. D4 ships STANDALONE STATIC UI resources (text/html;
 * profile=mcp-app) — the visible twins of D3's JSON resources, projecting the same
 * fixed data. No tool linkage, no bridge, no interactivity (that is D5).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as fc from 'fast-check';
import { COMMAND_CATALOG, GLOSSARY_ENTRIES, commandRegistry } from '@czap/command';
import { fnv1a } from '@czap/core';
import { dispatch } from '../../../packages/mcp-server/src/dispatch.js';
import { listUiResources, readUiResource } from '../../../packages/mcp-server/src/ui-resources.js';
import { renderCommandCatalog, renderGlossary } from '../../../packages/mcp-server/src/ui-render.js';
import type { JsonRpcRequest } from '../../../packages/mcp-server/src/jsonrpc.js';

const SRC = resolve(import.meta.dirname, '..', '..', '..', 'packages', 'mcp-server', 'src');
const UI_MIME = 'text/html;profile=mcp-app';
const CMD_URI = 'ui://liteship/registry/commands';
const GLOSSARY_URI = 'ui://liteship/glossary';

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

describe('D4 — UI resources in resources/list', () => {
  it('resources/list includes both ui:// resources with the mcp-app mimeType', async () => {
    const r = await result<{ resources: Array<{ uri: string; mimeType: string }> }>('resources/list', {});
    // Static UI class = ui:// but NOT the D5 live app class (ui://liteship/app/…).
    const ui = r.resources.filter((x) => x.uri.startsWith('ui://') && !x.uri.startsWith('ui://liteship/app/'));
    expect(ui.map((x) => x.uri)).toEqual([CMD_URI, GLOSSARY_URI]);
    expect(ui.every((x) => x.mimeType === UI_MIME)).toBe(true);
  });

  it('listUiResources() agrees with the ui:// slice of resources/list', async () => {
    const r = await result<{ resources: Array<{ uri: string }> }>('resources/list', {});
    expect(r.resources.filter((x) => x.uri.startsWith('ui://') && !x.uri.startsWith('ui://liteship/app/'))).toEqual(listUiResources());
  });

  it('cardinality is pinned: exactly two static UI resources', () => {
    expect(listUiResources().length).toBe(2);
  });
});

describe('D4 — UI resource metadata (CSP on the resource, never the tool)', () => {
  it('each UI resource carries _meta.ui.csp with the camelCase domain allowlists', () => {
    for (const r of listUiResources()) {
      expect(r._meta.ui.csp).toEqual({ connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] });
      expect(r._meta.ui.permissions).toEqual([]);
      expect(r._meta.ui.prefersBorder).toBe(true);
    }
  });

  it('no command descriptor carries _meta.ui (D4 links no tool) nor CSP on tool meta', () => {
    for (const d of commandRegistry.list()) {
      expect((d as { _meta?: unknown })._meta).toBeUndefined();
      expect((d.annotations as { csp?: unknown } | undefined)?.csp).toBeUndefined();
    }
  });
});

describe('D4 — resources/read returns static markup embedding real data', () => {
  it('the command-catalog UI is text/html;profile=mcp-app and is a byte-identical projection', async () => {
    const r = await result<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>('resources/read', { uri: CMD_URI });
    expect(r.contents[0]!.mimeType).toBe(UI_MIME);
    expect(r.contents[0]!.text).toBe(renderCommandCatalog(COMMAND_CATALOG));
  });

  it('the command-catalog UI embeds real command names + summaries', async () => {
    const html = (await result<{ contents: Array<{ text: string }> }>('resources/read', { uri: CMD_URI })).contents[0]!.text;
    for (const d of COMMAND_CATALOG) {
      expect(html, `catalog UI missing ${d.name}`).toContain(d.name);
    }
    expect(html).toContain(COMMAND_CATALOG[0]!.summary);
  });

  it('the glossary UI is a byte-identical projection embedding terms + definitions', async () => {
    const r = await result<{ contents: Array<{ mimeType: string; text: string }> }>('resources/read', { uri: GLOSSARY_URI });
    expect(r.contents[0]!.mimeType).toBe(UI_MIME);
    expect(r.contents[0]!.text).toBe(renderGlossary(GLOSSARY_ENTRIES));
    const entry = GLOSSARY_ENTRIES.find((e) => e.term === 'boundary')!;
    expect(r.contents[0]!.text).toContain(entry.term);
    // Definitions are HTML-escaped in the markup; assert a quote-free leading slice
    // (the byte-identical projection above already proves the full content).
    expect(r.contents[0]!.text).toContain(entry.definition.slice(0, 40));
  });

  it('read contents carry the CSP meta alongside the markup', async () => {
    const r = await result<{ contents: Array<{ _meta: { ui: { csp: unknown } } }> }>('resources/read', { uri: CMD_URI });
    expect(r.contents[0]!._meta.ui.csp).toBeDefined();
  });

  it('an unknown ui:// uri → -32002 Resource not found (consistent with D3)', async () => {
    expect(await errCode('resources/read', { uri: 'ui://liteship/__nope__' })).toBe(-32002);
  });
});

describe('D4 — static-only guarantee (the D4/D5 line)', () => {
  const FORBIDDEN = [
    '<script', 'postMessage', 'window.openai', 'window.parent', 'MessageChannel',
    'tools/call', 'callTool', 'javascript:', 'href="http', 'src="http', 'srcdoc',
  ];

  it('every UI resource body is static — no script, no bridge hooks, no inline handlers, no remote network', () => {
    for (const r of listUiResources()) {
      const html = readUiResource(r.uri).contents[0]!.text;
      for (const needle of FORBIDDEN) {
        expect(html, `${r.uri} leaks '${needle}'`).not.toContain(needle);
      }
      expect(/\son[a-z]+\s*=/i.test(html), `${r.uri} has an inline event handler`).toBe(false);
    }
  });

  it('the forbidden-hook matcher actually bites (teeth)', () => {
    const malicious = '<div onclick="x"><script>postMessage(1)</script></div>';
    expect(FORBIDDEN.some((n) => malicious.includes(n))).toBe(true);
    expect(/\son[a-z]+\s*=/i.test(malicious)).toBe(true);
  });
});

describe('D4 — determinism (pure projection)', () => {
  it('repeated reads yield identical bytes', () => {
    expect(readUiResource(CMD_URI).contents[0]!.text).toBe(readUiResource(CMD_URI).contents[0]!.text);
    expect(readUiResource(GLOSSARY_URI).contents[0]!.text).toBe(readUiResource(GLOSSARY_URI).contents[0]!.text);
  });

  it('renderGlossary is a pure function of its entries (fast-check over subsets)', () => {
    fc.assert(
      fc.property(fc.subarray([...GLOSSARY_ENTRIES]), (entries) => {
        return renderGlossary(entries) === renderGlossary(entries);
      }),
    );
  });
});

describe('D4 — projection drift pin', () => {
  it('the UI projection matches its pinned content address', () => {
    const address = fnv1a(
      JSON.stringify({
        list: listUiResources(),
        bodies: listUiResources().map((r) => readUiResource(r.uri).contents[0]!.text),
      }),
    );
    // Re-pin intentionally (and only) when the UI resource surface changes on purpose.
    // CUT D9b-2: `audit` joined COMMAND_CATALOG, so the registry/commands UI body changed.
    // Gauntlet hardening: the `gauntlet` glossary definition moved 32 -> 34 phases
    // (rig-check + audit:floor), re-pinning the glossary UI body.
    expect(address).toBe('fnv1a:b2c98cb5');
  });
});
