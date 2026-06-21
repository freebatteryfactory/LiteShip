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
import { Schema } from 'effect';
import { schemaToJsonSchema, wallClock, type CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * Structured payload returned by `audit-floor` — ONE Effect Schema is the source
 * of both {@link AuditFloorPayload} and the descriptor's `outputSchema`. `delta`
 * is now a modelled nested struct (the validator recurses into it), tighter than
 * the old bare `{type:'object'}`.
 */
export const AuditFloorPayloadSchema = Schema.Struct({
  ok: Schema.Boolean,
  /** Number of pinned floor warnings (`AUDIT_WARNING_FLOOR.length`). */
  expectedWarnings: Schema.Number,
  /** Number of `rule@file` warning keys the engine actually surfaced. */
  actualWarnings: Schema.Number,
  /** Error-severity findings across all three passes — any error fails the gate. */
  errorCount: Schema.Number,
  /** Warning-inventory drift against the floor: `added` are new, `removed` are gone. */
  delta: Schema.Struct({ added: Schema.Array(Schema.String), removed: Schema.Array(Schema.String) }),
  /** The sorted `rule@file` warning inventory the engine surfaced. */
  inventory: Schema.Array(Schema.String),
});

/** Structured payload returned by `audit-floor`. */
export type AuditFloorPayload = Schema.Schema.Type<typeof AuditFloorPayloadSchema>;

/** `audit-floor` — run the three-pass engine, diff the warning inventory against the floor; emit a verdict. */
export const auditFloorCommand: HandledCommand = {
  descriptor: {
    name: 'audit-floor',
    summary:
      'Audit warning-floor gate: fail when the artifact-independent three-pass warning inventory drifts from AUDIT_WARNING_FLOOR or any error is present.',
    requires: ['runAuditFloor'] satisfies readonly CommandCapability[],
    inputSchema: schemaToJsonSchema(Schema.Struct({})),
    outputSchema: schemaToJsonSchema(AuditFloorPayloadSchema),
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
