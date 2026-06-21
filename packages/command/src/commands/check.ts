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
import type { CapsuleCommandResult } from '@czap/core';
import type { Finding } from '@czap/gauntlet';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * Structured payload returned by `check` — the WELD-2 Finding-carrying shape. The
 * `findings` ARE plain JSON-serializable {@link Finding} data (ruleId, severity,
 * level, title, detail, location?, remediation?), so they ride the
 * `CapsuleCommandResult` payload straight through the MCP dispatch's
 * `structuredContent` and the CLI receipt with no separate adapter. `blocked`
 * mirrors the engine's single blocking verdict; `ok` is its negation.
 */
export interface CheckPayload {
  readonly ok: boolean;
  /** True iff a self-proven (blocking) gate emitted an error, or a waiver expired/was forbidden. */
  readonly blocked: boolean;
  /** Number of kept findings across all gates (post-waiver, authority applied). */
  readonly findingCount: number;
  /** The kept findings — the actionable work-list a human or agent reads. */
  readonly findings: readonly Finding[];
}

/** `check` — run the pure gauntlet gate fold in-process; emit the Finding[] work-list + verdict. */
export const checkCommand: HandledCommand = {
  descriptor: {
    name: 'check',
    summary:
      'Run the pure gauntlet gate fold in-process (litelaunchGauntlet) and return structured findings + a blocking verdict.',
    requires: ['runGauntlet'] satisfies readonly CommandCapability[],
    inputSchema: {
      type: 'object',
      properties: {
        // Optional file scope; the engine defaults to DEFAULT_GAUNTLET_GLOBS
        // (every package's TypeScript source) when omitted.
        globs: { type: 'array', items: { type: 'string' } },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['ok', 'blocked', 'findingCount', 'findings'],
      properties: {
        ok: { type: 'boolean' },
        blocked: { type: 'boolean' },
        findingCount: { type: 'number' },
        findings: { type: 'array' },
      },
    },
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
      timestamp: new Date().toISOString(),
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
