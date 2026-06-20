/**
 * check-invariants (CUT A3) — the fast-lane invariant gate as a finite,
 * structured command (migrated from `scripts/check-invariants.ts`). It fails when
 * production source under `packages/**` contains a banned pattern (require /
 * module.exports / `var` / a default export outside the sanctioned Astro contract
 * files / a hand-parsed signal axis), or when a committed text file violates the
 * `.gitattributes` line-ending policy.
 *
 * The scan engine (`node:fs` source walk + the `git ls-files --eol` line-ending
 * probe + the `INVARIANTS` rule set) is INJECTED via `context.runCheckInvariants`,
 * never imported here, so `@czap/command` stays free of `node:fs`/`child_process`.
 * Like `plumb` (and unlike `audit`, whose `@czap/audit` engine is heavy and
 * CLI-only), `runCheckInvariants` is provisioned in the shared host factory
 * (`createNodeCommandContext`), so the MCP host has it too — the command is
 * `mcpExposed` because it returns a STRUCTURED verdict (per-rule violation groups
 * + line-ending offenders), which is exactly the work-list an agent should read.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
  type InvariantViolationGroup,
} from '../registry.js';

/** Structured payload returned by `check-invariants`. */
export interface CheckInvariantsPayload {
  readonly ok: boolean;
  /** Banned-pattern violations, grouped by the rule that flagged them. */
  readonly groups: readonly InvariantViolationGroup[];
  /** Committed text files whose line endings violate the `.gitattributes` policy. */
  readonly lineEndings: readonly string[];
}

/** `check-invariants` — scan source for banned patterns + line-ending policy; emit a structured verdict. */
export const checkInvariantsCommand: HandledCommand = {
  descriptor: {
    name: 'check-invariants',
    summary:
      'Fast-lane invariant gate: fail on any banned source pattern (require/module.exports/var/ESM violation) or line-ending policy breach.',
    requires: ['runCheckInvariants'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      required: ['ok', 'groups', 'lineEndings'],
      properties: {
        ok: { type: 'boolean' },
        groups: { type: 'array' },
        lineEndings: { type: 'array' },
      },
    },
    annotations: { readOnly: true, mcpExposed: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runCheckInvariants) return capabilityUnavailable('check-invariants', ['runCheckInvariants']);

    const summary = await context.runCheckInvariants();

    return {
      status: summary.ok ? 'ok' : 'failed',
      command: 'check-invariants',
      timestamp: new Date().toISOString(),
      exitCode: summary.ok ? 0 : 1,
      payload: {
        ok: summary.ok,
        groups: summary.groups,
        lineEndings: summary.lineEndings,
      } satisfies CheckInvariantsPayload,
    };
  },
};
