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
    /**
     * The three release-hermeticity sub-results — present ONLY under `--hermetic`
     * (absent on a plain package-smoke run, so the default receipt is unchanged).
     * `hermetic-build` (offline reinstall) and `packed-consumer-closure` are
     * blocking (either failing forces `ok:false`); `double-build-repro` is advisory
     * (a per-file-hash "semantic" verdict + a byte-identical "artifact" verdict —
     * artifact drift is reported, never fails the gate).
     */
    hermetic: {
      type: ['object', 'null'],
      properties: {
        hermeticBuild: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            skipped: { type: 'boolean' },
            reason: { type: ['string', 'null'] },
          },
          required: ['ok', 'skipped', 'reason'],
        },
        packedConsumerClosure: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            subpathCount: { type: 'number' },
            failure: { type: ['string', 'null'] },
          },
          required: ['ok', 'subpathCount', 'failure'],
        },
        doubleBuildRepro: {
          type: 'object',
          properties: {
            semanticRepro: { type: 'boolean' },
            artifactRepro: { type: 'boolean' },
            reportPath: { type: 'string' },
          },
          required: ['semanticRepro', 'artifactRepro', 'reportPath'],
        },
      },
      required: ['hermeticBuild', 'packedConsumerClosure', 'doubleBuildRepro'],
    },
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
  /**
   * The three `--hermetic` sub-results — absent unless the run was `--hermetic`.
   * `hermeticBuild` proves the packed consumer reinstalls with the CHILD install's
   * network disabled (warm store + `file://` tarballs); `packedConsumerClosure`
   * import-smokes EVERY public subpath enumerated from the packages' `exports` maps
   * (a superset of the hand-listed import roster); `doubleBuildRepro` packs twice
   * and compares the tarball closures (per-file-hash semantic + byte-identical
   * artifact — advisory). Inlined (not a separate named export) so the command
   * package's public type surface is unchanged.
   */
  readonly hermetic?: {
    readonly hermeticBuild: {
      readonly ok: boolean;
      readonly skipped: boolean;
      readonly reason: string | null;
    };
    readonly packedConsumerClosure: {
      readonly ok: boolean;
      readonly subpathCount: number;
      readonly failure: string | null;
    };
    readonly doubleBuildRepro: {
      readonly semanticRepro: boolean;
      readonly artifactRepro: boolean;
      readonly reportPath: string;
    };
  } | null;
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
    annotations: { readOnly: true, cliOnly: true, group: 'setup' },
  },
  handler: async (_invocation, context: CommandContext): Promise<CapsuleCommandResult> => {
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runPackageSmoke) return capabilityUnavailable('package-smoke', ['runPackageSmoke']);

    const summary = await context.runPackageSmoke();

    // The injected `runPackageSmoke` capability is typed `PackageSmokeSummary`
    // (the base verdict). Under `--hermetic` the CLI engine returns a widened
    // result carrying `hermetic`; read it structurally and only carry it onto the
    // payload when present, so a plain (non-hermetic) run's receipt is unchanged.
    const hermetic = (summary as { readonly hermetic?: PackageSmokePayload['hermetic'] }).hermetic;

    const payload = {
      ok: summary.ok,
      packagesPacked: summary.packagesPacked,
      importsSmoked: summary.importsSmoked,
      failedStep: summary.failedStep,
      failure: summary.failure,
      ...(hermetic ? { hermetic } : {}),
    } satisfies PackageSmokePayload;
    return summary.ok ? ok('package-smoke', payload) : failed('package-smoke', payload, 1);
  },
};
