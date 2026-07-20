/**
 * doctor — probe profiles. Selects and orchestrates a probe family for a
 * given cwd: the host-focused Cloudflare profile (`--target cloudflare`),
 * the generic consumer profile (cwd outside the LiteShip workspace), or the
 * maintainer profile (the repo itself).
 *
 * The receipt-order arrays here are load-bearing: they fix the order checks
 * appear in the JSON receipt and the pretty summary regardless of the order
 * the concurrent spawns resolve in. Do not reorder.
 *
 * @module
 */

import { isLiteShipWorkspace } from '../../lib/workspace.js';
import { loadEngineMinima } from './manifest.js';
import {
  probeCloudflareAdapter,
  probeCloudflareAstro,
  probeCloudflareConfig,
  probeCloudflareCsp,
  probeCloudflareOutput,
  probeCloudflareWrangler,
  probeLiteshipPnpm,
} from './probes-cloudflare.js';
import {
  probeBuilt,
  probeConsumerInstalled,
  probeFfmpegRenderCheck,
  probeGitConfig,
  probeGitHooks,
  probeNode,
  probePlaywright,
  probePnpm,
  probeWasmToolchain,
  probeWorkspaceInstalled,
  type SpawnArgvCapture,
} from './probes-workspace.js';
import { probeAstroDevStatus } from './probes-astro.js';
import { probeWorkersModuleScopeDate } from './probes-workers-date.js';
import type { DoctorCheck, DoctorTarget } from './types.js';

interface RunProbesOptions {
  readonly target?: DoctorTarget;
  /**
   * The subprocess-capture capability the maintainer profile's spawn-bearing
   * probes (pnpm / git config / cargo) shell out through. Injected by
   * {@link doctor} so tests can force the timeout/reject paths; `undefined`
   * falls back to each probe's real {@link spawnArgvCapture} default.
   */
  readonly spawn?: SpawnArgvCapture;
}

/**
 * Astro dev-server profile (`--target astro`) — environment minima plus the
 * Astro 7 `/_astro/status` liveness probe, for verifying a background dev server
 * an agent (or CI) started.
 */
export async function runAstroProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const minima = loadEngineMinima(cwd);
  const [pnpm, devStatus] = await Promise.all([probePnpm(minima), probeAstroDevStatus()]);
  return [probeNode(minima), pnpm, devStatus];
}

export async function runCloudflareProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const minima = loadEngineMinima(cwd);
  const [pnpm, wrangler] = await Promise.all([probePnpm(minima), probeCloudflareWrangler(cwd)]);
  return [
    probeNode(minima),
    pnpm,
    probeConsumerInstalled(cwd),
    probeCloudflareAstro(cwd),
    probeCloudflareAdapter(cwd),
    wrangler,
    probeCloudflareConfig(cwd),
    probeCloudflareOutput(cwd),
    probeCloudflareCsp(),
    probeWorkersModuleScopeDate(cwd),
  ];
}

/** Consumer-app profile — integration smells in the host's own source (#117). */
export async function runConsumerAppProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const { scanConsumerAppSource } = await import('../../lib/consumer-app-audit.js');
  // Let tagged / native fs errors propagate to doctor()'s emitError envelope —
  // do not catch-and-rethrow as bare Error (gauntlet/no-bare-throw).
  const findings = scanConsumerAppSource(cwd);
  if (findings.length === 0) {
    return [
      {
        id: 'consumer-app.smells',
        label: 'LiteShip integration smells',
        status: 'ok',
        detail: 'no known integration foot-guns in consumer source',
      },
    ];
  }
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  return [
    {
      id: 'consumer-app.smells',
      label: 'LiteShip integration smells',
      status: errors > 0 ? 'fail' : warnings > 0 ? 'warn' : 'ok',
      detail: `${findings.length} finding(s): ${errors} error, ${warnings} warning`,
      hint: findings[0]
        ? `${findings[0].file}${findings[0].line ? `:${findings[0].line}` : ''} — ${findings[0].title}`
        : undefined,
    },
  ];
}

/**
 * Generic consumer probe profile — auto-selected when `cwd` is not the
 * LiteShip workspace (root package.json name !== 'liteship-monorepo'). A consumer who
 * installed @liteship/cli in their own app gets the environment checks that
 * apply to them (node, pnpm, install state, ffmpeg) instead of the
 * maintainer probes (packages/<pkg>/dist, scripts/link-pre-commit.ts,
 * crates/ WASM toolchain), which are all wrong outside this repo.
 * `--target` stays the explicit override for host-focused profiles.
 */
export async function runConsumerProbes(cwd: string): Promise<readonly DoctorCheck[]> {
  const minima = loadEngineMinima(cwd);
  const pnpm = await probePnpm(minima);
  // liteship.pnpm is a consumer-context probe by definition (it reads the
  // host package.json for a liteship dependency) — it lives on this profile,
  // not the maintainer one, and skips itself (null) when inapplicable.
  const liteshipPnpm = probeLiteshipPnpm(cwd);
  return [
    probeNode(minima),
    pnpm,
    probeConsumerInstalled(cwd),
    ...(liteshipPnpm ? [liteshipPnpm] : []),
    probeFfmpegRenderCheck(),
  ];
}

export async function runAllProbes(cwd: string, opts: RunProbesOptions = {}): Promise<readonly DoctorCheck[]> {
  if (opts.target === 'cloudflare') return runCloudflareProbes(cwd);
  if (opts.target === 'astro') return runAstroProbes(cwd);
  if (opts.target === 'consumer-app') return runConsumerAppProbes(cwd);
  if (!isLiteShipWorkspace(cwd)) return runConsumerProbes(cwd);
  const minima = loadEngineMinima(cwd);
  // The three external (spawn-bearing) probes are independent — run them
  // concurrently so the wall time is the slowest single probe, not the serial
  // sum of cargo + pnpm + git (CUT test-flake). Sync probes stay sync. Receipt
  // order below is preserved regardless of completion order.
  const [wasm, pnpm, gitConfig] = await Promise.all([
    probeWasmToolchain(cwd, opts.spawn),
    probePnpm(minima, opts.spawn),
    probeGitConfig(cwd, opts.spawn),
  ]);
  return [
    probeNode(minima),
    pnpm,
    probeWorkspaceInstalled(cwd),
    probeBuilt(cwd, 'core', '@liteship/core build'),
    probeBuilt(cwd, 'cli', '@liteship/cli build'),
    probeGitHooks(cwd),
    gitConfig,
    probePlaywright(cwd),
    probeFfmpegRenderCheck(),
    ...(wasm ? [wasm] : []),
  ];
}
