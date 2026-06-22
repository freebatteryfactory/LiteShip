/**
 * Supply-chain facts — the pre-computed, host-built evidence the
 * {@link supplyChainGate} folds into {@link Finding}s (Slice C, the avionics
 * tier).
 *
 * This module defines the {@link SupplyChainFacts} INTERFACE and nothing else.
 * Like {@link RepoIR}, it carries no heavy dependency: `@czap/gauntlet` stays
 * the lean engine, so it never parses a YAML lockfile, walks a workspace, or
 * decodes a CBOR ShipCapsule. A HOST (the CLI's `@czap/cli` supply-chain
 * analyzer) does the heavy lifting — lockfile parse + policy eval, SBOM build,
 * ShipCapsule provenance re-read, CI-workflow scan — and hands the engine these
 * flat, already-decided facts. The gate's only job is to FOLD them into Findings
 * at the right assurance level (ADR-0012: the lean engine folds facts; the host
 * computes them).
 *
 * "Runtime determinism is clown shoes without a hermetic build" — these facts
 * are how the hermeticity of the build is PINNED: a violation here (a git-URL
 * dep, a floating package, a drifted lockfile address, a long-lived publish
 * token) reds the gate. Each fact is a decided verdict + the human-readable WHY,
 * so the gate never re-derives policy — it only reports.
 *
 * @module
 */

/**
 * The four supply-chain fact families the host supplies. Every field is
 * OPTIONAL: a host that computed only some families (e.g. lockfile policy but no
 * ShipCapsule yet) supplies what it has, and the gate folds exactly what is
 * present. An ABSENT family is reported by the gate as an advisory
 * "not-evidenced" finding (honest under-coverage, never a silent green) — see
 * {@link supplyChainGate}.
 */
export interface SupplyChainFacts {
  /** Lockfile-policy verdict over pnpm-lock.yaml + the workspace deps. */
  readonly lockfile?: LockfilePolicyFacts;
  /** SBOM completeness verdict (every package covered + lockfile-matched). */
  readonly sbom?: SbomFacts;
  /** ShipCapsule provenance verdict (recorded addresses vs the live tree). */
  readonly provenance?: ProvenanceFacts;
  /** No-ambient-CI-authority verdict over .github/workflows. */
  readonly ci?: CiAuthorityFacts;
}

/** A single decided supply-chain violation — a verdict + its WHY + where. */
export interface SupplyChainViolation {
  /**
   * Stable sub-rule id, suffixed onto the gate's ruleId namespace (e.g.
   * `git-url-dependency`, `floating-resolution`, `prerelease-range`,
   * `lockfile-address-drift`, `incomplete-sbom`, `ambient-publish-token`).
   */
  readonly code: string;
  /** Human-readable WHY — enough to act on without re-reading the lockfile. */
  readonly detail: string;
  /** The artifact the violation points at (a package key, a workflow path, …). */
  readonly subject: string;
}

/** Lockfile-policy facts — the four hermeticity laws over pnpm-lock.yaml. */
export interface LockfilePolicyFacts {
  /** The lockfile's declared `lockfileVersion` (e.g. `9.0`). */
  readonly lockfileVersion: string;
  /** Total resolved registry units the lockfile pins. */
  readonly packageCount: number;
  /** Every decided policy violation. EMPTY ⇒ the lockfile is policy-clean. */
  readonly violations: readonly SupplyChainViolation[];
}

/** SBOM facts — completeness + lockfile-match of the emitted bill of materials. */
export interface SbomFacts {
  /** Repo-relative path of the committed SBOM artifact the host emitted/read. */
  readonly artifactPath: string;
  /** Content address (AddressedDigest display id) of the SBOM the host built. */
  readonly contentAddress: string;
  /** Components (packages) the SBOM enumerates. */
  readonly componentCount: number;
  /**
   * Packages present in the lockfile but ABSENT from the SBOM (completeness
   * gap), or present in the SBOM but absent from the lockfile (phantom). EMPTY
   * ⇒ the SBOM exactly covers the lockfile.
   */
  readonly violations: readonly SupplyChainViolation[];
}

/** Provenance facts — the ShipCapsule evidence re-read + validated. */
export interface ProvenanceFacts {
  /** The package this capsule attests (`@scope/name`). */
  readonly packageName: string;
  /** The recorded `source_commit` (well-formedness is a violation if not). */
  readonly sourceCommit: string;
  /** Whether the capsule recorded a dirty working tree at ship time. */
  readonly sourceDirty: boolean;
  /**
   * Every decided provenance violation — chiefly `lockfile-address-drift` (the
   * capsule's recorded `lockfile_address` ≠ the live pnpm-lock.yaml's address),
   * plus malformed `source_commit` / absent `build_env`. EMPTY ⇒ the capsule's
   * evidence provably matches the tree it claims to be built from.
   */
  readonly violations: readonly SupplyChainViolation[];
}

/** CI-authority facts — the no-ambient-publish-authority verdict. */
export interface CiAuthorityFacts {
  /** Workflow files scanned (repo-relative). */
  readonly workflowsScanned: readonly string[];
  /**
   * Every long-lived publish-secret reference found (an `NPM_TOKEN`,
   * `NODE_AUTH_TOKEN`, `npm_config__authToken`, …). EMPTY ⇒ the OIDC
   * trusted-publishing invariant holds: publish authority is the short-lived
   * id-token only.
   */
  readonly violations: readonly SupplyChainViolation[];
}
