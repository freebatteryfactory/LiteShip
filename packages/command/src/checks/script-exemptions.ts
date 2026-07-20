/**
 * The script-exemption ledger (data) — every root `package.json` script that is
 * NOT a {@link CheckDefinition}, with the one-line reason it is exempt. A script
 * is exempt because it is a WORKFLOW (produces artifacts, runs a server, mutates
 * files, orchestrates a release), a COMPONENT of an aggregate check (its assertion
 * is already registered under the aggregate), an ALIAS of a registered check, or a
 * lifecycle/plumbing HELPER.
 *
 * The partition law: every root script is EITHER in `CHECK_REGISTRY` OR here, and
 * never both. {@link SCRIPT_EXEMPTIONS} keys are the exact root-script names. The
 * meta-gate (next phase) asserts the union covers `Object.keys(package.json.scripts)`
 * exactly, with no overlap.
 *
 * @module
 */

/** One exempt root script: its `package.json` script name → the one-line reason it is not a registered check. */
export interface ScriptExemption {
  /** The exact `package.json` script name (the key under `scripts`). */
  readonly script: string;
  /** The one-line reason this script is a workflow/component/alias/helper, not a distinct check. */
  readonly reason: string;
}

/**
 * The exempt root scripts. Grouped by kind (build/gen, component-of-aggregate,
 * alias, plumbing-helper, workflow, lifecycle) via comment bands; the array is a
 * flat list the meta-gate folds against the script inventory.
 */
export const SCRIPT_EXEMPTIONS: readonly ScriptExemption[] = [
  // ── Build / gen / compile workflows (produce artifacts) ────────────────────
  { script: 'build', reason: 'Build workflow: compiles every package to dist via tsc --build.' },
  { script: 'build:wasm', reason: 'Build workflow: compiles the WASM compute artifacts.' },
  {
    script: 'capsule:compile',
    reason: 'Compile workflow: produces capsule artifacts; check/capsule-verify is the assertion.',
  },
  { script: 'docs:build', reason: 'Docs workflow: builds the API docs via typedoc.' },
  { script: 'docs:build:sharded', reason: 'Docs workflow: sharded API-docs build.' },
  { script: 'docs:bundle', reason: 'Docs workflow: bundles the built docs.' },
  { script: 'docs:gen', reason: 'Gen workflow: regenerates derived docs.' },

  // ── Components of an aggregate check (assertion registered under the aggregate) ──
  { script: 'typecheck:scripts', reason: 'Component of the typecheck aggregate (check/typecheck runs it).' },
  { script: 'typecheck:tests', reason: 'Component of the typecheck aggregate (check/typecheck runs it).' },
  {
    script: 'typecheck:spine',
    reason: 'Targeted _spine typecheck helper; check/typecheck + check/spine-relation-gate cover the spine.',
  },
  { script: 'test:smoke', reason: 'Component test-family selector; covered by check/test (aggregate).' },
  { script: 'test:property', reason: 'Component test-family selector; covered by check/test (aggregate).' },
  { script: 'test:component', reason: 'Component test-family selector; covered by check/test (aggregate).' },
  { script: 'test:integration', reason: 'Component test-family selector; covered by check/test (aggregate).' },
  {
    script: 'test:regression',
    reason: 'Broad regression selector; check/test-redteam is the registered specific regression.',
  },
  { script: 'audit:structure', reason: 'Component of the audit aggregate (check/audit runs the structure pass).' },
  { script: 'audit:integrity', reason: 'Component of the audit aggregate (check/audit runs the integrity pass).' },
  { script: 'audit:surface', reason: 'Component of the audit aggregate (check/audit runs the surface pass).' },
  { script: 'audit:report', reason: 'The audit aggregate body; registered as check/audit via its `audit` alias.' },

  // ── Coverage plumbing helpers (check/coverage is the registered floor) ─────
  { script: 'coverage:node', reason: 'Coverage plumbing: raw node coverage run; check/coverage is the floor.' },
  { script: 'coverage:node:tracked', reason: 'Coverage plumbing: subprocess-tracked node coverage run.' },
  { script: 'coverage:browser', reason: 'Coverage plumbing: browser coverage run.' },
  {
    script: 'coverage:merge',
    reason: 'Coverage plumbing: the node+browser merge pipeline; check/coverage is its `coverage` alias.',
  },
  { script: 'coverage:merge-shards', reason: 'Coverage plumbing: CI shard coverage merge.' },
  { script: 'coverage:unit', reason: 'Coverage plumbing: unit-scoped coverage run.' },
  { script: 'coverage:smoke', reason: 'Coverage plumbing: smoke-scoped coverage run.' },
  { script: 'cover', reason: 'Alias of the `coverage` script; check/coverage is the registered floor.' },

  // ── Aliases / convenience aggregates (members registered separately) ───────
  { script: 'check', reason: 'Convenience aggregate of lint + typecheck; both are registered checks.' },
  {
    script: 'preflight',
    reason: 'Fast-lane aggregate wrapper; its members (format/lint:structural/lint/typecheck/docs) are registered.',
  },
  { script: 'fix', reason: 'Fix workflow: runs format + eslint --fix (mutates files).' },
  { script: 'format', reason: 'Format workflow: prettier --write (mutates files); check/format is the assertion.' },

  // ── Report / diagnostic generators (not a gauntlet/CI pass-fail assertion) ─
  { script: 'report:semantic-convergence', reason: 'Standalone diagnostic report; not a gauntlet/CI assertion.' },

  // ── Test plumbing / dev loops ──────────────────────────────────────────────
  { script: 'test:shard', reason: 'Test plumbing: CI shard splitter for the parallel test lane.' },
  { script: 'test:watch', reason: 'Dev loop: interactive vitest watch mode.' },

  // ── Release / ship / demo workflows ────────────────────────────────────────
  { script: 'release:notes', reason: 'Release workflow: extracts the changelog section for a tag.' },
  { script: 'ship', reason: 'Release workflow: the publish orchestration command.' },
  { script: 'verify:receipts', reason: 'Ship-time tool: verifies emitted receipts; not a gauntlet/CI gate.' },
  { script: 'gauntlet:full', reason: 'The full gauntlet orchestrator itself — the meta-runner over the phases.' },
  { script: 'demo:remotion', reason: 'Demo workflow: renders the Remotion demo.' },

  // ── First-run / verify aggregate + dev servers ────────────────────────────
  { script: 'verify', reason: 'First-run aggregate workflow: doctor + build + fast test.' },
  { script: 'dev', reason: 'Dev workflow: runs the LiteShip dev server.' },

  // ── Introspection helpers ──────────────────────────────────────────────────
  { script: 'scripts', reason: 'Introspection helper: prints the scripts index.' },
  { script: 'glossary', reason: 'Introspection helper: prints the project glossary.' },
  { script: 'clean', reason: 'Maintenance workflow: removes build artifacts.' },

  // ── npm lifecycle hooks ────────────────────────────────────────────────────
  { script: 'prepare', reason: 'npm lifecycle: links the pre-commit hook.' },
  { script: 'postinstall', reason: 'npm lifecycle: post-install setup.' },
] as const;
