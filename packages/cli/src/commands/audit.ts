/**
 * audit (CLI adapter, CUT D9b-2) — thin projection over `@czap/command`'s audit
 * handler. The CLI is the ONLY adapter that wires the `runAudit` capability: it
 * imports `@czap/audit` (the engine), loads the explicit `--profile` if given,
 * runs the three passes, and hands a structured summary back to the handler.
 * `@czap/command` and `@czap/mcp-server` never see the engine.
 *
 * @module
 */
import { auditCommand, type AuditPayload, type AuditEngineSummary } from '@czap/command';
import { runAuditPasses } from '@czap/audit';
import { loadProfile } from '../lib/load-profile.js';
import { emit, emitError, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `czap audit`. */
export interface AuditReceipt extends AuditPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'audit';
  readonly timestamp: WallClockTimestamp;
}

/** Exit code when the engine/profile load fails before producing a summary. */
const LOAD_FAILURE_EXIT = 1;

/** Execute `czap audit [--profile <path>] [--consumer] [--findings]`. */
export async function audit(
  opts: { profile?: string; consumer?: boolean; findings?: boolean; pretty?: boolean; cwd?: string } = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  // The CLI-only runAudit capability: load the profile + run the engine.
  const runAudit = async ({
    profilePath,
    consumer,
    includeFindings,
  }: {
    profilePath?: string;
    consumer?: boolean;
    includeFindings?: boolean;
  }): Promise<AuditEngineSummary> => {
    const { profile, source } = await loadProfile(profilePath, cwd, consumer ? { consumer } : {});
    const result = runAuditPasses(profile);
    return {
      errorCount: result.counts.error,
      warningCount: result.counts.warning,
      infoCount: result.counts.info,
      findingCount: result.findings.length,
      suppressedCount: result.suppressed.length,
      passFindingCounts: {
        structure: result.structure.findings.length,
        integrity: result.integrity.findings.length,
        surface: result.surface.findings.length,
      },
      repoRoot: profile.repoRoot,
      profileSource: source,
      // Engine findings are already pass-merged and per-pass sorted, and are
      // structurally assignable to the @czap/command AuditEngineFinding mirror.
      ...(includeFindings ? { findings: result.findings } : {}),
    };
  };

  let result;
  try {
    result = await auditCommand.handler(
      {
        name: 'audit',
        args: {
          ...(opts.profile ? { profile: opts.profile } : {}),
          ...(opts.consumer ? { consumer: true } : {}),
          ...(opts.findings ? { findings: true } : {}),
        },
      },
      { cwd, runAudit },
    );
  } catch (error) {
    emitError('audit', error instanceof Error ? error.message : String(error));
    return LOAD_FAILURE_EXIT;
  }

  if (result.status === 'failed' && !('errorCount' in (result.payload as Record<string, unknown>))) {
    // A structured failure with no audit payload (e.g. capability unavailable).
    emitError('audit', String((result.payload as { error?: unknown }).error ?? 'audit failed'));
    return typeof result.exitCode === 'number' ? result.exitCode : 1;
  }

  const payload = result.payload as AuditPayload;
  const receipt: AuditReceipt = {
    status: result.status === 'ok' ? 'ok' : 'failed',
    command: 'audit',
    timestamp: result.timestamp,
    ...payload,
  };
  emit(receipt);

  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty) {
    process.stderr.write(
      `audit: ${payload.errorCount} error(s), ${payload.warningCount} warning(s), ${payload.infoCount} info — ` +
        `${payload.findingCount} finding(s) over ${payload.repoRoot} (${payload.profileSource} profile)\n`,
    );
    for (const finding of payload.findings ?? []) {
      const where = finding.location
        ? `${finding.location.file}${finding.location.line ? `:${finding.location.line}` : ''}${finding.location.column ? `:${finding.location.column}` : ''} `
        : '';
      process.stderr.write(`  [${finding.severity}] ${where}${finding.rule} — ${finding.title}\n`);
    }
  }

  return typeof result.exitCode === 'number' ? result.exitCode : 0;
}
