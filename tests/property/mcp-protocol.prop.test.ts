import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { dispatch } from '../../packages/mcp-server/src/dispatch.js';
import { JsonRpcServer, type JsonRpcId } from '../../packages/mcp-server/src/jsonrpc.js';

const jsonRpcId = fc.oneof(fc.string(), fc.integer(), fc.constant(null));
const method = fc.string({ minLength: 1, maxLength: 48 });
const params = fc.oneof(
  fc.array(fc.jsonValue(), { maxLength: 8 }),
  fc.dictionary(fc.string({ maxLength: 16 }), fc.jsonValue(), { maxKeys: 8 }),
);

describe('MCP JSON-RPC protocol properties', () => {
  it('preserves every admitted request id through parsing and unknown-method dispatch', async () => {
    await fc.assert(
      fc.asyncProperty(jsonRpcId, method, params, async (id, name, values) => {
        const wire = JSON.stringify({ jsonrpc: '2.0', id, method: name, params: values });
        const parsed = JsonRpcServer.parse(wire);
        expect(parsed).toMatchObject({ kind: 'request', message: { id } });
        if (parsed.kind !== 'request') return;
        const response = await dispatch(parsed.message);
        expect(response?.id).toEqual(id);
      }),
      { numRuns: 150 },
    );
  });

  it('classifies every admitted message without id as a notification and emits no response', async () => {
    await fc.assert(
      fc.asyncProperty(method, params, async (name, values) => {
        const parsed = JsonRpcServer.parse(JSON.stringify({ jsonrpc: '2.0', method: name, params: values }));
        expect(parsed.kind).toBe('notification');
        if (parsed.kind !== 'notification') return;
        expect(await dispatch(parsed.message)).toBeNull();
      }),
      { numRuns: 150 },
    );
  });

  it('preserves batch order, cardinality, and request/notification classification', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.boolean(), jsonRpcId, method), { minLength: 1, maxLength: 32 }), (entries) => {
        const batch = entries.map(([request, id, name]) =>
          request ? { jsonrpc: '2.0', id, method: name } : { jsonrpc: '2.0', method: name },
        );
        const parsed = JsonRpcServer.parse(JSON.stringify(batch));
        expect(parsed.kind).toBe('batch');
        if (parsed.kind !== 'batch') return;
        expect(parsed.outcomes).toHaveLength(entries.length);
        expect(parsed.outcomes.map((outcome) => outcome.kind)).toEqual(
          entries.map(([request]) => (request ? 'request' : 'notification')),
        );
      }),
      { numRuns: 150 },
    );
  });

  it('refuses scalar params and non-wire ids instead of casting them into the typed union', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.boolean(), fc.string(), fc.integer()),
        fc.oneof(fc.boolean(), fc.array(fc.jsonValue(), { maxLength: 3 }), fc.dictionary(fc.string(), fc.jsonValue())),
        (badParams, badId) => {
          fc.pre(typeof badParams !== 'object');
          fc.pre(typeof badId !== 'string' && typeof badId !== 'number' && badId !== null);
          expect(
            JsonRpcServer.parse(
              JSON.stringify({ jsonrpc: '2.0', id: 1 as JsonRpcId, method: 'probe', params: badParams }),
            ).kind,
          ).toBe('invalid-request');
          expect(JsonRpcServer.parse(JSON.stringify({ jsonrpc: '2.0', id: badId, method: 'probe' })).kind).toBe(
            'invalid-request',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('never throws while classifying arbitrary JSON values', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(() => JsonRpcServer.parse(JSON.stringify(value))).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });
});
