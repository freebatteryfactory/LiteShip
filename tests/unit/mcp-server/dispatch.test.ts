/**
 * Unit tests for the MCP `dispatch` router (CUT A1 capstone). tools/call now
 * routes through the shared @liteship/command dispatcher and returns the structured
 * `CapsuleCommandResult.payload` as `structuredContent` — no @liteship/cli import,
 * no stdout capture, no buildArgv flattening.
 *
 * Branches: tools/list, tools/call success (structuredContent), tools/call
 * structured failure (isError, not a JSON-RPC error), nested args preserved,
 * no stdout pollution, method-not-found (-32601), invalid params (-32602),
 * notification path (null per §4.1).
 */
import { describe, it, expect } from 'vitest';
import { mcpExposedDescriptors } from '@liteship/command';
import { dispatch, dispatchToolCall, listTools } from '../../../packages/mcp-server/src/dispatch.js';
import type { JsonRpcRequest, JsonRpcNotification } from '../../../packages/mcp-server/src/jsonrpc.js';
import { validateStructural, type StructuralSchema } from '../../support/structural-schema.js';
import { scaledTimeout } from '../../../vitest.shared.js';

/** `check` runs the in-process gauntlet fold — same budget as cross-adapter convergence. */
// Per-tool timeout budgets for the catalog-driven dispatch matrix (#145). A
// lookup table so a per-tool budget is trivial to scan/extend; values are wrapped
// in `scaledTimeout` at lookup time (per test-timeout-policy). Only `check` needs
// an elevated budget: with empty args it runs the in-process gauntlet fold — the
// same 60s `tests/integration/cross-adapter-convergence.test.ts` gives it. Every
// other tool (including `capsule.verify` / `scene.render`) dispatches with a
// `__mcp-dispatch-probe__` arg that references a non-existent capsule/scene and
// fails fast, so the default vitest budget is ample — the old 120s here was
// over-conservative parity with the convergence suite, which uses REAL fixtures.
const MCP_DISPATCH_TIMEOUT_MS: Readonly<Record<string, number>> = {
  check: 60_000,
};

function mcpDispatchMatrixTimeout(name: string): number | undefined {
  const budget = MCP_DISPATCH_TIMEOUT_MS[name];
  return budget === undefined ? undefined : scaledTimeout(budget);
}

/** Minimal arguments that exercise each MCP tool's dispatch path (ok or structured failure — never throw). */
const MCP_DISPATCH_ARGS: Record<string, Record<string, unknown>> = {
  'asset.analyze': { asset: '__mcp-dispatch-probe__', projection: 'beat' },
  'asset.verify': { asset: '__mcp-dispatch-probe__' },
  'capsule.inspect': { id: '__mcp-dispatch-probe__' },
  'capsule.list': {},
  'capsule.verify': { id: '__mcp-dispatch-probe__' },
  check: {},
  plumb: {},
  'scene.compile': { scene: '__mcp-dispatch-probe__.ts' },
  'scene.render': { scene: '__mcp-dispatch-probe__.ts' },
  'scene.verify': { scene: '__mcp-dispatch-probe__.ts' },
};

function makeRequest(method: string, params?: unknown, id: string | number = 1): JsonRpcRequest {
  return params === undefined
    ? { jsonrpc: '2.0', id, method }
    : { jsonrpc: '2.0', id, method, params: params as Record<string, unknown> };
}

function makeNotification(method: string, params?: unknown): JsonRpcNotification {
  return params === undefined ? { jsonrpc: '2.0', method } : { jsonrpc: '2.0', method, params: params as Record<string, unknown> };
}

describe('dispatch — JSON-RPC method routing', () => {
  it('responds to tools/list with the registry-projected tool catalog', async () => {
    const r = await dispatch(makeRequest('tools/list', {}));
    expect('result' in r!).toBe(true);
    const result = (r as { result: { tools: unknown[] } }).result;
    expect(result.tools.length).toBeGreaterThan(5);
  });

  it('returns -32601 (Method Not Found) for unknown methods', async () => {
    const r = await dispatch(makeRequest('unknown/method'));
    const err = (r as { error: { code: number; data?: { method: string } } }).error;
    expect(err.code).toBe(-32601);
    expect(err.data?.method).toBe('unknown/method');
  });

  it('returns -32602 when tools/call lacks { name, arguments }', async () => {
    const r = await dispatch(makeRequest('tools/call', { wrong: 'shape' }));
    expect((r as { error: { code: number } }).error.code).toBe(-32602);
  });

  it('returns null for notifications (§4.1)', async () => {
    expect(await dispatch(makeNotification('tools/list', {}))).toBeNull();
  });

  it('defaults omitted tools/call arguments to {} (MCP marks arguments optional) — like prompts/get and ui/call-tool', async () => {
    const r = await dispatch(makeRequest('tools/call', { name: 'glossary' }));
    expect('result' in r!).toBe(true);
    const result = (r as { result: { isError: boolean } }).result;
    expect(result.isError).toBe(false);
  });
});

describe('dispatchToolCall — structuredContent (no stdout capture, no buildArgv)', () => {
  it('A1-T6: a successful command returns its payload as structuredContent, text mirrors it', async () => {
    // glossary is a pure handler — deterministic, no host I/O.
    const result = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    expect(result.isError).toBe(false);
    const payload = result.structuredContent as { term: string; entries: unknown[] };
    expect(payload.term).toBe('boundary');
    expect(payload.entries.length).toBeGreaterThan(0);
    // The text content is a faithful JSON mirror of the structured payload — not stdout.
    expect(result.content[0]!.text).toBe(JSON.stringify(payload));
  });

  it('a command failure is a structured result (isError true), not a thrown JSON-RPC error', async () => {
    // capsule.inspect with no manifest on disk → structured failed result.
    const result = await dispatchToolCall({ name: 'capsule.inspect', arguments: { id: 'nope' } });
    expect(result.isError).toBe(true);
    expect((result.structuredContent as { error?: string }).error).toBeTypeOf('string');
  });

  it('A1-T7: nested-object arguments pass through verbatim — never [object Object]-flattened', async () => {
    const result = await dispatchToolCall({
      name: 'glossary',
      arguments: { term: 'boundary', meta: { nested: { deep: true } } },
    });
    // The old buildArgv path would have produced `--meta=[object Object]`; the
    // structured path forwards the object untouched, so it never appears.
    expect(result.content[0]!.text).not.toContain('[object Object]');
    expect(result.isError).toBe(false);
  });

  it('treats an omitted arguments field as {}', async () => {
    const result = await dispatchToolCall({ name: 'glossary' });
    expect(result.isError).toBe(false);
  });

  it('does not pollute process.stdout (the monkey-patch is gone)', async () => {
    const original = process.stdout.write;
    await dispatchToolCall({ name: 'glossary', arguments: {} });
    expect(process.stdout.write).toBe(original);
  });
});

describe('dispatchToolCall — all mcpExposed tools (catalog-driven matrix)', () => {
  const descriptors = mcpExposedDescriptors();

  it('test count matches mcpExposedDescriptors().length', () => {
    expect(descriptors.length).toBe(10);
    expect(Object.keys(MCP_DISPATCH_ARGS).sort()).toEqual(descriptors.map((d) => d.name).sort());
  });

  for (const descriptor of descriptors) {
    const timeout = mcpDispatchMatrixTimeout(descriptor.name);
    it(
      `${descriptor.name}: returns structured MCP result conforming to outputSchema`,
      timeout ? { timeout } : {},
      async () => {
        const result = await dispatchToolCall({
          name: descriptor.name,
          arguments: MCP_DISPATCH_ARGS[descriptor.name] ?? {},
        });
        expect(result.structuredContent).toBeDefined();
        expect(typeof result.isError).toBe('boolean');
        expect(result.content[0]!.text).toBe(JSON.stringify(result.structuredContent));
        if (descriptor.outputSchema && !result.isError) {
          const errors = validateStructural(descriptor.outputSchema as StructuralSchema, result.structuredContent);
          expect(errors, `${descriptor.name} payload vs outputSchema: ${errors.join('; ')}`).toEqual([]);
        }
      },
    );
  }
});

describe('listTools — registry-projected catalog', () => {
  it('lists exactly the 10 handler-backed compute/verify/gate tools, each with an inputSchema', () => {
    const names = listTools().map((t) => t.name).sort();
    expect(names).toEqual([
      'asset.analyze',
      'asset.verify',
      'capsule.inspect',
      'capsule.list',
      'capsule.verify',
      'check',
      'plumb',
      'scene.compile',
      'scene.render',
      'scene.verify',
    ]);
    for (const t of listTools()) expect((t.inputSchema as { type?: string }).type).toBe('object');
  });
});
