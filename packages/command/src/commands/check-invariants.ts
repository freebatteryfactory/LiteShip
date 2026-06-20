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
 * Like `audit`/`audit-floor` (and UNLIKE `plumb`), the scan needs `@czap/audit`'s
 * `normalizeRepoPath` (the one B5b slash-normalize home) and `@czap/command` may
 * not import `@czap/audit` (it would drag the heavy TS-compiler/glob engine into
 * `@czap/mcp-server`). So the capability is provisioned ONLY by `@czap/cli`, not
 * in the shared host factory: the command is CLI-only and NOT `mcpExposed` —
 * over MCP the capability is absent and the handler degrades to a structured
 * `capabilityUnavailable` failure.
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
    // NOT mcpExposed: the scan needs @czap/audit's normalizeRepoPath (B5b cage),
    // so it is CLI-only by design — only @czap/cli injects runCheckInvariants.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
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
