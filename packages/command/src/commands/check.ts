/**
 * check (the tasks-vs-gates weld) — the PURE gauntlet engine fold as a finite,
 * structured command. `liteship check` runs `litelaunchGauntlet` IN-PROCESS (no
 * subprocess, no terminal streaming): it binds the built-in LiteShip gates, the
 * committed assurance map, and the committed waivers, runs the authority ratchet,
 * and returns the {@link Finding}[] work-list plus the single blocking verdict.
 *
 * This is deliberately NOT the existing `gauntlet` command — that one is CLI-owned
 * terminal orchestration that spawns the full `gauntlet:full` run. `check` is
 * the fixture-qualified gate FOLD: pure, fast, and `mcpExposed` because its
 * Finding[] is exactly the structured work-list a human (CLI) or an agent (MCP)
 * should be able to read and act on without a human in the loop.
 *
 * The engine (`@liteship/gauntlet`'s `node:fs` glob + the gate set) is INJECTED via
 * `context.runGauntlet`, never run here, so `@liteship/command` stays free of the
 * filesystem walk and the waiver-expiry clock. The adapter owns the wall-clock
 * `now` (waiver expiry is a calendar comparison — NEVER a monotonic reading).
 *
 * @module
 */
import { type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import type { Finding } from '@liteship/gauntlet';
import { capabilityUnavailable, defineCommand, failed, ok, type CommandCapability } from '../registry.js';

/**
 * The descriptor `outputSchema` for `check` — the WELD-2 Finding-carrying shape,
 * hand-written JSON-Schema and byte-parity-pinned against the parity fixture. The
 * `findings` ARE plain JSON-serializable {@link Finding} data (ruleId, severity,
 * level, title, detail, location?, remediation?), so they ride the
 * `CapsuleCommandResult` payload straight through the MCP dispatch's
 * `structuredContent` and the CLI receipt with no separate adapter. `blocked`
 * mirrors the engine's single blocking verdict; `ok` is its negation.
 *
 * The modelled `findings` element faithfully mirrors `@liteship/gauntlet`'s `Finding`
 * EXCEPT its `remediation?` — a heterogeneous non-literal union
 * (`{kind:'patch',…} | {kind:'instruction',…}`) the structural dialect cannot
 * represent soundly (no `oneOf`). `CheckPayload` below keeps the canonical
 * `Finding` type (remediation included), so no capability is narrowed away from
 * consumers — `remediation` still rides the payload at runtime and through
 * `structuredContent`, it is merely absent from the JSON-Schema description. The
 * modelled fields are pinned against the canonical `Finding` by a drift-guard in
 * tests/unit/command/check.test.ts, so this subset can't silently diverge.
 */
export const CheckPayloadSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    /** True iff a self-proven (blocking) gate emitted an error, or a waiver expired/was forbidden. */
    blocked: { type: 'boolean' },
    /** Number of kept findings across all gates (post-waiver, authority applied). */
    findingCount: { type: 'number' },
    /** The kept findings — the actionable work-list a human or agent reads. */
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' },
          severity: { enum: ['advisory', 'warning', 'error'] },
          level: { enum: ['L0', 'L1', 'L2', 'L3', 'L4'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          location: {
            type: 'object',
            properties: { file: { type: 'string' }, line: { type: 'number' }, column: { type: 'number' } },
            required: ['file'],
          },
        },
        required: ['ruleId', 'severity', 'level', 'title', 'detail'],
      },
    },
  },
  required: ['ok', 'blocked', 'findingCount', 'findings'],
} as const satisfies CommandJsonSchema;

/**
 * Structured payload returned by `check`. Mirrors `CheckPayloadSchema` for every
 * field EXCEPT `findings`, which keeps the canonical `@liteship/gauntlet` `Finding`
 * type (so `remediation` — undescribable in the outputSchema's dialect — stays in
 * the type and is never narrowed away from a consumer). The type is a faithful
 * superset on exactly that one field.
 */
export type CheckPayload = {
  readonly ok: boolean;
  readonly blocked: boolean;
  readonly findingCount: number;
  readonly findings: readonly Finding[];
};

/** `check` — run the pure gauntlet gate fold in-process; emit the Finding[] work-list + verdict. */
export const checkCommand = defineCommand({
  descriptor: {
    name: 'check',
    summary:
      'Run the pure gauntlet gate fold in-process (litelaunchGauntlet) and return structured findings + a blocking verdict.',
    requires: ['runGauntlet'] satisfies readonly CommandCapability[],
    // Optional file scope; the engine defaults to DEFAULT_GAUNTLET_GLOBS
    // (every package's TypeScript source) when omitted.
    inputSchema: {
      type: 'object',
      properties: { globs: { type: 'array', items: { type: 'string' } } },
    } as const satisfies CommandJsonSchema,
    outputSchema: CheckPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'setup' },
  },
  argsSchema: schema.struct({ globs: schema.optional(schema.array(schema.string)) }),
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runGauntlet) return capabilityUnavailable('check', ['runGauntlet']);

    // The dispatcher decodes `globs` against the argsSchema; this residual guard
    // keeps a DIRECT handler call robust to a malformed value (any non-string-array
    // falls through to the engine default).
    const globs =
      Array.isArray(invocation.args.globs) && invocation.args.globs.every((g): g is string => typeof g === 'string')
        ? invocation.args.globs
        : undefined;

    const result = await context.runGauntlet(globs);
    const findings = result.findings;

    const payload = {
      ok: !result.blocked,
      blocked: result.blocked,
      findingCount: findings.length,
      findings,
    } satisfies CheckPayload;
    return result.blocked ? failed('check', payload, 1) : ok('check', payload);
  },
});
