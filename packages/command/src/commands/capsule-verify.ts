/**
 * capsule-verify (script collapse) — the capsule-corpus gate as a finite,
 * structured command (migrated from `scripts/capsule-verify.ts`). It fails when
 * the committed generated corpus would ship dishonest or stale: a missing
 * generated test/bench, a committed file that a fresh `capsule:compile` would
 * change (confirmed by regeneration, never by raw mtime), a lazy placeholder
 * bench (a `bench()` measuring nothing — the bench analogue of `it.skip`), a
 * marker↔manifest drift, or a generated test that runs red.
 *
 * The engine (manifest read, mtime `fast-path`, regeneration confirmation via a
 * `capsule:compile` spawn, the bench classifier, and the final `vitest run` over
 * `tests/generated/`) is INJECTED via `context.runCapsuleGate`, never imported
 * here, so `@czap/command` (and the MCP server that re-uses it) stays free of the
 * subprocess/child_process edge. Unlike `plumb`/`check-invariants` (pure
 * `node:fs` scans provisioned in the shared host factory), this gate is a
 * terminal-streaming SUBPROCESS orchestrator — in the same category as
 * `package-smoke`/`gauntlet`/`ship`. So it is CLI-only and NOT MCP-exposed: only
 * `@czap/cli` injects `runCapsuleGate`, and over MCP the command degrades to a
 * structured `capabilityUnavailable` failure.
 *
 * @module
 */
import { type CapsuleCommandResult, type CommandJsonSchema } from '@czap/core';
import {
  capabilityUnavailable,
  failed,
  ok,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * The descriptor `outputSchema` for `capsule-verify` — hand-written JSON-Schema,
 * byte-parity-pinned against the parity fixture. `benches` recurses into the real
 * total/real/placeholder shape (tighter than a bare object) and mirrors
 * {@link CapsuleBenchClassification}. {@link CapsuleVerifyPayload} is its plain-TS
 * mirror.
 */
export const CapsuleVerifyPayloadSchema = {
  type: 'object',
  properties: {
    status: { enum: ['ok', 'stale', 'failed'] },
    /** Human work-list: each blocking reason (missing/stale/dishonest/red). Empty on `ok`. */
    errors: { type: 'array', items: { type: 'string' } },
    /** Number of capsules in the manifest the gate read. */
    capsuleCount: { type: 'number' },
    /** Per-corpus bench-honesty classification (total / real / placeholder names). */
    benches: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        real: { type: 'number' },
        placeholder: { type: 'array', items: { type: 'string' } },
      },
      required: ['total', 'real', 'placeholder'],
    },
  },
  required: ['status', 'errors', 'capsuleCount', 'benches'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by `capsule-verify`. */
export type CapsuleVerifyPayload = {
  readonly status: 'ok' | 'stale' | 'failed';
  readonly errors: readonly string[];
  readonly capsuleCount: number;
  readonly benches: { readonly total: number; readonly real: number; readonly placeholder: readonly string[] };
};

/** `capsule-verify` — freshness + bench-honesty + green-suite gate over the committed capsule corpus. */
export const capsuleVerifyGateCommand: HandledCommand = {
  descriptor: {
    name: 'capsule-verify',
    summary:
      'Capsule-corpus gate: assert every generated test+bench is present, fresh (regeneration-confirmed), bench-honest, and that the generated suite passes.',
    requires: ['runCapsuleGate'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} } as const satisfies CommandJsonSchema,
    outputSchema: CapsuleVerifyPayloadSchema,
    // NOT mcpExposed: the engine is a CLI-injected subprocess orchestrator
    // (runCapsuleGate spawns `capsule:compile` to confirm freshness and `vitest
    // run` over tests/generated/, mutating a scratch tree); terminal-streaming,
    // like package-smoke/gauntlet/ship, so cli-only by design.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runCapsuleGate) return capabilityUnavailable('capsule-verify', ['runCapsuleGate']);

    const summary = await context.runCapsuleGate();

    const payload = {
      status: summary.status,
      errors: summary.errors,
      capsuleCount: summary.capsuleCount,
      benches: summary.benches,
    } satisfies CapsuleVerifyPayload;
    return summary.status === 'ok' ? ok('capsule-verify', payload) : failed('capsule-verify', payload, 1);
  },
};
