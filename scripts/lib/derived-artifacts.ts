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

/**
 * Whether `path` falls under one declared artifact path. A declared path is an
 * exact file, a directory root, or a `*` / `**` glob — enough for a generator
 * that writes a whole tree (`tests/generated/**`) to be declared once instead
 * of by roster.
 */
export function artifactPathCovers(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (!pattern.includes('*')) return path.startsWith(`${pattern}/`);
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]!;
    if (char === '*') {
      if (pattern[index + 1] === '*') {
        index += 1;
        if (pattern[index + 1] === '/') {
          index += 1;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
    } else {
      source += /[\\^$+.()|[\]{}?]/u.test(char) ? `\\${char}` : char;
    }
  }
  return new RegExp(`${source}$`, 'u').test(path);
}

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
  'capsule-generated-corpus':
    'capsule:verify recompiles the whole generated corpus through the capsule gate, well past the fast lane budget',
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
    id: 'assurance-ratchet-identities',
    kind: 'ratchet' as const,
    paths: Object.freeze(['scripts/assurance-ratchet.json']),
    regen: Object.freeze(['exec', 'tsx', 'scripts/gen-roster.ts', '--write']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/release-roster.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'cli-fragments',
    kind: 'projection' as const,
    paths: Object.freeze(['packages/cli/fragments']),
    regen: Object.freeze(['exec', 'tsx', 'scripts/gen-cli-fragments.ts', '--write']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/cli-fragment-projection.test.ts',
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
    id: 'test-constitution-ratchet',
    kind: 'ratchet' as const,
    paths: Object.freeze(['scripts/test-constitution-ratchet.json']),
    regen: Object.freeze(['exec', 'tsx', 'scripts/test-constitution.ts', '--write-baseline']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'test:constitution',
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
    // The DIRECT writer, not `docs:build`. Both emit this file, but routing the
    // regen through the full TypeDoc build made refreshing one JSON record cost
    // a multi-minute documentation build — so in practice nobody ran it, and the
    // artifact drifted. That is the precise failure this registry exists to
    // prevent, so the registered command is the cheap one.
    //
    // The attestation stays honest because the fingerprint was only ever the
    // STALENESS signal (see scripts/docs-check.ts): the separate `check/docs`
    // authority is what proves TypeDoc still builds a complete projection from
    // these inputs, and it runs on its own.
    regen: Object.freeze(['exec', 'tsx', 'scripts/docs-input-fingerprint.ts', '--write']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/typedoc-input-fingerprint.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'roster-projections',
    kind: 'projection' as const,
    // One generator, fourteen committed products. Declared as a family because
    // that is how they are produced: a per-file roster would drift the moment
    // gen-roster.ts learned a fifteenth projection.
    paths: Object.freeze([
      'packages/cli/src/internal/audit-package-catalog.generated.ts',
      'packages/cli/src/internal/audit-package-topology.generated.ts',
      'packages/cli/src/internal/package-metadata-catalog.generated.ts',
      'packages/cli/src/internal/semantic-assurance-campaigns.generated.ts',
      'packages/cli/src/internal/template-renames.generated.ts',
      'packages/cli/src/internal/fleet-event-protocol.generated.ts',
      'packages/command/src/commands/package-smoke-registry.generated.ts',
      'packages/command/src/commands/plumb-registry.generated.ts',
      'packages/liteship/src/package-roster.generated.ts',
      'packages/web/src/wire/liteship-events.generated.ts',
      'packages/_spine/events.generated.d.ts',
      'scripts/lib/package-docs.generated.ts',
      'tests/fixtures/api-surface-packages.generated.ts',
      'tsconfig.test-paths.generated.json',
    ]),
    regen: Object.freeze(['exec', 'tsx', 'scripts/gen-roster.ts', '--write']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/roster-projection-freshness.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'spine-provenance',
    kind: 'projection' as const,
    paths: Object.freeze(['packages/cli/src/internal/spine-provenance.generated.ts']),
    regen: Object.freeze(['run', 'spine:gen']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'spine:check',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'public-surface-context',
    kind: 'projection' as const,
    paths: Object.freeze(['packages/command/src/commands/public-surface-context.generated.ts']),
    regen: Object.freeze(['exec', 'tsx', 'scripts/gen-public-surface-context.ts']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/property/public-surface-context-laws.prop.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'doc-registry-blocks',
    kind: 'projection' as const,
    // Generated REGIONS inside hand-written documents. The whole file is not
    // derived, but the marked blocks are, and a stale block is drift exactly
    // like a stale file — which is how the CLI README's check-profile table
    // shipped three checks behind its own registry.
    paths: Object.freeze([
      'AGENTS.md',
      'ARCHITECTURE.md',
      'AUTHORING-MODEL.md',
      'GLOSSARY.md',
      'PACKAGE-SURFACES.md',
      'README.md',
      'packages/cli/README.md',
      'packages/mcp-server/README.md',
      'packages/web/README.md',
    ]),
    regen: Object.freeze(['run', 'docs:gen']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'tests/unit/devops/doc-registry.test.ts',
    inPreflight: true,
  }),
  Object.freeze({
    id: 'capsule-generated-corpus',
    kind: 'projection' as const,
    paths: Object.freeze(['tests/generated']),
    regen: Object.freeze(['run', 'capsule:compile']),
    regenEnv: Object.freeze({}),
    enforcedBy: 'capsule:verify',
    inPreflight: false,
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

/**
 * THE ANCHOR — how a generated-and-committed file is RECOGNIZED, independent of
 * whether anyone remembered to declare it.
 *
 * Without this, {@link DERIVED_ARTIFACTS} is an allowlist with nothing to be
 * complete against: it can prove every DECLARED artifact is well-formed and
 * enforced while the tree quietly carries dozens that were never declared. That
 * is precisely the half-measure this repository keeps finding in its own guards,
 * and it was true of this very module until the anchor existed — the registry's
 * own doc claimed an anchor that was never implemented, and the tree held 73
 * undeclared generated files.
 *
 * Three EXACT signals, no heuristics that need a growing exemption list:
 *
 *  1. NAME — `*.generated.<ext>`, the repository's own convention.
 *  2. BANNER — the first non-empty line carries a machine marker. Matched
 *     CASE-SENSITIVELY (`@generated`, `GENERATED`, `DO NOT EDIT`): a generator
 *     shouts, whereas a module doc that merely discusses generation writes
 *     "Generated ..." in prose. That one distinction is what keeps producers
 *     (gen-roster.ts, doc-registry.ts) out of a census of products.
 *  3. REGION — a Markdown file carrying a `<!-- BEGIN X -->` projection block.
 *     Restricted to Markdown so the module that CONSTRUCTS those markers is not
 *     mistaken for a file that contains them.
 */
const GENERATED_NAME = /\.generated\.[a-z]+$/u;
const GENERATED_BANNER = /^\s*(?:\/\/|\/\*\*?|#|<!--|;)?\s*(?:@generated\b|GENERATED\b|DO NOT EDIT)/u;
const GENERATED_REGION = /<!--\s*BEGIN [A-Z0-9-]+/u;

/** One tracked file and the bytes needed to classify it. */
export interface TrackedFile {
  readonly path: string;
  readonly text: string;
}

/** Every tracked file that IS a committed derivable artifact, by the three signals above. */
export function generatedCommittedFiles(tracked: readonly TrackedFile[]): readonly string[] {
  const found = tracked.filter(({ path, text }) => {
    if (GENERATED_NAME.test(path)) return true;
    const first = text.split('\n').find((line) => line.trim().length > 0) ?? '';
    if (GENERATED_BANNER.test(first)) return true;
    return path.endsWith('.md') && GENERATED_REGION.test(text);
  });
  return found.map(({ path }) => path).sort();
}

/** Anchor members that no declared artifact claims — the containment breach. */
export function undeclaredGeneratedFiles(tracked: readonly TrackedFile[]): readonly string[] {
  const declared = DERIVED_ARTIFACTS.flatMap((artifact) => artifact.paths);
  return generatedCommittedFiles(tracked).filter(
    (path) => !declared.some((pattern) => artifactPathCovers(pattern, path)),
  );
}

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

/** The distinct test paths or package-script authorities the pre-push lane must run. */
export function preflightEnforcerPaths(): readonly string[] {
  return [...new Set(preflightEnforcedArtifacts().map((artifact) => artifact.enforcedBy))].sort();
}

/** Fast-lane drift authorities that can share the consolidated Vitest process. */
export function preflightVitestEnforcerPaths(): readonly string[] {
  return preflightEnforcerPaths().filter((enforcer) => enforcer.endsWith('.ts'));
}
