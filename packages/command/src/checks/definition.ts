/**
 * The check-registry vocabulary (data) — the typed shape every entry in the
 * {@link CHECK_REGISTRY} conforms to.
 *
 * A {@link CheckDefinition} is a DECLARATION, never an implementation: it names a
 * root `package.json` script that ASSERTS something and records the metadata a
 * projection needs to schedule, cache, and report that assertion. The `command`
 * field REFERENCES the existing root script (e.g. `pnpm run typecheck`) — the
 * check is NOT reimplemented here, only described. This mirrors the `GauntletPhase`
 * contract (`packages/cli/src/gauntlet-phases.ts`): a `command` is a full shell
 * line spawned by the host, opaque to the pure data layer.
 *
 * Every root `package.json` script is EITHER a {@link CheckDefinition} in
 * {@link CHECK_REGISTRY} (it asserts) OR an entry in `SCRIPT_EXEMPTIONS` (it is a
 * workflow / component / helper). That partition is total and disjoint — the
 * meta-gate (next phase) asserts it.
 *
 * @module
 */

/**
 * The profile a check belongs to — the named sweep a projection runs. A check
 * declares its membership set; {@link planChecks} filters the registry by it.
 * - `quick`     — the fast pre-commit lane (lint / typecheck / format / structural).
 * - `full`      — quick + all tests + the blocking gate family + docs + audit floor.
 * - `release`   — everything, including bench gates, coverage floor, e2e, and package smoke.
 * - `consumer`  — the packed-tarball consumer smoke (package:smoke + packed subpath resolution).
 * - `environment` — the host preflight (doctor) that proves the toolchain is sane.
 */
export type CheckProfile = 'quick' | 'full' | 'release' | 'consumer' | 'environment';

/** The execution context whose facts a check is authoritative over. */
export type CheckContext = 'repository' | 'application';

/** A platform a check supports. A check that declares a subset is SKIPPED (with a reason) elsewhere. */
export type CheckPlatform = 'linux' | 'darwin' | 'win32';

/**
 * The cache discipline for a check's verdict.
 * - `content-addressed` — the verdict is a pure function of the check definition's declared `inputs`;
 *   a warm run may SKIP it when no covered byte changed (reusing the verdict-cache
 *   pattern of `@liteship/gauntlet`'s `verdict-cache.ts`). SOUND only when `inputs`
 *   captures everything that affects the verdict.
 * - `none` — the verdict is NOT a pure function of source (timing, environment, network,
 *   or flake-sensitive): it ALWAYS re-runs, never caches.
 */
export type CheckCache = 'content-addressed' | 'none';

/**
 * The authority a check holds over the aggregate verdict.
 * - `blocking` — a finding (or a non-zero exit) fails the run. The gates that block today.
 * - `advisory` — a finding surfaces but never blocks (reports, the raw bench runner, the audit report).
 */
export type CheckAuthority = 'blocking' | 'advisory';

/**
 * One declared check — a root `package.json` script that asserts something, described
 * (never reimplemented). The `id` is `check/<slug>` (the stable identity a plan and a
 * report key by); `command` is the exact root-script shell line to spawn.
 */
interface CheckDefinitionBase {
  /** Stable identity, `check/<slug>` (the slug is the kebab form of the root script name). */
  readonly id: string;
  /** Human title for the plan / report line. */
  readonly title: string;
  /** The single sentence this check PROVES when it passes (its claim on reality). */
  readonly claim: string;
  /** The package or script path that OWNS the assertion (where the logic lives). */
  readonly owner: string;
  /** The full shell line to spawn — the SAME contract as `GauntletPhase.command`; references the root script. */
  readonly command: string;
  /** Globs of the bytes whose change invalidates a content-addressed verdict (the cache coverage). */
  readonly inputs: readonly string[];
  /** The profiles this check is a member of — a projection runs it iff its profile is listed. */
  readonly profiles: readonly CheckProfile[];
  /** The context(s) in which this check's claim is applicable and authoritative. */
  readonly contexts: readonly CheckContext[];
  /** The platforms this check runs on — a plan on an unlisted platform SKIPS it (with a reason). */
  readonly platforms: readonly CheckPlatform[];
  /** The wall-clock ceiling (ms) after which the host aborts the check. */
  readonly timeoutMs: number;
  /** The cache discipline for this check's verdict (see {@link CheckCache}). */
  readonly cache: CheckCache;
  /** The authority this check holds over the aggregate verdict (see {@link CheckAuthority}). */
  readonly authority: CheckAuthority;
  /** The one-line remediation printed when this check reds — the fix, one copy away. */
  readonly remediation: string;
}

/** A blocking check is unrepresentable without a real falsifying control. */
export interface BlockingCheckDefinition extends CheckDefinitionBase {
  readonly authority: 'blocking';
  /** Path to a test/fixture that executes this authority on bad input and asserts a red/non-zero result. */
  readonly negativeControl: string;
}

/** Advisory checks report evidence but do not need to prove a blocking transition. */
export interface AdvisoryCheckDefinition extends CheckDefinitionBase {
  readonly authority: 'advisory';
  readonly negativeControl?: never;
}

/** One declared check. Blocking rows require a falsifying control at compile time. */
export type CheckDefinition = BlockingCheckDefinition | AdvisoryCheckDefinition;
