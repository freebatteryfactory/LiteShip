/**
 * CUT D3 — MCP resources + prompts projection.
 *
 * resources/list + resources/read and prompts/list + prompts/get are PROJECTIONS
 * of the canonical command registry + the public glossary — never a hand-maintained
 * parallel surface. initialize declares the resources/prompts capabilities ONLY
 * because their methods are implemented; unimplemented sub-methods stay honest
 * -32601. The D1 result envelope and D2 outputSchema law are untouched.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMAND_CATALOG, GLOSSARY_ENTRIES, mcpExposedDescriptors, commandRegistry } from '@czap/command';
import { fnv1a } from '@czap/core';
import { dispatch, dispatchToolCall, listTools } from '../../../packages/mcp-server/src/dispatch.js';
import { listResources, readResource } from '../../../packages/mcp-server/src/resources.js';
import { listUiResources } from '../../../packages/mcp-server/src/ui-resources.js';
import { listPrompts, getPrompt } from '../../../packages/mcp-server/src/prompts.js';
import type { JsonRpcRequest } from '../../../packages/mcp-server/src/jsonrpc.js';

const SRC = resolve(import.meta.dirname, '..', '..', '..', 'packages', 'mcp-server', 'src');

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

describe('D3 capabilities — declared because implemented, minimal honest flags', () => {
  it('initialize declares resources + prompts with EXACTLY { listChanged: false } (no subscribe)', async () => {
    const r = await result<{ capabilities: Record<string, unknown> }>('initialize', { protocolVersion: '2025-11-25' });
    expect(r.capabilities.resources).toEqual({ listChanged: false });
    expect(r.capabilities.prompts).toEqual({ listChanged: false });
    // No subscribe key — that would obligate the D5 push channel which does not exist.
    expect('subscribe' in (r.capabilities.resources as object)).toBe(false);
  });

  it('server/info resource and initialize share ONE capabilities source (cannot drift)', async () => {
    const init = await result<{ capabilities: unknown }>('initialize', { protocolVersion: '2025-11-25' });
    const read = await result<{ contents: Array<{ text: string }> }>('resources/read', { uri: 'liteship://server/info' });
    const info = JSON.parse(read.contents[0]!.text) as { capabilities: unknown };
    expect(info.capabilities).toEqual(init.capabilities);
  });

  it('honesty invariant: every declared capability has a working *_list method (not -32601)', async () => {
    const caps = (await result<{ capabilities: Record<string, unknown> }>('initialize', { protocolVersion: '2025-11-25' })).capabilities;
    const listMethod: Record<string, string> = { tools: 'tools/list', resources: 'resources/list', prompts: 'prompts/list' };
    for (const cap of Object.keys(caps)) {
      if (cap === 'ui') continue; // D10: ui.callServerTool is a host-bridge flag, not a *_list surface.
      const method = listMethod[cap];
      expect(method, `declared capability '${cap}' has no known list method`).toBeDefined();
      const r = await dispatch(req(method!, {}));
      expect('result' in (r as object), `'${cap}' is declared but ${method} did not succeed`).toBe(true);
    }
  });
});

describe('D3 resources/list — projection of the registry + glossary', () => {
  it('the JSON (liteship://) resources appear in stable order and are unique', async () => {
    const r = await result<{ resources: Array<{ uri: string; mimeType: string }> }>('resources/list', {});
    const uris = r.resources.map((x) => x.uri);
    // The D3 JSON surface is the prefix of the list (CUT D4 appends ui:// resources).
    const jsonResources = r.resources.filter((x) => x.uri.startsWith('liteship://'));
    expect(jsonResources.slice(0, 4).map((x) => x.uri)).toEqual([
      'liteship://registry/commands',
      'liteship://registry/components',
      'liteship://server/info',
      'liteship://glossary',
    ]);
    expect(jsonResources.every((x) => x.mimeType === 'application/json')).toBe(true);
    expect(new Set(uris).size).toBe(uris.length); // unique across JSON + UI
  });

  it('cardinality of the JSON surface is pinned: commands + server/info + glossary index + one per term', async () => {
    const r = await result<{ resources: Array<{ uri: string }> }>('resources/list', {});
    // D3 JSON class = liteship:// but NOT the D6 manifest class (liteship://mcp-app/…).
    const jsonResources = r.resources.filter(
      (x) => x.uri.startsWith('liteship://') && !x.uri.startsWith('liteship://mcp-app/'),
    );
    expect(jsonResources.length).toBe(4 + GLOSSARY_ENTRIES.length);
  });

  it('resources/list begins with the JSON projection, then the static UI projection (downstream classes additive)', async () => {
    const r = await result<{ resources: unknown[] }>('resources/list', {});
    const jsonLen = listResources().length;
    expect(r.resources.slice(0, jsonLen)).toEqual(listResources());
    expect(r.resources.slice(jsonLen, jsonLen + listUiResources().length)).toEqual(listUiResources());
  });
});

describe('D3 resources/read — real projected JSON', () => {
  it('liteship://registry/commands is the full COMMAND_CATALOG (24-descriptor superset of tools/list)', async () => {
    const r = await result<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>('resources/read', { uri: 'liteship://registry/commands' });
    expect(r.contents[0]!.mimeType).toBe('application/json');
    expect(JSON.parse(r.contents[0]!.text)).toEqual(COMMAND_CATALOG);
  });

  it('liteship://registry/components projects the demo generated-UI catalog', async () => {
    const r = await result<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>('resources/read', {
      uri: 'liteship://registry/components',
    });
    expect(r.contents[0]!.mimeType).toBe('application/json');
    const body = JSON.parse(r.contents[0]!.text) as { version: string; components: Record<string, unknown> };
    expect(body.version).toBe('demo-1');
    expect(body.components.Card).toBeDefined();
  });

  it('liteship://server/info carries name, version, protocolVersion, capabilities', async () => {
    const r = await result<{ contents: Array<{ text: string }> }>('resources/read', { uri: 'liteship://server/info' });
    const info = JSON.parse(r.contents[0]!.text) as Record<string, unknown>;
    expect(info.name).toBeTypeOf('string');
    expect(info.version).toBeTypeOf('string');
    expect(info.protocolVersion).toBe('2025-11-25');
    expect(info.capabilities).toBeDefined();
  });

  it('liteship://glossary indexes every term with its resource URI', async () => {
    const r = await result<{ contents: Array<{ text: string }> }>('resources/read', { uri: 'liteship://glossary' });
    const index = JSON.parse(r.contents[0]!.text) as { terms: Array<{ term: string; uri: string }> };
    expect(index.terms.length).toBe(GLOSSARY_ENTRIES.length);
    expect(new Set(index.terms.map((t) => t.term))).toEqual(new Set(GLOSSARY_ENTRIES.map((e) => e.term)));
  });

  it('each glossary term resource round-trips to its entry (including the @czap/* special-char term)', async () => {
    for (const entry of GLOSSARY_ENTRIES) {
      const listed = listResources().find((x) => x.name === `glossary/${entry.term}`);
      expect(listed, `glossary term ${entry.term} must be a concrete listed resource`).toBeDefined();
      const r = await result<{ contents: Array<{ text: string }> }>('resources/read', { uri: listed!.uri });
      expect(JSON.parse(r.contents[0]!.text)).toEqual(entry);
    }
  });

  it('unknown uri → -32002 Resource not found (NOT -32601 method-not-found)', async () => {
    expect(await errCode('resources/read', { uri: 'liteship://glossary/__nope__' })).toBe(-32002);
  });

  it('missing / non-string uri → -32602 invalid params', async () => {
    expect(await errCode('resources/read', {})).toBe(-32602);
    expect(await errCode('resources/read', { uri: 42 })).toBe(-32602);
  });
});

describe('D3 prompts/list — exactly the two registry-backed prompts', () => {
  it('returns liteship.command.inspect + liteship.tool.use, in stable order, with required args', async () => {
    const r = await result<{ prompts: Array<{ name: string; arguments: Array<{ name: string; required: boolean }> }> }>('prompts/list', {});
    expect(r.prompts.map((p) => p.name)).toEqual(['liteship.command.inspect', 'liteship.tool.use']);
    for (const p of r.prompts) expect(p.arguments.some((a) => a.required)).toBe(true);
  });

  it('listPrompts() helper agrees with the prompts/list projection', async () => {
    const r = await result<{ prompts: unknown[] }>('prompts/list', {});
    expect(r.prompts).toEqual(listPrompts());
  });
});

describe('D3 prompts/get — deterministic, registry-backed messages', () => {
  it('command.inspect explains a handler-backed command from its descriptor', async () => {
    const r = await result<{ messages: Array<{ role: string; content: { type: string; text: string } }> }>('prompts/get', { name: 'liteship.command.inspect', arguments: { command: 'glossary' } });
    expect(r.messages[0]!.role).toBe('user');
    expect(r.messages[0]!.content.type).toBe('text');
    expect(r.messages[0]!.content.text).toContain('Command: glossary');
    expect(r.messages[0]!.content.text).toContain('handler');
  });

  it('command.inspect explains a CLI-owned command (executionKind reported honestly)', async () => {
    const r = await result<{ messages: Array<{ content: { text: string } }> }>('prompts/get', { name: 'liteship.command.inspect', arguments: { command: 'gauntlet' } });
    expect(r.messages[0]!.content.text).toContain('cli-orchestration');
  });

  it('tool.use explains an MCP-exposed tool and references the D1/D2 envelope', async () => {
    const r = await result<{ messages: Array<{ content: { text: string } }> }>('prompts/get', { name: 'liteship.tool.use', arguments: { tool: 'asset.analyze' } });
    const text = r.messages[0]!.content.text;
    expect(text).toContain('asset.analyze');
    expect(text).toContain('structuredContent');
    expect(text).toContain('liteship/result');
  });

  it('tool.use rejects a CLI-owned (non-MCP-exposed) command → -32602', async () => {
    expect(await errCode('prompts/get', { name: 'liteship.tool.use', arguments: { tool: 'gauntlet' } })).toBe(-32602);
  });

  it('command.inspect missing required arg → -32602; unknown command → -32602', async () => {
    expect(await errCode('prompts/get', { name: 'liteship.command.inspect', arguments: {} })).toBe(-32602);
    expect(await errCode('prompts/get', { name: 'liteship.command.inspect', arguments: { command: '__nope__' } })).toBe(-32602);
  });

  it('unknown prompt name → -32602; missing name → -32602', async () => {
    expect(await errCode('prompts/get', { name: '__no_such_prompt__', arguments: {} })).toBe(-32602);
    expect(await errCode('prompts/get', { arguments: {} })).toBe(-32602);
  });

  it('output is deterministic and varies with the argument (real interpolation, not a constant)', () => {
    const a1 = getPrompt('liteship.command.inspect', { command: 'glossary' });
    const a2 = getPrompt('liteship.command.inspect', { command: 'glossary' });
    const b = getPrompt('liteship.command.inspect', { command: 'version' });
    expect(a1).toEqual(a2); // deterministic
    expect(a1.messages[0]!.content.text).not.toEqual(b.messages[0]!.content.text); // arg-sensitive
  });
});

describe('D3 method-not-found honesty — unimplemented sub-methods stay -32601', () => {
  it('resources/templates/list and resources/subscribe remain method-not-found', async () => {
    expect(await errCode('resources/templates/list', {})).toBe(-32601);
    expect(await errCode('resources/subscribe', { uri: 'liteship://server/info' })).toBe(-32601);
  });
  it('an unimplemented prompts sub-method and a wholly-unknown method are -32601', async () => {
    expect(await errCode('prompts/complete', {})).toBe(-32601);
    expect(await errCode('totally/unknown', {})).toBe(-32601);
  });
});

describe('D3 stability — projection drift tripwire', () => {
  it('the {resources, prompts} projection matches its pinned content address', () => {
    const address = fnv1a(JSON.stringify({ resources: listResources(), prompts: listPrompts() }));
    // 0.2.0 framework primitives: added liteship://registry/components JSON resource.
    expect(address).toBe('fnv1a:97d412ae');
  });
});

describe('D3 non-regression — D1 envelope + D2 outputSchema law untouched', () => {
  it('D1: tools/call envelope (structuredContent=payload, _meta[liteship/result], text mirror, fnv1a resultId)', async () => {
    const r = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    expect(r.isError).toBe(false);
    expect((r.structuredContent as { term: string }).term).toBe('boundary');
    expect(r.content[0]!.text).toBe(JSON.stringify(r.structuredContent));
    const receipt = r._meta?.['liteship/result'] as { command: string; resultId: string };
    expect(receipt.command).toBe('glossary');
    expect(receipt.resultId).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });

  it('D2: tools/list still emits 10 tools each with an object outputSchema; 18 handlers total', () => {
    const tools = listTools();
    expect(tools.length).toBe(10);
    for (const t of tools) expect((t.outputSchema as { type?: string }).type).toBe('object');
    // 18 handlers: the `check` command (the PURE gauntlet gate fold,
    // litelaunchGauntlet) joined the registry as a handler-backed, MCP-exposed
    // command — so both the tools count (9 → 10) and the handler count grew by one.
    expect(commandRegistry.list().filter((d) => d.executionKind === 'handler').length).toBe(18);
  });
});

describe('D3 namespace law — protocol surfaces stay product-owned', () => {
  it('no maintainer identity (heyoub) and no czap:// scheme in the D3 protocol-surface source', () => {
    for (const file of ['resources.ts', 'prompts.ts', 'capabilities.ts', 'dispatch.ts', 'ui-resources.ts', 'ui-render.ts', 'app-resources.ts', 'app-render.ts', 'manifest-resource.ts']) {
      const src = readFileSync(resolve(SRC, file), 'utf8');
      expect(src, `${file} must not embed maintainer identity`).not.toContain('heyoub');
      expect(src, `${file} must use the liteship:// scheme, not czap://`).not.toContain('czap://');
    }
  });
});

describe('error contract — failures name the subject and the literal next step', () => {
  it('unknown prompt enumerates the available prompts and points at prompts/list', () => {
    expect(() => getPrompt('__no_such_prompt__', {})).toThrow(
      /unknown prompt: __no_such_prompt__\. Available prompts: liteship\.command\.inspect, liteship\.tool\.use \(see prompts\/list\)\./,
    );
  });

  it('command.inspect on an unknown command points at the liteship://registry/commands catalog', () => {
    expect(() => getPrompt('liteship.command.inspect', { command: '__nope__' })).toThrow(
      /unknown command: __nope__\. The full catalog is the resource liteship:\/\/registry\/commands\./,
    );
  });

  it('tool.use on a CLI-owned command says to run it as `czap <name>`', () => {
    // gauntlet is in the catalog but not MCP-exposed.
    expect(() => getPrompt('liteship.tool.use', { tool: 'gauntlet' })).toThrow(/run it as `czap gauntlet`/i);
  });

  it('tool.use on a name outside the catalog says so (no bogus czap remedy)', () => {
    expect(() => getPrompt('liteship.tool.use', { tool: '__nope__' })).toThrow(
      /not in the command catalog.*tools\/list/,
    );
  });

  it('resources/read unknown uri carries a data.hint pointing at resources/list', async () => {
    const r = await dispatch(req('resources/read', { uri: 'liteship://__nope__' }));
    const err = (r as { error: { code: number; data: { uri: string; hint: string } } }).error;
    expect(err.code).toBe(-32002);
    expect(err.data.uri).toBe('liteship://__nope__');
    expect(err.data.hint).toContain('resources/list');
  });
});
