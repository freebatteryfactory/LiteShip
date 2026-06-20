/**
 * capsule-verify (script collapse) — the capsule-corpus gate as a finite,
 * structured command (migrated from `scripts/capsule-verify.ts`). It fails when
 * the committed generated corpus would ship dishonest or stale: a missing
 * generated test/bench, a committed file that a fresh `capsule:compile` would
 * change (confirmed by regeneration, never by raw mtime), a lazy placeholder
 * bench (a `bench()` measuring nothing — the bench analogue of `it.skip`), a
 * marker↔manifest drift, or a generated test that runs red.
 *
 * The engine (manifest read, mtime fast-path, regeneration confirmation via a
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
import type { CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CapsuleBenchClassification,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/** Structured payload returned by `capsule-verify`. */
export interface CapsuleVerifyPayload {
  readonly status: 'ok' | 'stale' | 'failed';
  /** Human work-list: each blocking reason (missing/stale/dishonest/red). Empty on `ok`. */
  readonly errors: readonly string[];
  /** Number of capsules in the manifest the gate read. */
  readonly capsuleCount: number;
  /** Per-corpus bench-honesty classification (total / real / placeholder names). */
  readonly benches: CapsuleBenchClassification;
}

/** `capsule-verify` — freshness + bench-honesty + green-suite gate over the committed capsule corpus. */
export const capsuleVerifyGateCommand: HandledCommand = {
  descriptor: {
    name: 'capsule-verify',
    summary:
      'Capsule-corpus gate: assert every generated test+bench is present, fresh (regeneration-confirmed), bench-honest, and that the generated suite passes.',
    requires: ['runCapsuleGate'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      required: ['status', 'errors', 'capsuleCount', 'benches'],
      properties: {
        status: { type: 'string', enum: ['ok', 'stale', 'failed'] },
        errors: { type: 'array' },
        capsuleCount: { type: 'number' },
        benches: { type: 'object' },
      },
    },
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

    return {
      status: summary.status === 'ok' ? 'ok' : 'failed',
      command: 'capsule-verify',
      timestamp: new Date().toISOString(),
      exitCode: summary.status === 'ok' ? 0 : 1,
      payload: {
        status: summary.status,
        errors: summary.errors,
        capsuleCount: summary.capsuleCount,
        benches: summary.benches,
      } satisfies CapsuleVerifyPayload,
    };
  },
};
