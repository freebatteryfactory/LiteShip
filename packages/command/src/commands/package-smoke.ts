/**
 * package-smoke (CUT A5) — the release-grade pack/install/import smoke as a
 * finite, structured command (migrated from `scripts/package-smoke.ts`). It fails
 * when a publishable `@czap/*` scope would ship broken: a tarball that won't pack,
 * a `workspace:` protocol leaked into a packed manifest, a consumer install that
 * doesn't materialize the package, an import specifier that won't resolve, or a
 * `czap` binstub that won't run.
 *
 * The engine (per-package `pnpm pack`, `pnpm install` into an isolated consumer
 * fixture, `tar` extraction, `node` import-smoke) is INJECTED via
 * `context.runPackageSmoke`, never imported here, so `@czap/command` (and the MCP
 * server that re-uses it) stays free of the subprocess/child_process edge. Unlike
 * `plumb`/`check-invariants` (whose scans are pure `node:fs` and are provisioned
 * in the shared host factory), this gate is a terminal-streaming SUBPROCESS
 * orchestrator — minutes of `pnpm pack`/`install`/`tar`/`node` mutating a scratch
 * tree — in the same category as `gauntlet`/`ship`. So like `audit-floor` it is
 * CLI-only and NOT MCP-exposed: only `@czap/cli` injects `runPackageSmoke`, and
 * over MCP the command degrades to a structured `capabilityUnavailable` failure.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import {
  capabilityUnavailable,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/** Structured payload returned by `package-smoke`. */
export interface PackageSmokePayload {
  readonly ok: boolean;
  /** Number of `@czap/*` (+ unscoped) scopes packed via `pnpm pack`. */
  readonly packagesPacked: number;
  /** Number of module specifiers the import-smoke resolved (0 when it never ran). */
  readonly importsSmoked: number;
  /** The bracketed step label of the first failure, or null on success. */
  readonly failedStep: string | null;
  /** The failure message of the first failure, or null on success. */
  readonly failure: string | null;
}

/** `package-smoke` — pack/install/import-smoke every publishable scope; emit a structured pass/fail verdict. */
export const packageSmokeCommand: HandledCommand = {
  descriptor: {
    name: 'package-smoke',
    summary:
      'Release gate: pack every publishable @czap/* scope, install into an isolated consumer, and import-smoke every module specifier (+ czap binstub).',
    requires: ['runPackageSmoke'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      required: ['ok', 'packagesPacked', 'importsSmoked', 'failedStep', 'failure'],
      properties: {
        ok: { type: 'boolean' },
        packagesPacked: { type: 'number' },
        importsSmoked: { type: 'number' },
        failedStep: { type: ['string', 'null'] },
        failure: { type: ['string', 'null'] },
      },
    },
    // NOT mcpExposed: the engine is a CLI-injected subprocess orchestrator
    // (runPackageSmoke spawns pnpm pack/install/tar/node, mutating a scratch tree);
    // terminal-streaming, like gauntlet/ship, so cli-only by design.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runPackageSmoke) return capabilityUnavailable('package-smoke', ['runPackageSmoke']);

    const summary = await context.runPackageSmoke();

    return {
      status: summary.ok ? 'ok' : 'failed',
      command: 'package-smoke',
      timestamp: new Date().toISOString(),
      exitCode: summary.ok ? 0 : 1,
      payload: {
        ok: summary.ok,
        packagesPacked: summary.packagesPacked,
        importsSmoked: summary.importsSmoked,
        failedStep: summary.failedStep,
        failure: summary.failure,
      } satisfies PackageSmokePayload,
    };
  },
};
