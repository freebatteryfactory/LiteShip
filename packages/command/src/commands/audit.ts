/**
 * audit (CUT D9b-2) — run the profile-driven structure/integrity/surface audit
 * and report a structured summary. The engine (`@czap/audit`) is INJECTED via
 * `context.runAudit`, never imported here, so `@czap/command` (and the MCP
 * server that re-uses it) stays free of the TypeScript-compiler/fast-glob audit
 * engine. Not MCP-exposed: it needs the CLI-only `runAudit` capability.
 *
 * @module
 */
import { Schema } from 'effect';
import { schemaToJsonSchema, wallClock, type CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type AuditEngineFinding,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * One audit finding, modelled for the single-source derivation. Faithfully
 * mirrors {@link AuditEngineFinding} EXCEPT its `metadata?: Record<string,
 * unknown>` — an open record (index signature) the structural dialect cannot
 * represent (no `additionalProperties`). The engine's `AuditEngineFinding[]`
 * stays assignable (it only adds the optional `metadata`), and every field the
 * CLI receipt renders (location/severity/rule/title) is modelled here.
 */
const AuditFindingSchema = Schema.Struct({
  id: Schema.String,
  section: Schema.String,
  rule: Schema.String,
  severity: Schema.Union([Schema.Literal('error'), Schema.Literal('warning'), Schema.Literal('info')]),
  title: Schema.String,
  summary: Schema.String,
  location: Schema.optional(
    Schema.Struct({
      file: Schema.String,
      line: Schema.optional(Schema.Number),
      column: Schema.optional(Schema.Number),
    }),
  ),
});

/**
 * Structured payload returned by `audit` — ONE Effect Schema is the source of
 * both {@link AuditPayload} and the descriptor's `outputSchema`.
 */
export const AuditPayloadSchema = Schema.Struct({
  errorCount: Schema.Number,
  warningCount: Schema.Number,
  infoCount: Schema.Number,
  findingCount: Schema.Number,
  suppressedCount: Schema.Number,
  passFindingCounts: Schema.Struct({
    structure: Schema.Number,
    integrity: Schema.Number,
    surface: Schema.Number,
  }),
  repoRoot: Schema.String,
  profileSource: Schema.Union([
    Schema.Literal('default'),
    Schema.Literal('file'),
    Schema.Literal('consumer'),
  ]),
  /** Present only when `--findings` was requested — receipt shape is stable by default. */
  findings: Schema.optional(Schema.Array(AuditFindingSchema)),
});

/**
 * Structured payload returned by `audit`. Single-source-derived for every field
 * EXCEPT `findings`, which keeps the canonical {@link AuditEngineFinding} type
 * (so `metadata` — an open record the outputSchema's dialect can't express —
 * stays in the type and is never narrowed away). The `outputSchema` is derived
 * from `AuditPayloadSchema` (findings minus metadata); the type is a faithful
 * superset on exactly that one field.
 */
export type AuditPayload = Omit<Schema.Schema.Type<typeof AuditPayloadSchema>, 'findings'> & {
  readonly findings?: readonly AuditEngineFinding[];
};

/** `audit [--profile <path>] [--consumer] [--findings]` — run the engine, emit a structured summary. */
export const auditCommand: HandledCommand = {
  descriptor: {
    name: 'audit',
    summary: 'Run the profile-driven structure/integrity/surface audit; report a structured summary.',
    requires: ['runAudit'] satisfies readonly CommandCapability[],
    inputSchema: schemaToJsonSchema(
      Schema.Struct({
        profile: Schema.optional(Schema.String),
        consumer: Schema.optional(Schema.Boolean),
        findings: Schema.optional(Schema.Boolean),
      }),
    ),
    outputSchema: schemaToJsonSchema(AuditPayloadSchema),
    // NOT mcpExposed: the engine is CLI-injected (runAudit); cli-only by design.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
  },
  handler: async (invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runAudit) return capabilityUnavailable('audit', ['runAudit']);

    const profile = invocation.args.profile;
    const profilePath = typeof profile === 'string' && profile.length > 0 ? profile : undefined;
    const consumer = invocation.args.consumer === true;
    const includeFindings = invocation.args.findings === true;

    const summary = await context.runAudit({
      ...(profilePath ? { profilePath } : {}),
      ...(consumer ? { consumer } : {}),
      ...(includeFindings ? { includeFindings } : {}),
    });

    return {
      status: summary.errorCount > 0 ? 'failed' : 'ok',
      command: 'audit',
      timestamp: new Date(wallClock.now()).toISOString(),
      exitCode: summary.errorCount > 0 ? 1 : 0,
      payload: {
        errorCount: summary.errorCount,
        warningCount: summary.warningCount,
        infoCount: summary.infoCount,
        findingCount: summary.findingCount,
        suppressedCount: summary.suppressedCount,
        passFindingCounts: summary.passFindingCounts,
        repoRoot: summary.repoRoot,
        profileSource: summary.profileSource,
        ...(summary.findings ? { findings: summary.findings } : {}),
      },
    };
  },
};
