/**
 * check (the tasks-vs-gates weld) — the PURE gauntlet engine fold as a finite,
 * structured command. `czap check` runs `litelaunchGauntlet` IN-PROCESS (no
 * subprocess, no terminal streaming): it binds the built-in LiteShip gates, the
 * committed assurance map, and the committed waivers, runs the authority ratchet,
 * and returns the {@link Finding}[] work-list plus the single blocking verdict.
 *
 * This is deliberately NOT the existing `gauntlet` command — that one is CLI-owned
 * terminal orchestration that spawns the 28-phase `gauntlet:full` run. `check` is
 * the fixture-qualified gate FOLD: pure, fast, and `mcpExposed` because its
 * Finding[] is exactly the structured work-list a human (CLI) or an agent (MCP)
 * should be able to read and act on without a human in the loop.
 *
 * The engine (`@czap/gauntlet`'s `node:fs` glob + the gate set) is INJECTED via
 * `context.runGauntlet`, never run here, so `@czap/command` stays free of the
 * filesystem walk and the waiver-expiry clock. The adapter owns the wall-clock
 * `now` (waiver expiry is a calendar comparison — NEVER a monotonic reading).
 *
 * @module
 */
import { Schema } from 'effect';
import { schemaToJsonSchema, wallClock, type CapsuleCommandResult } from '@czap/core';
import type { Finding } from '@czap/gauntlet';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * One gauntlet finding, modelled for the single-source derivation. Faithfully
 * mirrors `@czap/gauntlet`'s `Finding` EXCEPT its `remediation?` — a
 * heterogeneous non-literal union (`{kind:'patch',…} | {kind:'instruction',…}`)
 * the structural dialect cannot represent soundly (no `oneOf`). The engine's
 * `Finding[]` stays assignable (it only adds the optional `remediation`), and
 * every field the CLI receipt + MCP work-list render (ruleId/severity/level/
 * title/detail/location) is modelled here. `severity`/`level` derive to enums.
 *
 * This schema is the source for the `outputSchema` ONLY; `CheckPayload` below
 * keeps the canonical `@czap/gauntlet` `Finding` type (remediation included), so
 * no capability is narrowed away from consumers — `remediation` still rides the
 * payload at runtime and through `structuredContent`, it is merely absent from
 * the JSON-Schema description (the one field the dialect can't express). The
 * modelled fields are pinned against the canonical `Finding` by a drift-guard in
 * tests/unit/command/check.test.ts, so this subset can't silently diverge.
 */
const FindingSchema = Schema.Struct({
  ruleId: Schema.String,
  severity: Schema.Union([Schema.Literal('advisory'), Schema.Literal('warning'), Schema.Literal('error')]),
  level: Schema.Union([
    Schema.Literal('L0'),
    Schema.Literal('L1'),
    Schema.Literal('L2'),
    Schema.Literal('L3'),
    Schema.Literal('L4'),
  ]),
  title: Schema.String,
  detail: Schema.String,
  location: Schema.optional(
    Schema.Struct({
      file: Schema.String,
      line: Schema.optional(Schema.Number),
      column: Schema.optional(Schema.Number),
    }),
  ),
});

/**
 * Structured payload returned by `check` — the WELD-2 Finding-carrying shape. The
 * `findings` ARE plain JSON-serializable {@link Finding} data (ruleId, severity,
 * level, title, detail, location?, remediation?), so they ride the
 * `CapsuleCommandResult` payload straight through the MCP dispatch's
 * `structuredContent` and the CLI receipt with no separate adapter. `blocked`
 * mirrors the engine's single blocking verdict; `ok` is its negation.
 */
export const CheckPayloadSchema = Schema.Struct({
  ok: Schema.Boolean,
  /** True iff a self-proven (blocking) gate emitted an error, or a waiver expired/was forbidden. */
  blocked: Schema.Boolean,
  /** Number of kept findings across all gates (post-waiver, authority applied). */
  findingCount: Schema.Number,
  /** The kept findings — the actionable work-list a human or agent reads. */
  findings: Schema.Array(FindingSchema),
});

/**
 * Structured payload returned by `check`. Single-source-derived for every field
 * EXCEPT `findings`, which keeps the canonical `@czap/gauntlet` `Finding` type
 * (so `remediation` — undescribable in the outputSchema's dialect — stays in the
 * type and is never narrowed away from a consumer). The `outputSchema` is derived
 * from `CheckPayloadSchema` (findings minus remediation); the type is a faithful
 * superset on exactly that one field.
 */
export type CheckPayload = Omit<Schema.Schema.Type<typeof CheckPayloadSchema>, 'findings'> & {
  readonly findings: readonly Finding[];
};

/** `check` — run the pure gauntlet gate fold in-process; emit the Finding[] work-list + verdict. */
export const checkCommand: HandledCommand = {
  descriptor: {
    name: 'check',
    summary:
      'Run the pure gauntlet gate fold in-process (litelaunchGauntlet) and return structured findings + a blocking verdict.',
    requires: ['runGauntlet'] satisfies readonly CommandCapability[],
    inputSchema: schemaToJsonSchema(
      // Optional file scope; the engine defaults to DEFAULT_GAUNTLET_GLOBS
      // (every package's TypeScript source) when omitted.
      Schema.Struct({ globs: Schema.optional(Schema.Array(Schema.String)) }),
    ),
    outputSchema: schemaToJsonSchema(CheckPayloadSchema),
    annotations: { readOnly: true, mcpExposed: true, group: 'castoff' },
  },
  handler: async (invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runGauntlet) return capabilityUnavailable('check', ['runGauntlet']);

    // Optional scope: a `globs` string[] narrows the file set; anything else
    // (absent / wrong shape) falls through to the engine default.
    const rawGlobs = (invocation.args as { readonly globs?: unknown }).globs;
    const globs =
      Array.isArray(rawGlobs) && rawGlobs.every((g): g is string => typeof g === 'string') ? rawGlobs : undefined;

    const result = await context.runGauntlet(globs);
    const findings = result.findings;

    return {
      status: result.blocked ? 'failed' : 'ok',
      command: 'check',
      timestamp: new Date(wallClock.now()).toISOString(),
      exitCode: result.blocked ? 1 : 0,
      payload: {
        ok: !result.blocked,
        blocked: result.blocked,
        findingCount: findings.length,
        findings,
      } satisfies CheckPayload,
    };
  },
};
