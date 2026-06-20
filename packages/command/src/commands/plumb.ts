/**
 * plumb (CUT A2) — the plumb-completeness gate as a finite, structured command
 * (migrated from `scripts/plumb-gate.ts`). It fails when the repo would ship
 * incomplete work green: ANY `*.skip` placeholder in `tests/generated/` (a
 * skipped generated test is unwired work shipping green — a LIE about coverage),
 * or any published package missing a `PACKAGE_PLUMB` classification.
 *
 * The scan engine (`node:fs` directory walk + the `PACKAGE_PLUMB` ledger) is
 * INJECTED via `context.runPlumb`, never imported here, so `@czap/command` stays
 * free of `node:fs`. Unlike `audit` (whose `@czap/audit` engine is heavy and
 * CLI-only), `runPlumb` is provisioned in the shared host factory
 * (`createNodeCommandContext`), so the MCP host has it too — the command is
 * `mcpExposed` because it returns a STRUCTURED verdict (skip-list + unclassified
 * list + ok), which is exactly the work-list an agent should be able to read.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
  type PlumbSkip,
} from '../registry.js';

/** Structured payload returned by `plumb`. */
export interface PlumbPayload {
  readonly ok: boolean;
  /** Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking. */
  readonly skips: readonly PlumbSkip[];
  /** Published packages with no PACKAGE_PLUMB classification. */
  readonly unclassified: readonly string[];
  /** Whether the generated test corpus was present to scan (false ⇒ run capsule:compile). */
  readonly generatedPresent: boolean;
}

/** `plumb` — scan for placeholder skips + unclassified packages; emit a structured pass/fail verdict. */
export const plumbCommand: HandledCommand = {
  descriptor: {
    name: 'plumb',
    summary:
      'Plumb-completeness gate: fail on any tests/generated/ placeholder skip or unclassified published package.',
    requires: ['runPlumb'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      required: ['ok', 'skips', 'unclassified', 'generatedPresent'],
      properties: {
        ok: { type: 'boolean' },
        skips: { type: 'array' },
        unclassified: { type: 'array' },
        generatedPresent: { type: 'boolean' },
      },
    },
    annotations: { readOnly: true, mcpExposed: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runPlumb) return capabilityUnavailable('plumb', ['runPlumb']);

    const summary = await context.runPlumb();

    return {
      status: summary.ok ? 'ok' : 'failed',
      command: 'plumb',
      timestamp: new Date().toISOString(),
      exitCode: summary.ok ? 0 : 1,
      payload: {
        ok: summary.ok,
        skips: summary.skips,
        unclassified: summary.unclassified,
        generatedPresent: summary.generatedPresent,
      } satisfies PlumbPayload,
    };
  },
};
