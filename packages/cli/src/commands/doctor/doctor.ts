/**
 * doctor — preflight rig-check entrypoint. Casts environment signals (Node,
 * pnpm, workspace state, build artifacts, git hooks, Playwright browsers)
 * into three named bearings — `ok` / `warn` / `fail` — and resolves to one
 * verdict — `ready` / `caution` / `blocked`. Emits a JSON receipt to
 * stdout; pretty TTY summary to stderr when attached to a terminal.
 *
 * `doctor({ fix: true })` attempts the cheap, local fixes (link git
 * hooks; rebuild stale dist) and re-probes afterwards. The receipt
 * records which fixes ran via the `fixed` array.
 *
 * @module
 */

import { wallClock } from '@liteship/core';
import { color, colorEnabled } from '../../lib/ansi.js';
import { emit, emitError } from '../../receipts.js';
import { findWorkspaceRoot } from './manifest.js';
import { applyFixes } from './fix.js';
import { runAllProbes } from './profiles.js';
import { aggregate, prettySummary } from './summary.js';
import type { DoctorFix, DoctorReceipt, DoctorTarget } from './types.js';

/**
 * Run all probes, emit a JSON receipt, optionally print a TTY summary.
 *
 * @param opts.pretty - when true, also write a human-readable summary to
 *   stderr. When omitted, pretty output is enabled whenever stderr is a
 *   TTY.
 * @param opts.fix - when true, attempt cheap local remediation (rebuild
 *   stale dist, link missing git hook) and re-probe after.
 * @param opts.ci - when true, treat any `warn` as exit-failing too. The
 *   verdict in the receipt stays honest (`caution`); only the exit code
 *   escalates. Use in CI workflows that should refuse to merge on warnings.
 * @returns process exit code: 0 when ready (and, without --ci, also caution).
 */
export async function doctor(
  opts: {
    pretty?: boolean;
    fix?: boolean;
    ci?: boolean;
    preflight?: boolean;
    target?: DoctorTarget;
    deployed?: string;
    cwd?: string;
  } = {},
): Promise<number> {
  // Explicit cwd from tests/MCP is used verbatim (predictable fixtures).
  // Default behavior anchors probes to the workspace root so `liteship doctor`
  // works correctly from any monorepo subdir, not just the repo root.
  const cwd = opts.cwd ?? findWorkspaceRoot(process.cwd());

  const withDeployed = async (base: Awaited<ReturnType<typeof runAllProbes>>) => {
    if (!opts.deployed) return base;
    const { probeDeployedSite } = await import('./probes-deployed.js');
    return [...base, ...(await probeDeployedSite(opts.deployed))];
  };

  let checks;
  try {
    checks = await withDeployed(await runAllProbes(cwd, { target: opts.target }));
  } catch (error) {
    emitError('doctor', error instanceof Error ? error.message : String(error));
    return 1;
  }

  let fixes: readonly DoctorFix[] | undefined;
  if (opts.fix) {
    fixes = await applyFixes(checks, cwd);
    if (fixes.length > 0) {
      try {
        // Re-append deployed probes after --fix re-run — otherwise
        // `doctor --fix --deployed` can pass CI without header checks.
        checks = await withDeployed(await runAllProbes(cwd, { target: opts.target }));
      } catch (error) {
        emitError('doctor', error instanceof Error ? error.message : String(error));
        return 1;
      }
    }
  }

  const scoped = opts.preflight ? checks.filter((c) => !c.id.endsWith('.built')) : checks;
  const verdict = aggregate(scoped);
  const exitCode = verdict === 'blocked' || (opts.ci && verdict === 'caution') ? 1 : 0;
  const status: 'ok' | 'failed' = exitCode === 0 ? 'ok' : 'failed';

  const receipt: DoctorReceipt = {
    status,
    command: 'doctor',
    timestamp: new Date(wallClock.now()).toISOString(),
    verdict,
    checks,
    ...(fixes && fixes.length > 0 ? { fixed: fixes } : {}),
    ...(opts.ci ? { strict: true as const } : {}),
    ...(opts.preflight ? { preflight: true as const } : {}),
    ...(opts.target ? { target: opts.target } : {}),
    ...(opts.deployed ? { deployed: opts.deployed } : {}),
  };
  emit(receipt);

  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty) {
    process.stderr.write(prettySummary(checks, verdict, fixes));
    if (verdict === 'caution') {
      process.stderr.write(
        color(
          'dim',
          '  zsh paste trap: one command per line — no inline # comments with (parentheses).\n',
          colorEnabled(),
        ),
      );
    }
  }

  return exitCode;
}
