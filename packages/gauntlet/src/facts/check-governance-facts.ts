/**
 * Check-governance FactPack — the type-only fact shape the three check-governance
 * META-GATES decide over (`check-registry-complete` / `check-negative-control` /
 * `check-waiver-freshness`). NO dependency on `@liteship/command` (the check registry
 * lives THERE, and `@liteship/command` deps `@liteship/gauntlet`, so the gauntlet must
 * not import it back — the dependency arrow points ONE way). Instead a HOST (the
 * `tests/unit/devops` meta-test, or a future CLI host) reads `CHECK_REGISTRY` /
 * `SCRIPT_EXEMPTIONS` / `package.json` / the filesystem / `LITESHIP_WAIVERS` / the
 * traceability ledger against an injected wall-clock date, folds the DECIDED verdicts
 * into this flat record, and injects it; the gates only decide. Same lean-engine
 * pattern as {@link ActiveSurfaceFacts}: the gauntlet RECEIVES the facts, never
 * computes them (no fs, no clock, no `@liteship/command` import).
 *
 * @module
 */

/** One registered check: its id, the root script its `command` references, and whether that script exists. */
export interface RegisteredCheckFact {
  /** The check identity, `check/<slug>`. */
  readonly id: string;
  /** The root `package.json` script the check's `command` invokes (extracted from the command line). */
  readonly script: string;
  /** Whether `script` is a real key of `package.json`'s `scripts` — false ⇒ the command resolves to nothing. */
  readonly scriptExists: boolean;
}

/**
 * The root-script PARTITION evidence for `check-registry-complete`: the full set of
 * root scripts, the registered checks (with their referenced script + resolution),
 * and the exempted script names. The law is TOTAL + DISJOINT — every root script is
 * registered XOR exempt, and every registered command resolves to a real script.
 */
export interface CheckPartitionFacts {
  /** Every root `package.json` script name. */
  readonly scripts: readonly string[];
  /** The registered checks (one per `CHECK_REGISTRY` entry). */
  readonly registered: readonly RegisteredCheckFact[];
  /** The exempted root-script names (one per `SCRIPT_EXEMPTIONS` entry). */
  readonly exempted: readonly string[];
}

/**
 * One blocking (or advisory) check's negative-control verdict for `check-negative-control`.
 *
 * Every blocking check must declare a `negativeControl` that EXISTS (a real
 * red-fixture / regression-guard / self-proving gate). There is no blocker
 * exemption path: inability to prove the authority can fail is itself a gap.
 */
export interface NegativeControlFact {
  /** The check identity, `check/<slug>`. */
  readonly id: string;
  /** Whether this check holds blocking authority (only blocking checks are judged). */
  readonly blocking: boolean;
  /** The declared negativeControl fixture path, or `null` when the check declares none. */
  readonly negativeControl: string | null;
  /** Whether the declared negativeControl path EXISTS on disk (false when `negativeControl` is null). */
  readonly exists: boolean;
}

/** One waiver's freshness verdict for `check-waiver-freshness`, decided vs the injected wall-clock date. */
export interface WaiverFreshnessFact {
  /** Which store the waiver lives in — the gauntlet `waivers.ts` registry or the traceability ledger. */
  readonly store: 'gauntlet' | 'ledger';
  /** A human identity for the waiver (ruleId@file:line for gauntlet; the invariant id / expiry for the ledger). */
  readonly id: string;
  /** The waiver's ISO `yyyy-mm-dd` expiry. */
  readonly expires: string;
  /** Whether the waiver's expiry is strictly before the injected wall-clock date (the debt came due). */
  readonly expired: boolean;
}

/**
 * The injected FactPack the three check-governance meta-gates consume. Each gate reads
 * exactly one slice: `check-registry-complete` reads {@link CheckGovernanceFacts.partition},
 * `check-negative-control` reads {@link CheckGovernanceFacts.negativeControls},
 * `check-waiver-freshness` reads {@link CheckGovernanceFacts.waivers}. When the pack is
 * ABSENT (the lean production path, where no host injects it) every gate folds an empty
 * verdict — the real enforcement over the repo lives in the `tests/unit/devops` meta-test.
 */
export interface CheckGovernanceFacts {
  /** The root-script partition evidence (for `check-registry-complete`). */
  readonly partition: CheckPartitionFacts;
  /** The per-blocking-check negative-control evidence (for `check-negative-control`). */
  readonly negativeControls: readonly NegativeControlFact[];
  /** The per-waiver freshness evidence across both stores (for `check-waiver-freshness`). */
  readonly waivers: readonly WaiverFreshnessFact[];
}
