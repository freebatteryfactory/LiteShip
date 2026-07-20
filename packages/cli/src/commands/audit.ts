/**
 * audit (CLI adapter, CUT D9b-2) — thin projection over `@liteship/command`'s audit
 * handler. The CLI is the ONLY adapter that wires the `runAudit` capability: it
 * imports `@liteship/audit` (the engine), loads the explicit `--profile` if given,
 * runs the three passes, and hands a structured summary back to the handler.
 * `@liteship/command` and `@liteship/mcp-server` never see the engine.
 *
 * @module
 */
import { wallClock } from '@liteship/core';
import { auditCommand, type AuditPayload, type AuditEngineSummary } from '@liteship/command';
import { runAuditPasses } from '@liteship/audit';
import { loadProfile } from '../lib/load-profile.js';
import { emit, emitError, type WallClockTimestamp } from '../receipts.js';

/** Receipt emitted by `liteship audit`. */
export interface AuditReceipt extends AuditPayload {
  readonly status: 'ok' | 'failed';
  readonly command: 'audit';
  readonly timestamp: WallClockTimestamp;
}

/** Exit code when the engine/profile load fails before producing a summary. */
const LOAD_FAILURE_EXIT = 1;

/**
 * Injectable handler seam for {@link audit}. `auditHandler` DEFAULTS (via the
 * null-coalesce at its call site) to the real `@liteship/command` audit handler, so
 * production `liteship audit` is byte-identical; tests pass a scripted handler to
 * pin the CLI adapter's degraded-shape branches (a non-Error throw, a payload-less
 * structured failure, the exit-code defaulting) without running the real engine.
 * Unexported + off the public barrel, so the api-surface snapshot is unchanged.
 */
interface AuditDeps {
  readonly auditHandler?: typeof auditCommand.handler;
}

/** Execute `liteship audit [--profile <path>] [--consumer] [--consumer-app] [--findings]`. */
export async function audit(
  opts: {
    profile?: string;
    consumer?: boolean;
    consumerApp?: boolean;
    findings?: boolean;
    pretty?: boolean;
    cwd?: string;
  } = {},
  deps: AuditDeps = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();

  if (opts.consumerApp) {
    const { scanConsumerAppSource } = await import('../lib/consumer-app-audit.js');
    // A filesystem failure mid-scan (permissions, file deleted between walk and
    // read) must produce the same structured emitError envelope the rest of the
    // CLI guarantees — not an unhandled rejection.
    let findings: ReturnType<typeof scanConsumerAppSource>;
    try {
      findings = scanConsumerAppSource(cwd);
    } catch (error) {
      emitError('audit', error instanceof Error ? error.message : String(error));
      return LOAD_FAILURE_EXIT;
    }
    const receipt = {
      status: findings.some((f) => f.severity === 'error') ? ('failed' as const) : ('ok' as const),
      command: 'audit',
      timestamp: new Date(wallClock.now()).toISOString() as WallClockTimestamp,
      mode: 'consumer-app' as const,
      findingCount: findings.length,
      findings,
    };
    if (opts.findings) {
      process.stderr.write(JSON.stringify(receipt) + '\n');
      for (const finding of findings) {
        process.stdout.write(JSON.stringify(finding) + '\n');
      }
    } else {
      emit(receipt);
    }
    return receipt.status === 'failed' ? 1 : 0;
  }

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
      // structurally assignable to the @liteship/command AuditEngineFinding mirror.
      ...(includeFindings ? { findings: result.findings } : {}),
    };
  };

  let result;
  try {
    result = await (deps.auditHandler ?? auditCommand.handler)(
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
  if (opts.findings) {
    process.stderr.write(JSON.stringify(receipt) + '\n');
    for (const finding of payload.findings ?? []) {
      process.stdout.write(JSON.stringify(finding) + '\n');
    }
  } else {
    emit(receipt);
  }

  // Under `--findings` the receipt JSON already goes to stderr and each finding to
  // stdout as NDJSON, so the pretty per-finding lines would duplicate them in a TTY.
  // Keep stderr clean there unless `--pretty` is explicit.
  const wantPretty = opts.pretty ?? (opts.findings ? false : Boolean(process.stderr.isTTY));
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
