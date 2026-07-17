/**
 * audit (CUT D9b-2) — run the profile-driven structure/integrity/surface audit
 * and report a structured summary. The engine (`@czap/audit`) is INJECTED via
 * `context.runAudit`, never imported here, so `@czap/command` (and the MCP
 * server that re-uses it) stays free of the TypeScript-compiler/fast-glob audit
 * engine. Not MCP-exposed: it needs the CLI-only `runAudit` capability.
 *
 * @module
 */
import { wallClock, type CapsuleCommandResult, type CommandJsonSchema } from '@czap/core';
import {
  capabilityUnavailable,
  type AuditEngineFinding,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * The descriptor `outputSchema` for `audit` — hand-written JSON-Schema,
 * byte-parity-pinned against the parity fixture. The modelled `findings` element
 * faithfully mirrors {@link AuditEngineFinding} EXCEPT its `metadata?:
 * Record<string, unknown>` — an open record (index signature) the structural
 * dialect cannot represent (no `additionalProperties`). {@link AuditPayload}
 * keeps the canonical {@link AuditEngineFinding} on `findings`, so `metadata`
 * survives in the type and is never narrowed away.
 */
export const AuditPayloadSchema = {
  type: 'object',
  properties: {
    errorCount: { type: 'number' },
    warningCount: { type: 'number' },
    infoCount: { type: 'number' },
    findingCount: { type: 'number' },
    suppressedCount: { type: 'number' },
    passFindingCounts: {
      type: 'object',
      properties: { structure: { type: 'number' }, integrity: { type: 'number' }, surface: { type: 'number' } },
      required: ['structure', 'integrity', 'surface'],
    },
    repoRoot: { type: 'string' },
    profileSource: { enum: ['default', 'file', 'consumer'] },
    /** Present only when `--findings` was requested — receipt shape is stable by default. */
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          section: { type: 'string' },
          rule: { type: 'string' },
          severity: { enum: ['error', 'warning', 'info'] },
          title: { type: 'string' },
          summary: { type: 'string' },
          location: {
            type: 'object',
            properties: { file: { type: 'string' }, line: { type: 'number' }, column: { type: 'number' } },
            required: ['file'],
          },
        },
        required: ['id', 'section', 'rule', 'severity', 'title', 'summary'],
      },
    },
  },
  required: [
    'errorCount',
    'warningCount',
    'infoCount',
    'findingCount',
    'suppressedCount',
    'passFindingCounts',
    'repoRoot',
    'profileSource',
  ],
} as const satisfies CommandJsonSchema;

/**
 * Structured payload returned by `audit`. Mirrors `AuditPayloadSchema` for every
 * field EXCEPT `findings`, which keeps the canonical {@link AuditEngineFinding}
 * type (so `metadata` — an open record the outputSchema's dialect can't express —
 * stays in the type and is never narrowed away). The type is a faithful superset
 * on exactly that one field.
 */
export type AuditPayload = {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly findingCount: number;
  readonly suppressedCount: number;
  readonly passFindingCounts: {
    readonly structure: number;
    readonly integrity: number;
    readonly surface: number;
  };
  readonly repoRoot: string;
  readonly profileSource: 'default' | 'file' | 'consumer';
  readonly findings?: readonly AuditEngineFinding[];
};

/** `audit [--profile <path>] [--consumer] [--findings]` — run the engine, emit a structured summary. */
export const auditCommand: HandledCommand = {
  descriptor: {
    name: 'audit',
    summary: 'Run the profile-driven structure/integrity/surface audit; report a structured summary.',
    requires: ['runAudit'] satisfies readonly CommandCapability[],
    inputSchema: {
      type: 'object',
      properties: {
        profile: { type: 'string' },
        consumer: { type: 'boolean' },
        findings: { type: 'boolean' },
      },
    } as const satisfies CommandJsonSchema,
    outputSchema: AuditPayloadSchema,
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
