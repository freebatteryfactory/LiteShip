/**
 * audit (CUT D9b-2) — run the profile-driven structure/integrity/surface audit
 * and report a structured summary. The engine (`@czap/audit`) is INJECTED via
 * `context.runAudit`, never imported here, so `@czap/command` (and the MCP
 * server that re-uses it) stays free of the TypeScript-compiler/fast-glob audit
 * engine. Not MCP-exposed: it needs the CLI-only `runAudit` capability.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

/** Structured payload returned by `audit`. */
export interface AuditPayload {
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
}

function failed(message: string, exitCode: number): CapsuleCommandResult {
  return {
    status: 'failed',
    command: 'audit',
    timestamp: new Date().toISOString(),
    exitCode,
    payload: { error: message },
  };
}

/** `audit [--profile <path>] [--consumer]` — run the engine, emit a structured summary. */
export const auditCommand: HandledCommand = {
  descriptor: {
    name: 'audit',
    summary: 'Run the profile-driven structure/integrity/surface audit; report a structured summary.',
    inputSchema: {
      type: 'object',
      properties: { profile: { type: 'string' }, consumer: { type: 'boolean' } },
    },
    outputSchema: {
      type: 'object',
      required: [
        'errorCount',
        'warningCount',
        'infoCount',
        'findingCount',
        'passFindingCounts',
        'repoRoot',
        'profileSource',
      ],
      properties: {
        errorCount: { type: 'number' },
        warningCount: { type: 'number' },
        infoCount: { type: 'number' },
        findingCount: { type: 'number' },
        suppressedCount: { type: 'number' },
        passFindingCounts: { type: 'object' },
        repoRoot: { type: 'string' },
        profileSource: { type: 'string', enum: ['default', 'file', 'consumer'] },
      },
    },
    // NOT mcpExposed: the engine is CLI-injected (runAudit); cli-only by design.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
  },
  handler: async (invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    if (!context.runAudit) return failed('audit engine unavailable (no runAudit capability in this context)', 2);

    const profile = invocation.args.profile;
    const profilePath = typeof profile === 'string' && profile.length > 0 ? profile : undefined;
    const consumer = invocation.args.consumer === true;

    const summary = await context.runAudit({
      ...(profilePath ? { profilePath } : {}),
      ...(consumer ? { consumer } : {}),
    });

    return {
      status: summary.errorCount > 0 ? 'failed' : 'ok',
      command: 'audit',
      timestamp: new Date().toISOString(),
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
      },
    };
  },
};
