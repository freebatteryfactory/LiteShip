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
 * The descriptor `outputSchema` for `plumb` — hand-written JSON-Schema,
 * byte-parity-pinned against the parity fixture. {@link PlumbPayload} is its
 * plain-TS mirror.
 *
 * The `skips` element `kind` mirrors {@link PlumbSkip.kind} — the detected skip
 * TOKEN from the UNIFIED alias-aware detector (`@czap/gauntlet`'s `detectSkips`),
 * which covers every form a generated test can carry (`it.skip` / `test.skip` /
 * `describe.skip` / `bench.skip` / `it.todo` / `xit` / the runtime-conditional
 * `it.skipIf` / `it.runIf` / the `COND ? it : it.skip` alias). It is a free
 * `string` (not a closed literal union) so a new runner-verb skip form the
 * detector learns is faithfully surfaced — a generated test must NEVER skip.
 */
export const PlumbPayloadSchema = {
  type: 'object',
  properties: {
    /** Whether the gate passed (no skips, no unclassified packages). */
    ok: { type: 'boolean' },
    /** Every `*.skip(...)` placeholder in `tests/generated/` — each one is blocking. */
    skips: {
      type: 'array',
      items: {
        type: 'object',
        properties: { file: { type: 'string' }, kind: { type: 'string' }, message: { type: 'string' } },
        required: ['file', 'kind', 'message'],
      },
    },
    /** Published packages with no PACKAGE_PLUMB classification. */
    unclassified: { type: 'array', items: { type: 'string' } },
    /** Whether the generated test corpus was present to scan (false ⇒ run capsule:compile). */
    generatedPresent: { type: 'boolean' },
    /** Human-readable reason when the generated test corpus is missing or empty. */
    generatedCorpusMessage: { type: ['string', 'null'] },
  },
  required: ['ok', 'skips', 'unclassified', 'generatedPresent', 'generatedCorpusMessage'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by `plumb`. */
export type PlumbPayload = {
  readonly ok: boolean;
  readonly skips: readonly { readonly file: string; readonly kind: string; readonly message: string }[];
  readonly unclassified: readonly string[];
  readonly generatedPresent: boolean;
  readonly generatedCorpusMessage: string | null;
};

/** `plumb` — scan for placeholder skips + unclassified packages; emit a structured pass/fail verdict. */
export const plumbCommand: HandledCommand = {
  descriptor: {
    name: 'plumb',
    summary:
      'Plumb-completeness gate: fail on any tests/generated/ placeholder skip or unclassified published package.',
    requires: ['runPlumb'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} } as const satisfies CommandJsonSchema,
    outputSchema: PlumbPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runPlumb) return capabilityUnavailable('plumb', ['runPlumb']);

    const summary = await context.runPlumb();

    const payload = {
      ok: summary.ok,
      skips: summary.skips,
      unclassified: summary.unclassified,
      generatedPresent: summary.generatedPresent,
      generatedCorpusMessage: summary.generatedCorpusMessage,
    } satisfies PlumbPayload;
    return summary.ok ? ok('plumb', payload) : failed('plumb', payload, 1);
  },
};
