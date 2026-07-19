/**
 * package-smoke (CUT A5) — the release-grade pack/install/import smoke as a
 * finite, structured command (migrated from `scripts/package-smoke.ts`). It fails
 * when a publishable `@liteship/*` scope would ship broken: a tarball that won't pack,
 * a `workspace:` protocol leaked into a packed manifest, a consumer install that
 * doesn't materialize the package, an import specifier that won't resolve, or a
 * `liteship` binstub that won't run.
 *
 * The engine (per-package `pnpm pack`, `pnpm install` into an isolated consumer
 * fixture, `tar` extraction, `node` import-smoke) is INJECTED via
 * `context.runPackageSmoke`, never imported here, so `@liteship/command` (and the MCP
 * server that re-uses it) stays free of the subprocess/child_process edge. Unlike
 * `plumb`/`check-invariants` (whose scans are pure `node:fs` and are provisioned
 * in the shared host factory), this gate is a terminal-streaming SUBPROCESS
 * orchestrator — minutes of `pnpm pack`/`install`/`tar`/`node` mutating a scratch
 * tree — in the same category as `gauntlet`/`ship`. So like `audit-floor` it is
 * CLI-only and NOT MCP-exposed: only `@liteship/cli` injects `runPackageSmoke`, and
 * over MCP the command degrades to a structured `capabilityUnavailable` failure.
 *
 * @module
 */
import { type CapsuleCommandResult, type CommandJsonSchema } from '@liteship/core';
import {
  capabilityUnavailable,
  failed,
  ok,
  type CommandCapability,
  type CommandContext,
  type HandledCommand,
} from '../registry.js';

/**
 * The descriptor `outputSchema` for `package-smoke` — hand-written JSON-Schema,
 * byte-parity-pinned against the parity fixture. {@link PackageSmokePayload} is
 * its plain-TS mirror.
 */
export const PackageSmokePayloadSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    /** Number of `@liteship/*` (+ unscoped) scopes packed via `pnpm pack`. */
    packagesPacked: { type: 'number' },
    /** Number of module specifiers the import-smoke resolved (0 when it never ran). */
    importsSmoked: { type: 'number' },
    /** The bracketed step label of the first failure, or null on success. */
    failedStep: { type: ['string', 'null'] },
    /** The failure message of the first failure, or null on success. */
    failure: { type: ['string', 'null'] },
  },
  required: ['ok', 'packagesPacked', 'importsSmoked', 'failedStep', 'failure'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by `package-smoke`. */
export type PackageSmokePayload = {
  readonly ok: boolean;
  readonly packagesPacked: number;
  readonly importsSmoked: number;
  readonly failedStep: string | null;
  readonly failure: string | null;
};

/** `package-smoke` — pack/install/import-smoke every publishable scope; emit a structured pass/fail verdict. */
export const packageSmokeCommand: HandledCommand = {
  descriptor: {
    name: 'package-smoke',
    summary:
      'Release gate: pack every publishable @liteship/* scope, install into an isolated consumer, and import-smoke every module specifier (+ liteship binstub).',
    requires: ['runPackageSmoke'] satisfies readonly CommandCapability[],
    inputSchema: { type: 'object', properties: {} } as const satisfies CommandJsonSchema,
    outputSchema: PackageSmokePayloadSchema,
    // NOT mcpExposed: the engine is a CLI-injected subprocess orchestrator
    // (runPackageSmoke spawns pnpm pack/install/tar/node, mutating a scratch tree);
    // terminal-streaming, like gauntlet/ship, so cli-only by design.
    annotations: { readOnly: true, cliOnly: true, group: 'castoff' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runPackageSmoke) return capabilityUnavailable('package-smoke', ['runPackageSmoke']);

    const summary = await context.runPackageSmoke();

    const payload = {
      ok: summary.ok,
      packagesPacked: summary.packagesPacked,
      importsSmoked: summary.importsSmoked,
      failedStep: summary.failedStep,
      failure: summary.failure,
    } satisfies PackageSmokePayload;
    return summary.ok ? ok('package-smoke', payload) : failed('package-smoke', payload, 1);
  },
};
