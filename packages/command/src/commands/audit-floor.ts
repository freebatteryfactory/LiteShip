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
import { wallClock, type CapsuleCommandResult, type CommandJsonSchema } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * The descriptor `outputSchema` for `audit-floor` — hand-written JSON-Schema,
 * byte-parity-pinned against the parity fixture. `delta` is a modelled nested
 * struct (the validator recurses into it), tighter than a bare `{type:'object'}`.
 * {@link AuditFloorPayload} is its plain-TS mirror.
 */
export const AuditFloorPayloadSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    /** Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`). */
    expectedWarnings: { type: 'number' },
    /** Number of `rule@file` warning keys the engine actually surfaced. */
    actualWarnings: { type: 'number' },
    /** Error-severity findings across all three passes — any error fails the gate. */
    errorCount: { type: 'number' },
    /** Warning-inventory drift against the floor: `added` are new, `removed` are gone. */
    delta: {
      type: 'object',
      properties: {
        added: { type: 'array', items: { type: 'string' } },
        removed: { type: 'array', items: { type: 'string' } },
      },
      required: ['added', 'removed'],
    },
    /** The sorted `rule@file` warning inventory the engine surfaced. */
    inventory: { type: 'array', items: { type: 'string' } },
  },
  required: ['ok', 'expectedWarnings', 'actualWarnings', 'errorCount', 'delta', 'inventory'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by `audit-floor`. */
export type AuditFloorPayload = {
  readonly ok: boolean;
  readonly expectedWarnings: number;
  readonly actualWarnings: number;
  readonly errorCount: number;
  readonly delta: { readonly added: readonly string[]; readonly removed: readonly string[] };
  readonly inventory: readonly string[];
};

/** `audit-floor` — run the three-pass engine, diff the warning inventory against the floor; emit a verdict. */
export const auditFloorCommand: HandledCommand = {
  descriptor: {
    name: 'audit-floor',
    summary:
      'Audit warning-floor gate: fail when the artifact-independent three-pass warning inventory drifts from AUDIT_WARNING_FLOOR or any error is present.',
    requires: ['runAuditFloor'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} } as const satisfies CommandJsonSchema,
    outputSchema: AuditFloorPayloadSchema,
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
      timestamp: new Date(wallClock.now()).toISOString(),
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
