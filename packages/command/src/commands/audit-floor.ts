/**
 * audit-floor (CUT A4) — the audit warning-floor gate as a finite, structured
 * command (migrated from `scripts/audit-floor.ts`). It fails when the
 * artifact-independent three-pass warning inventory drifts from the pinned
 * `AUDIT_WARNING_FLOOR`, or when ANY error-severity finding is present.
 *
 * The engine (`@czap/audit`'s structure/integrity/surface passes) is INJECTED via
 * `context.runAuditFloor`, never imported here, so `@czap/command` (and the MCP
 * server that re-uses it) stays free of the TypeScript-compiler/fast-glob audit
 * engine. Unlike `plumb`/`check-invariants` (whose scans are pure `node:fs` and
 * are provisioned in the shared host factory), this gate rides the HEAVY
 * `@czap/audit` engine — exactly like `audit` — so it is CLI-only and NOT
 * MCP-exposed: only `@czap/cli` injects `runAuditFloor`, and over MCP the command
 * degrades to a structured `capabilityUnavailable` failure.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/** Structured payload returned by `audit-floor`. */
export interface AuditFloorPayload {
  readonly ok: boolean;
  /** Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`). */
  readonly expectedWarnings: number;
  /** Number of `rule@file` warning keys the engine actually surfaced. */
  readonly actualWarnings: number;
  /** Error-severity findings across all three passes — any error fails the gate. */
  readonly errorCount: number;
  /** Warning-inventory drift against the floor: `added` are new, `removed` are gone. */
  readonly delta: { readonly added: readonly string[]; readonly removed: readonly string[] };
  /** The sorted `rule@file` warning inventory the engine surfaced. */
  readonly inventory: readonly string[];
}

/** `audit-floor` — run the three-pass engine, diff the warning inventory against the floor; emit a verdict. */
export const auditFloorCommand: HandledCommand = {
  descriptor: {
    name: 'audit-floor',
    summary:
      'Audit warning-floor gate: fail when the artifact-independent three-pass warning inventory drifts from AUDIT_WARNING_FLOOR or any error is present.',
    requires: ['runAuditFloor'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      required: ['ok', 'expectedWarnings', 'actualWarnings', 'errorCount', 'delta', 'inventory'],
      properties: {
        ok: { type: 'boolean' },
        expectedWarnings: { type: 'number' },
        actualWarnings: { type: 'number' },
        errorCount: { type: 'number' },
        delta: { type: 'object' },
        inventory: { type: 'array' },
      },
    },
    // NOT mcpExposed: the engine is the heavy CLI-injected `@czap/audit` (runAuditFloor); cli-only by design.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runAuditFloor) return capabilityUnavailable('audit-floor', ['runAuditFloor']);

    const summary = await context.runAuditFloor();

    return {
      status: summary.ok ? 'ok' : 'failed',
      command: 'audit-floor',
      timestamp: new Date().toISOString(),
      exitCode: summary.ok ? 0 : 1,
      payload: {
        ok: summary.ok,
        expectedWarnings: summary.expectedWarnings,
        actualWarnings: summary.actualWarnings,
        errorCount: summary.errorCount,
        delta: summary.delta,
        inventory: summary.inventory,
      } satisfies AuditFloorPayload,
    };
  },
};
