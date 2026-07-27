import { describe, expect, it } from 'vitest';
import {
  JSON_RPC_CAPSULE_WITNESSES,
  jsonRpcServerCapsule,
  observeJsonRpcProtocol,
  observeJsonRpcProtocolWith,
  parse,
  type ParseOutcome,
} from '../../../packages/mcp-server/src/jsonrpc.js';

type ProtocolRun = (input: string) => ParseOutcome;

function failedInvariants(run: ProtocolRun): readonly string[] {
  const failed = new Set<string>();
  const input = JSON_RPC_CAPSULE_WITNESSES[3];
  const output = observeJsonRpcProtocolWith(run, input);
  for (const invariant of jsonRpcServerCapsule.invariants) {
    if (!invariant.check(input, output)) failed.add(invariant.name);
  }
  return [...failed].sort();
}

describe('mcp.jsonrpc-server generated invariant oracle', () => {
  it('accepts the live protocol subject across every deterministic witness', () => {
    expect(failedInvariants(parse)).toEqual([]);
    expect(jsonRpcServerCapsule.run?.('arbitrary generated input')).toEqual(
      observeJsonRpcProtocol('arbitrary generated input'),
    );
  });

  it('kills a malformed-frame acceptance mutant', () => {
    const mutant: ProtocolRun = (input) =>
      input === JSON_RPC_CAPSULE_WITNESSES[0] ? { kind: 'invalid-request', id: null } : parse(input);

    expect(failedInvariants(mutant)).toContain('malformed-json-yields-parse-error');
  });

  it('kills a request-correlation mutant', () => {
    const mutant: ProtocolRun = (input) => {
      const output = parse(input);
      return output.kind === 'request' ? { ...output, message: { ...output.message, id: 'wrong-request-id' } } : output;
    };

    expect(failedInvariants(mutant)).toContain('request-id-round-trips');
  });

  it('kills a notification-lifecycle mutant that fabricates a request id', () => {
    const mutant: ProtocolRun = (input) => {
      const output = parse(input);
      return output.kind === 'notification' ? { kind: 'request', message: { ...output.message, id: null } } : output;
    };

    expect(failedInvariants(mutant)).toContain('absent-id-classifies-as-notification');
  });
});
