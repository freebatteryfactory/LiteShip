/**
 * info — a one-shot situational report: the host environment, the shipped
 * `@liteship/*` roster, the publishable-package + command-catalog summary, and a
 * lightweight doctor-probe verdict. It is the read-only "where am I / what is
 * installed" companion to `doctor` (which triages) and `describe` (the machine
 * catalog dump).
 *
 * Every fact is PROJECTED from an existing single source — the roster from
 * `@liteship/audit`'s {@link LITESHIP_PACKAGE_ROSTER}, the publishable set from the
 * CLI's {@link PACKAGE_METADATA_CATALOG}, the command counts from the canonical
 * {@link COMMAND_CATALOG}, and the env verdict from the same doctor probes
 * `liteship doctor` runs — so `info` never carries a second hand-maintained list.
 *
 * @module
 */

import { wallClock } from '@liteship/core';
import { COMMAND_CATALOG } from '@liteship/command';
import { LITESHIP_PACKAGE_ROSTER } from '@liteship/audit';
import { PACKAGE_METADATA_CATALOG } from '../lib/package-metadata-catalog.js';
import { color, colorEnabled } from '../lib/ansi.js';
import { emit, type WallClockTimestamp } from '../receipts.js';
import { findWorkspaceRoot, loadEngineMinima } from './doctor/manifest.js';
import { probeNode, probePnpm, probeWorkspaceInstalled } from './doctor/probes-workspace.js';
import { aggregate } from './doctor/summary.js';
import type { DoctorCheck, DoctorVerdict } from './doctor/types.js';

/** Host environment facts. */
export interface InfoEnv {
  readonly node: string;
  readonly pnpm: string | null;
  readonly platform: string;
  readonly cwd: string;
  /** Workspace root the roster + probes were anchored to (may differ from cwd). */
  readonly workspaceRoot: string;
}

/** Receipt emitted by `liteship info`. */
export interface InfoReceipt {
  readonly status: 'ok';
  readonly command: 'info';
  readonly timestamp: WallClockTimestamp;
  readonly env: InfoEnv;
  /** The scoped `@liteship/*` fleet from `LITESHIP_PACKAGE_ROSTER`. */
  readonly roster: { readonly count: number; readonly packages: readonly string[] };
  /** Every publishable scope (fleet + the two umbrellas) from `PACKAGE_METADATA_CATALOG`. */
  readonly publishable: { readonly count: number; readonly packages: readonly string[] };
  /** Command-catalog capability summary, projected from `COMMAND_CATALOG`. */
  readonly commands: { readonly total: number; readonly handler: number; readonly cliOrchestration: number };
  /** The doctor-probe verdict + the individual checks it aggregates. */
  readonly doctor: { readonly verdict: DoctorVerdict; readonly checks: readonly DoctorCheck[] };
}

/**
 * Execute `liteship info`. Runs a focused doctor-probe set (Node, pnpm, workspace
 * install) so the report reflects the SAME probes `liteship doctor` uses, then
 * projects the roster/catalog facts. `json` suppresses the pretty stderr summary.
 */
export async function info(opts: { json?: boolean; pretty?: boolean; cwd?: string } = {}): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const workspaceRoot = findWorkspaceRoot(cwd);
  const minima = loadEngineMinima(workspaceRoot);

  const checks: readonly DoctorCheck[] = [
    probeNode(minima),
    await probePnpm(minima),
    probeWorkspaceInstalled(workspaceRoot),
  ];
  const verdict = aggregate(checks);
  const pnpmCheck = checks.find((c) => c.id === 'pnpm.version');
  const pnpmVersion = pnpmCheck?.status === 'ok' ? pnpmCheck.detail : null;

  const publishablePackages = Object.keys(PACKAGE_METADATA_CATALOG);
  const handler = COMMAND_CATALOG.filter((d) => d.executionKind === 'handler').length;
  const cliOrchestration = COMMAND_CATALOG.filter((d) => d.executionKind === 'cli-orchestration').length;

  const receipt: InfoReceipt = {
    status: 'ok',
    command: 'info',
    timestamp: new Date(wallClock.now()).toISOString(),
    env: {
      node: process.versions.node,
      pnpm: pnpmVersion,
      platform: process.platform,
      cwd,
      workspaceRoot,
    },
    roster: { count: LITESHIP_PACKAGE_ROSTER.length, packages: LITESHIP_PACKAGE_ROSTER },
    publishable: { count: publishablePackages.length, packages: publishablePackages },
    commands: { total: COMMAND_CATALOG.length, handler, cliOrchestration },
    doctor: { verdict, checks },
  };
  emit(receipt);

  // `--json` keeps stdout+stderr machine-clean; otherwise print a human digest to
  // stderr (default on in a TTY), never to stdout — the receipt owns stdout.
  const wantPretty = !opts.json && (opts.pretty ?? Boolean(process.stderr.isTTY));
  if (wantPretty) {
    const on = colorEnabled();
    process.stderr.write(
      `${color('cyan', 'liteship info', on)}  Node ${receipt.env.node}, pnpm ${receipt.env.pnpm ?? 'not found'} (${receipt.env.platform})\n` +
        `  roster: ${receipt.roster.count} @liteship/* packages, ${receipt.publishable.count} publishable\n` +
        `  commands: ${receipt.commands.total} (${receipt.commands.handler} handler, ${receipt.commands.cliOrchestration} cli-orchestration)\n` +
        `  doctor: ${receipt.doctor.verdict}\n`,
    );
  }

  return 0;
}
