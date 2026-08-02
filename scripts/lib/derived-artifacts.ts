/**
 * THE CLASS RULE — committed derivable artifacts.
 *
 * ANCHOR: every file in the tree that is GENERATED from source and COMMITTED
 * anyway. ALLOWLIST: each one must be declared here with three things — the
 * command that regenerates it, the check that reds when it drifts, and
 * whether the pre-push lane enforces that check. A generated file that is
 * committed without all three is how a contributor ships drift while their
 * own gate says green.
 *
 * This registry exists because that is exactly what happened: a commit
 * exported one new interface, regenerated `docs/api` (the one incantation the
 * author remembered), and left `PUBLIC-EXPORTS.md` and the type-export
 * snapshot stale. Local preflight reported 15/15 and `check:gates` reported 0
 * findings; nine CI jobs then failed on that single drift. Six different
 * regen spellings existed, each with its own env var and its own target test,
 * enumerated nowhere.
 *
 * Two kinds of artifact live here, and the difference decides whether
 * committing is justified at all:
 *
 *   - **projection** — a pure function of current source. Regenerate and it is
 *     byte-identical. Committing buys nothing but review noise.
 *   - **ratchet** — a record of a previously REVIEWED state. The diff IS the
 *     review artifact ("the public surface grew by these four bindings"), so
 *     it must stay committed; deleting it deletes the ratchet.
 *
 * @module
 */

/** Whether the committed bytes are a pure projection of source, or a reviewed prior state. */
export type DerivedArtifactKind = 'projection' | 'ratchet';

/** One committed derivable artifact and the three facts that make it safe to commit. */
export interface DerivedArtifact {
  /** Stable id, used by the regen runner and the coverage law. */
  readonly id: string;
  /** Why the committed bytes exist (see the module doc). */
  readonly kind: DerivedArtifactKind;
  /** Repo-relative paths (files or directory roots) the regen rewrites. */
  readonly paths: readonly string[];
  /** Argv passed to `pnpm` to regenerate. Empty means the regen is not scriptable. */
  readonly regen: readonly string[];
  /** Environment the regen needs (the `LITESHIP_UPDATE_*` opt-ins). */
  readonly regenEnv: Readonly<Record<string, string>>;
  /**
   * The repo-relative test path (or root script) that REDS when this artifact
   * drifts. This is the drift authority, not the regen.
   */
  readonly enforcedBy: string;
  /**
   * True when the pre-push lane must run {@link enforcedBy}. False only for
   * artifacts whose enforcement needs a full pack/install and therefore
   * belongs to CI — those are named in {@link CI_ONLY_REASON}.
   */
  readonly inPreflight: boolean;
}

/** Why an artifact's drift check cannot ride the fast pre-push lane. */
export const CI_ONLY_REASON: Readonly<Record<string, string>> = Object.freeze({
  'one-install-cost-baseline': 'enforcement requires packing 25 tarballs and a clean install (package:smoke)',
  'composition-baseline': 'enforcement runs inside the cross-package composition suite, not the fast lane',
});

/**
 * Every committed derivable artifact in the repository.
 *
 * Adding a generated-and-committed file without adding it here fails
 * `tests/unit/devops/derived-artifact-coverage.test.ts`.
 */
export const DERIVED_ARTIFACTS: readonly DerivedArtifact[] = Object.freeze([
  Object.freeze({
    id: 'public-exports-roster',
    kind: 'ratchet' as const,
    paths: Object.freeze(['PUBLIC-EXPORTS.md']),
    regen: Object.freeze(['exec', 'tsx', 'scripts/gen-roster.ts', '--write']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/release-roster.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'api-surface-snapshot',
    kind: 'ratchet' as const,
    paths: Object.freeze(['tests/fixtures/api-surface-snapshot.json']),
    regen: Object.freeze(['exec', 'vitest', 'run', 'tests/unit/meta/api-surface.test.ts']),
    regenEnv: Object.freeze({ LITESHIP_UPDATE_API_SNAPSHOT: '1' }),
    enforcedBy: 'tests/unit/meta/api-surface.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'type-export-surface',
    kind: 'ratchet' as const,
    paths: Object.freeze(['tests/fixtures/type-export-surface.json']),
    regen: Object.freeze(['exec', 'vitest', 'run', 'tests/unit/audit/type-export-surface.test.ts']),
    regenEnv: Object.freeze({ LITESHIP_UPDATE_TYPE_EXPORT_SNAPSHOT: '1' }),
    enforcedBy: 'tests/unit/audit/type-export-surface.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'standards-snapshot',
    kind: 'ratchet' as const,
    paths: Object.freeze(['traceability/standards-snapshot.json']),
    regen: Object.freeze(['exec', 'vitest', 'run', 'tests/unit/meta/standards-integrity.test.ts']),
    regenEnv: Object.freeze({ LITESHIP_UPDATE_STANDARDS_SNAPSHOT: '1' }),
    enforcedBy: 'tests/unit/meta/standards-integrity.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'typedoc-input-fingerprint',
    kind: 'ratchet' as const,
    // The cheap staleness signal for the API docs. It lives OUTSIDE docs/api
    // because that tree is a build artifact (W8.5) — 3,556 files that were a
    // pure function of source and bought only review noise. The fingerprint
    // is what a committed copy was actually providing, at one file instead of
    // three and a half thousand.
    paths: Object.freeze(['traceability/typedoc-input-fingerprint.json']),
    regen: Object.freeze(['run', 'docs:build']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/typedoc-input-fingerprint.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'composition-baseline',
    kind: 'ratchet' as const,
    paths: Object.freeze(['benchmarks/composition-uncovered-baseline.json']),
    regen: Object.freeze(['exec', 'vitest', 'run', 'tests/unit/cli/lib/composition-baseline.test.ts']),
    regenEnv: Object.freeze({ LITESHIP_UPDATE_COMPOSITION_BASELINE: '1' }),
    enforcedBy: 'tests/unit/cli/lib/composition-baseline.test.ts',
    inPreflight: false,
  }),
  Object.freeze({
    id: 'one-install-cost-baseline',
    kind: 'ratchet' as const,
    paths: Object.freeze(['benchmarks/one-install-cost-baseline.json']),
    regen: Object.freeze(['run', 'package:smoke']),
    regenEnv: Object.freeze({ LITESHIP_UPDATE_ONE_INSTALL_COST_BASELINE: '1' }),
    enforcedBy: 'package:smoke',
    inPreflight: false,
  }),
]);

/** Artifacts the fast pre-push lane must enforce. */
export function preflightEnforcedArtifacts(): readonly DerivedArtifact[] {
  return DERIVED_ARTIFACTS.filter((artifact) => artifact.inPreflight);
}

/** An unknown artifact id passed to the regen runner. */
export interface UnknownArtifactSelection {
  readonly unknown: readonly string[];
}

/** Narrow a selection to the failure arm (`readonly[]` defeats `Array.isArray` narrowing). */
export function isUnknownSelection(
  selection: readonly DerivedArtifact[] | UnknownArtifactSelection,
): selection is UnknownArtifactSelection {
  return !Array.isArray(selection);
}

/**
 * The regen runner's selection, as a PURE function of its arguments — so the
 * coverage law can prove the runner consumes this registry by exercising the
 * selection, never by grepping the runner's source bytes (the test
 * constitution bans source-byte oracles, and it caught the first draft of
 * that very law doing it).
 */
export function selectDerivedArtifacts(argv: readonly string[]): readonly DerivedArtifact[] | UnknownArtifactSelection {
  const named = argv.filter((arg) => !arg.startsWith('--'));
  if (named.length > 0) {
    const unknown = named.filter((id) => !DERIVED_ARTIFACTS.some((artifact) => artifact.id === id));
    if (unknown.length > 0) return { unknown };
    return DERIVED_ARTIFACTS.filter((artifact) => named.includes(artifact.id));
  }
  return argv.includes('--all') ? DERIVED_ARTIFACTS : preflightEnforcedArtifacts();
}

/** The distinct enforcer test paths the pre-push lane must run. */
export function preflightEnforcerPaths(): readonly string[] {
  return [...new Set(preflightEnforcedArtifacts().map((artifact) => artifact.enforcedBy))].sort();
}
