/**
 * CUT D1 — MCP lifecycle floor + receipt-backed result envelope.
 *
 * Two locks:
 *   1. lifecycle: initialize (protocolVersion + capabilities.tools + serverInfo),
 *      notifications/initialized accepted (no response), honest method-not-found
 *      for the resources/prompts surfaces D1 does not declare.
 *   2. result truth: tools/call returns structuredContent=payload, the LiteShip
 *      receipt identity in `_meta['dev.heyoub.liteship/result']`, a text mirror
 *      derived from the payload, and a content-addressed resultId.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dispatch, dispatchToolCall } from '../../../packages/mcp-server/src/dispatch.js';
import type { JsonRpcRequest, JsonRpcNotification } from '../../../packages/mcp-server/src/jsonrpc.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const RECEIPT_KEY = 'dev.heyoub.liteship/result';

function req(method: string, params?: unknown, id: string | number = 1): JsonRpcRequest {
  return params === undefined
    ? { jsonrpc: '2.0', id, method }
    : { jsonrpc: '2.0', id, method, params: params as Record<string, unknown> };
}
function note(method: string, params?: unknown): JsonRpcNotification {
  return params === undefined ? { jsonrpc: '2.0', method } : { jsonrpc: '2.0', method, params: params as Record<string, unknown> };
}

describe('D1 lifecycle floor — initialize / initialized / honest absence', () => {
  it('initialize returns protocolVersion 2025-11-25, tools capability, and serverInfo with the real package version', async () => {
    const r = await dispatch(req('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '0' } }));
    const result = (r as { result: { protocolVersion: string; capabilities: Record<string, unknown>; serverInfo: { name: string; version: string } } }).result;
    expect(result.protocolVersion).toBe('2025-11-25');
    expect(result.capabilities.tools).toBeDefined();
    // Honest absence: surfaces D1 does not serve are NOT declared (omitted, not false).
    expect('resources' in result.capabilities).toBe(false);
    expect('prompts' in result.capabilities).toBe(false);
    // serverInfo.version is the real @czap/mcp-server package version, not a literal.
    const pkgVersion = (JSON.parse(readFileSync(resolve(REPO, 'packages/mcp-server/package.json'), 'utf8')) as { version: string }).version;
    expect(result.serverInfo.name).toBeTypeOf('string');
    expect(result.serverInfo.version).toBe(pkgVersion);
    expect(result.serverInfo.version).not.toBe('0.0.0-unknown');
  });

  it('initialize with malformed params (no protocolVersion string) is a -32602 protocol error', async () => {
    const r = await dispatch(req('initialize', { capabilities: {} }));
    expect((r as { error: { code: number } }).error.code).toBe(-32602);
  });

  it('notifications/initialized is accepted and returns no response (§4.1)', async () => {
    expect(await dispatch(note('notifications/initialized'))).toBeNull();
  });

  it('resources/list and prompts/list are honest method-not-found (not declared in D1)', async () => {
    const res = await dispatch(req('resources/list', {}));
    expect((res as { error: { code: number } }).error.code).toBe(-32601);
    const prm = await dispatch(req('prompts/list', {}));
    expect((prm as { error: { code: number } }).error.code).toBe(-32601);
  });

  it('tools/list still projects the registry catalog (A1-T4 preserved)', async () => {
    const r = await dispatch(req('tools/list', {}));
    expect((r as { result: { tools: unknown[] } }).result.tools.length).toBeGreaterThan(5);
  });
});

describe('D1 result-truth floor — receipt-backed envelope', () => {
  it('tools/call: structuredContent is the payload; receipt identity rides in _meta; text mirrors the payload', async () => {
    const result = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    expect(result.isError).toBe(false);
    // structuredContent === payload (what D2's outputSchema will describe — not the envelope).
    const payload = result.structuredContent as { term: string; entries: unknown[] };
    expect(payload.term).toBe('boundary');
    // text is a faithful JSON mirror of the payload (compatibility), not the receipt.
    expect(result.content[0]!.text).toBe(JSON.stringify(payload));
    // receipt identity in _meta under the reverse-DNS key.
    const receipt = result._meta?.[RECEIPT_KEY] as { command: string; resultId: string; timestamp: string } | undefined;
    expect(receipt).toBeDefined();
    expect(receipt!.command).toBe('glossary');
    expect(receipt!.resultId).toMatch(/^fnv1a:[0-9a-f]{8}$/);
    expect(typeof receipt!.timestamp).toBe('string');
  });

  it('resultId is a deterministic content address of the stable result (identical calls agree)', async () => {
    const a = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const b = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const idA = (a._meta?.[RECEIPT_KEY] as { resultId: string }).resultId;
    const idB = (b._meta?.[RECEIPT_KEY] as { resultId: string }).resultId;
    expect(idA).toBe(idB);
  });

  it('a tool execution failure is a result (isError true) with payload + receipt preserved — not a JSON-RPC error', async () => {
    const result = await dispatchToolCall({ name: 'capsule.inspect', arguments: { id: 'nope' } });
    expect(result.isError).toBe(true);
    expect((result.structuredContent as { error?: string }).error).toBeTypeOf('string');
    const receipt = result._meta?.[RECEIPT_KEY] as { command: string; resultId: string } | undefined;
    expect(receipt).toBeDefined();
    expect(receipt!.command).toBe('capsule.inspect');
    expect(receipt!.resultId).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });
});
