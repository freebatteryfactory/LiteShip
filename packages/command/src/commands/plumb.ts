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
import { Schema } from 'effect';
import { schemaToJsonSchema, type CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * One skipped generated test, modelled for the single-source derivation. The
 * `kind` literal-union faithfully mirrors {@link PlumbSkip} so the engine's
 * `PlumbSkip[]` is assignable to the derived element type and the `skips` array's
 * `items` schema is the real element shape (tighter than a bare `{type:'array'}`).
 */
const PlumbSkipSchema = Schema.Struct({
  file: Schema.String,
  kind: Schema.Union([
    Schema.Literal('it.skip'),
    Schema.Literal('test.skip'),
    Schema.Literal('describe.skip'),
    Schema.Literal('bench.skip'),
  ]),
  message: Schema.String,
});

/**
 * Structured payload returned by `plumb` — ONE Effect Schema is the source of
 * both {@link PlumbPayload} and the descriptor's `outputSchema`.
 */
export const PlumbPayloadSchema = Schema.Struct({
  /** Whether the gate passed (no skips, no unclassified packages). */
  ok: Schema.Boolean,
  /** Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking. */
  skips: Schema.Array(PlumbSkipSchema),
  /** Published packages with no PACKAGE_PLUMB classification. */
  unclassified: Schema.Array(Schema.String),
  /** Whether the generated test corpus was present to scan (false ⇒ run capsule:compile). */
  generatedPresent: Schema.Boolean,
});

/** Structured payload returned by `plumb`. */
export type PlumbPayload = Schema.Schema.Type<typeof PlumbPayloadSchema>;

/** `plumb` — scan for placeholder skips + unclassified packages; emit a structured pass/fail verdict. */
export const plumbCommand: HandledCommand = {
  descriptor: {
    name: 'plumb',
    summary:
      'Plumb-completeness gate: fail on any tests/generated/ placeholder skip or unclassified published package.',
    requires: ['runPlumb'] satisfies readonly CommandCapability[],
    inputSchema: schemaToJsonSchema(Schema.Struct({})),
    outputSchema: schemaToJsonSchema(PlumbPayloadSchema),
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
