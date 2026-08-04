/**
 * Unit tests for the MCP HTTP transport's wire handler. Exercises every
 * parse-outcome branch through `handleRequest`:
 *  - parse-error → -32700 envelope
 *  - invalid-request → -32600
 *  - notification → null body
 *  - single request → result envelope
 *  - batch with mixed requests/notifications → array, notification omitted
 *  - batch where every element is a notification → null
 *  - empty batch → -32600 invalid-request
 *
 * These mirror what the HTTP server does on POST. The server bootstrap
 * itself (createServer, listen, SIGINT) is exercised by the integration
 * test (Task 8); the inner handler now has direct in-process coverage.
 */
import { describe, it, expect } from 'vitest';

import { handleRequest, respond } from '../../../packages/mcp-server/src/http.js';
import { JsonRpcServer, type JsonRpcResponse } from '../../../packages/mcp-server/src/jsonrpc.js';

/** Exactly what the wire handler may return. */
type WireResult = JsonRpcResponse | readonly JsonRpcResponse[] | null;

function isBatch(r: JsonRpcResponse | readonly JsonRpcResponse[]): r is readonly JsonRpcResponse[] {
  return Array.isArray(r);
}

/**
 * The narrowing seam for this suite.
 *
 * The wire handler returns `JsonRpcResponse | readonly JsonRpcResponse[] | null`,
 * and every law here re-asserted a hand-written envelope shape onto it. A
 * hand-written shape is not the contract: rename `error.code` on the wire and
 * the assertion still compiles. These four helpers narrow the REAL union with
 * positive, fail-closed checks, so a batch arriving where a single envelope was
 * promised (or a success where an error was) reds with a named reason.
 */
function single(r: WireResult): JsonRpcResponse {
  expect(r, 'the wire handler returned no envelope').not.toBeNull();
  if (r === null) throw new Error('no envelope');
  expect(isBatch(r), 'the wire handler returned a BATCH where one envelope was promised').toBe(false);
  if (isBatch(r)) throw new Error('batch envelope');
  return r;
}

function batch(r: WireResult): readonly JsonRpcResponse[] {
  expect(r, 'the wire handler returned no envelope').not.toBeNull();
  if (r === null) throw new Error('no envelope');
  expect(isBatch(r), 'the wire handler returned ONE envelope where a batch was promised').toBe(true);
  if (!isBatch(r)) throw new Error('single envelope');
  return r;
}

function errorOf(r: JsonRpcResponse): { readonly code: number; readonly message: string; readonly data?: unknown } {
  expect('error' in r, 'the envelope is a SUCCESS response, not an error').toBe(true);
  if (!('error' in r)) throw new Error('success envelope');
  return r.error;
}

function resultOf(r: JsonRpcResponse): unknown {
  expect('result' in r, 'the envelope is an ERROR response, not a success').toBe(true);
  if (!('result' in r)) throw new Error('error envelope');
  return r.result;
}

describe('handleRequest — JSON-RPC 2.0 wire conformance', () => {
  it('returns -32700 ParseError envelope for malformed JSON', async () => {
    const env = single(await handleRequest('not json {{{'));
    expect(errorOf(env).code).toBe(-32700);
    expect(env.id).toBeNull();
  });

  it('returns -32600 InvalidRequest for empty batch arrays', async () => {
    expect(errorOf(single(await handleRequest('[]'))).code).toBe(-32600);
  });

  it('returns -32600 InvalidRequest for non-conformant scalar input', async () => {
    expect(errorOf(single(await handleRequest('42'))).code).toBe(-32600);
  });

  it('returns -32600 for object missing jsonrpc/method, echoing id when present', async () => {
    const env = single(await handleRequest(JSON.stringify({ id: 5, method: 'x' }))); // missing jsonrpc
    expect(errorOf(env).code).toBe(-32600);
    expect(env.id).toBe(5);
  });

  it('returns null body for a notification (no id) — §4.1', async () => {
    const r = await handleRequest(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
      }),
    );
    expect(r).toBeNull();
  });

  it('returns success envelope for a tools/list request', async () => {
    const r = await handleRequest(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 'abc',
        method: 'tools/list',
        params: {},
      }),
    );
    const env = single(r);
    expect(env.id).toBe('abc');
    expect(resultOf(env)).toMatchObject({ tools: expect.any(Array) });
  });

  it('returns -32601 for unknown methods in a request', async () => {
    const r = await handleRequest(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown/x',
      }),
    );
    expect(errorOf(single(r)).code).toBe(-32601);
  });

  it('returns an array of responses for a batch, omitting notifications', async () => {
    const body = JSON.stringify([
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      { jsonrpc: '2.0', method: 'tools/list' }, // notification
      { jsonrpc: '2.0', id: 2, method: 'unknown' }, // -32601
    ]);
    const arr = batch(await handleRequest(body));
    expect(arr).toHaveLength(2);
    const first = arr.find((e) => e.id === 1);
    const second = arr.find((e) => e.id === 2);
    expect(first, 'the batch dropped the id-1 request').toBeDefined();
    expect(second, 'the batch dropped the id-2 request').toBeDefined();
    expect(resultOf(first!)).toBeDefined();
    expect(errorOf(second!).code).toBe(-32601);
  });

  it('returns null for a batch composed entirely of notifications', async () => {
    const body = JSON.stringify([
      { jsonrpc: '2.0', method: 'tools/list' },
      { jsonrpc: '2.0', method: 'tools/list', params: {} },
    ]);
    const r = await handleRequest(body);
    expect(r).toBeNull();
  });
});

describe('respond — direct ParseOutcome dispatch', () => {
  it('returns a ParseError envelope for kind: parse-error', async () => {
    expect(errorOf(single(await respond({ kind: 'parse-error' }))).code).toBe(-32700);
  });

  it('returns an InvalidRequest envelope for kind: invalid-request', async () => {
    const env = single(await respond({ kind: 'invalid-request', id: 7 }));
    expect(errorOf(env).code).toBe(-32600);
    expect(env.id).toBe(7);
  });

  it('forwards request kind to dispatch', async () => {
    const outcome = JsonRpcServer.parse(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    );
    expect(single(await respond(outcome)).id).toBe(1);
  });
});
