/**
 * The check registry (data) — ONE entry per root `package.json` script that
 * ASSERTS something, each REFERENCING the existing root-script command (never
 * reimplementing it). This is the single source a profile sweep projects from
 * ({@link planChecks}); it mirrors the gauntlet phase list's role, but keyed by
 * `check/<slug>` identity and annotated for caching, authority, and platform.
 *
 * Every root script is EITHER here OR in `SCRIPT_EXEMPTIONS` (a workflow /
 * component / helper). The partition is total + disjoint — the meta-gate asserts
 * it next phase. Ordering is the DECLARED plan order (cheapest → heaviest, mirroring
 * the preflight fast lane then the gauntlet), so {@link planChecks} can order by
 * registry position without a separate sort key.
 *
 * @module
 */

import type { CheckDefinition, CheckProfile, CheckPlatform } from './definition.js';

/** Package TypeScript source — the covered bytes of every source-reading check. */
const SRC_GLOB = 'packages/*/src/**/*.ts';
/** Every package-owned TypeScript file, including templates, fragments, and declaration surfaces. */
const PACKAGE_TS_GLOB = 'packages/**/*.ts';
/** Test source and fixtures — every byte that can affect a test-runner verdict. */
const TESTS_GLOB = 'tests/**';
/** Repo scripts — the covered bytes of the script-owned gates. */
const SCRIPTS_GLOB = 'scripts/**/*.ts';

/** Fields shared by repository rows before the repository context is projected. */
interface RepositoryCheckRowBase {
  readonly id: string;
  readonly title: string;
  readonly claim: string;
  readonly owner: string;
  readonly command: string;
  readonly inputs: readonly string[];
  readonly profiles: readonly CheckProfile[];
  readonly platforms: readonly CheckPlatform[];
  readonly timeoutMs: number;
  readonly cache: 'content-addressed' | 'none';
  readonly remediation: string;
}

/**
 * Formerly-exempt blockers now share one executable proof harness. The harness
 * drives the real tool/runner/decision authority on deterministic bad input and
 * asserts a non-zero/red result for every id listed here.
 */
const EXECUTED_CONTROL = 'tests/unit/devops/blocking-check-negative-controls.test.ts';
const _EXECUTED_CONTROL_IDS = [
  'check/format',
  'check/lint-structural',
  'check/lint',
  'check/docs',
  'check/test',
  'check/test-redteam',
  'check/runtime-gate',
  'check/flex-verify',
  'check/devx',
  'check/test-vite',
  'check/test-astro',
  'check/test-cloudflare',
  'check/test-cloudflare-dev',
  'check/test-tailwind',
  'check/test-e2e',
  'check/test-e2e-stress',
  'check/test-e2e-stream-stress',
  'check/bench-trend',
  'check/bench-reality',
  'check/bench-alloc',
  'check/coverage',
  'check/package-smoke',
  'check/journey',
  'check/hermetic',
] as const;

type ExecutedControlId = (typeof _EXECUTED_CONTROL_IDS)[number];

/**
 * A repository row is statically unrepresentable as a blocker without either
 * its own negative control or membership in the shared executed-control suite.
 * Keeping this law in the type removes the check registry's former runtime
 * dependency on built `@liteship/error` artifacts, so the CI plan can project
 * the registry before any package build exists.
 */
type RepositoryCheckRow = RepositoryCheckRowBase &
  (
    | {
        readonly authority: 'blocking';
        readonly id: ExecutedControlId;
        readonly negativeControl?: string;
      }
    | {
        readonly authority: 'blocking';
        readonly negativeControl: string;
      }
    | {
        readonly authority: 'advisory';
        readonly negativeControl?: never;
      }
  );

/** Add the explicit repository context and close any former control hole. */
function materializeRepositoryCheck(row: RepositoryCheckRow): CheckDefinition {
  if (row.authority === 'blocking') {
    const negativeControl = row.negativeControl ?? EXECUTED_CONTROL;
    return { ...row, contexts: ['repository'], authority: 'blocking', negativeControl };
  }
  const { negativeControl: _unused, ...advisory } = row;
  return { ...advisory, contexts: ['repository'], authority: 'advisory' };
}

/**
 * The canonical check set, in declared plan order. Each `command` is the exact
 * root `package.json` script line; each `id` is `check/<slug>`. See
 * {@link CheckDefinition} for the field contract.
 */
const REPOSITORY_CHECKS: readonly RepositoryCheckRow[] = [
  // ── The quick fast-lane (the preflight subset) ─────────────────────────────
  {
    id: 'check/format',
    title: 'Prettier formatting',
    claim: 'Every package source file is Prettier-clean.',
    owner: '.prettierrc',
    command: 'pnpm run format:check',
    inputs: [SRC_GLOB, '.prettierrc'],
    profiles: ['quick', 'full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 60_000,
    cache: 'content-addressed',
    authority: 'blocking',
    remediation: "run 'pnpm run format' to auto-fix, then re-run.",
  },
  {
    id: 'check/lint-structural',
    title: 'Structural lint (ast-grep)',
    claim: 'No banned structural pattern (sgconfig.yml rules) appears in the tree.',
    owner: 'sgconfig.yml',
    command: 'pnpm run lint:structural',
    inputs: [
      PACKAGE_TS_GLOB,
      TESTS_GLOB,
      SCRIPTS_GLOB,
      'sgconfig.yml',
      'sgrules/**/*.yml',
      'vitest.config.ts',
      'vitest.browser.config.ts',
      'vitest.shared.ts',
    ],
    profiles: ['quick', 'full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 90_000,
    cache: 'content-addressed',
    authority: 'blocking',
    remediation: "fix the ast-grep finding (or run 'pnpm run lint:structural' for the full report).",
  },
  {
    id: 'check/lint',
    title: 'ESLint (max-warnings 0)',
    claim: 'Package/test/script source passes ESLint with zero warnings.',
    owner: 'eslint.config.js',
    command: 'pnpm run lint',
    inputs: [SRC_GLOB, TESTS_GLOB, SCRIPTS_GLOB, 'eslint.config.js'],
    profiles: ['quick', 'full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'content-addressed',
    authority: 'blocking',
    remediation: "run 'pnpm run fix' (format + eslint --fix), then re-run.",
  },
  {
    id: 'check/typecheck',
    title: 'TypeScript typecheck',
    claim: 'The package, scripts, and tests projects all typecheck (tsc --build + scripts + tests).',
    owner: 'tsconfig.json',
    command: 'pnpm run typecheck',
    inputs: [
      SRC_GLOB,
      TESTS_GLOB,
      SCRIPTS_GLOB,
      'package.json',
      'packages/*/package.json',
      'packages/_spine/**/*.d.ts',
      'tsconfig*.json',
      'packages/*/tsconfig.json',
    ],
    profiles: ['quick', 'full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 240_000,
    cache: 'content-addressed',
    authority: 'blocking',
    negativeControl: 'tests/unit/devops/gate-canaries.test.ts',
    remediation: 'fix the type errors (tsc --build + scripts + tests projects).',
  },
  // ── The full lane (aggregate tests + the blocking gate family) ─────────────
  {
    id: 'check/docs',
    title: 'TSDoc freshness (docs:check)',
    claim: 'The committed API docs match the current public TSDoc surface.',
    owner: 'scripts/docs-check.ts',
    command: 'pnpm run docs:check',
    inputs: [SRC_GLOB, 'typedoc.json', 'docs/api/**'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 240_000,
    cache: 'none',
    authority: 'blocking',
    remediation: "run 'pnpm run docs:build' and commit docs/api/ if you touched a public TSDoc surface.",
  },
  {
    id: 'check/gates',
    title: 'Gauntlet gate fold (check:gates)',
    claim: 'The in-process gauntlet gate fold (self-proving gates) emits no blocking finding.',
    owner: 'packages/cli/src/bin.ts (check)',
    command: 'pnpm run check:gates',
    inputs: [SRC_GLOB, 'packages/gauntlet/src/**/*.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/gauntlet/gates-dogfood.test.ts',
    remediation: 'resolve the blocking gate findings, or file a signed waiver.',
  },
  {
    id: 'check/audit-floor',
    title: 'Audit warning floor',
    claim: 'The audit warning inventory has not grown past its committed floor.',
    owner: 'packages/cli/src/bin.ts (audit-floor)',
    command: 'pnpm run audit:floor',
    inputs: [SRC_GLOB, 'packages/command/src/commands/audit-floor-registry.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 120_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/cli/commands/audit-floor.test.ts',
    remediation: 'clear the new audit warning(s), or update the floor with justification.',
  },
  {
    id: 'check/test',
    title: 'Test suite (unit + component + property + integration)',
    claim: 'The aggregate node test suite is green.',
    owner: 'vitest.config.ts',
    command: 'pnpm test',
    inputs: [SRC_GLOB, TESTS_GLOB, 'vitest.config.ts', 'vitest.shared.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'make the failing assertions pass.',
  },
  {
    id: 'check/test-redteam',
    title: 'Red-team runtime regression',
    claim: 'The red-team runtime adversarial suite finds no exploitable regression.',
    owner: 'tests/regression/red-team-runtime.test.ts',
    command: 'pnpm run test:redteam',
    inputs: [SRC_GLOB, 'tests/regression/red-team-runtime.test.ts', 'vitest.config.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 240_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the runtime safety regression the red-team assertion caught.',
  },
  {
    id: 'check/runtime-gate',
    title: 'Runtime seam gate',
    claim: 'The runtime injection seams stay sound (no un-seamed runtime coupling).',
    owner: 'scripts/runtime-gate.ts',
    command: 'pnpm run runtime:gate',
    inputs: [SRC_GLOB, 'scripts/runtime-gate.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'restore the runtime seam the gate flagged (inject the dependency, do not hard-couple).',
  },
  {
    id: 'check/standards-gate',
    title: 'Standards integrity gate',
    claim: 'No unsigned weakening of the gauntlet standards surface vs the base-ref snapshot.',
    owner: 'scripts/standards-integrity-gate.ts',
    command: 'pnpm run standards:gate',
    inputs: [SRC_GLOB, 'scripts/standards-integrity-gate.ts', 'packages/gauntlet/src/gates/standards-integrity.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/gauntlet/gates-dogfood.test.ts',
    remediation: 'sign the standards change, or restore the weakened rigor.',
  },
  {
    id: 'check/capability-gate',
    title: 'Capability-link gate',
    claim: 'Every sanctioned skip guard derives from its declared capability probe.',
    owner: 'scripts/capability-gate.ts',
    command: 'pnpm run capability:gate',
    inputs: [SRC_GLOB, 'scripts/capability-gate.ts', 'packages/gauntlet/src/gates/capability-gate-link.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 240_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/gauntlet/gates-dogfood.test.ts',
    remediation: 'link the skip guard to its capability probe, or remove the mislabeled skip.',
  },
  {
    id: 'check/spine-relation-gate',
    title: 'Spine-relation gate',
    claim: 'Every admitted @liteship/_spine mirror type still satisfies its frozen assignability relation.',
    owner: 'scripts/spine-relation-gate.ts',
    command: 'pnpm run spine-relation:gate',
    inputs: ['packages/_spine/**/*.ts', SRC_GLOB, 'scripts/spine-relation-gate.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/gauntlet/gates-dogfood.test.ts',
    remediation: 'reconcile the mirror type with its runtime source, or re-admit the new relation.',
  },
  {
    id: 'check/transition-gate',
    title: 'Transition conformance gate',
    claim: 'Every pinned op history bisimulates the current declared reactive model on the native transport.',
    owner: 'scripts/transition-conformance-gate.ts',
    command: 'pnpm run transition:gate',
    inputs: [SRC_GLOB, 'scripts/transition-conformance-gate.ts', 'tests/support/**/*.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 240_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/gauntlet/gates-dogfood.test.ts',
    remediation: 'restore bisimulation with the declared reactive model (fix the transport or the model).',
  },
  {
    id: 'check/plumb-gate',
    title: 'Plumbing gate',
    claim: 'Every declared package export is reachable and correctly plumbed.',
    owner: 'packages/cli/src/bin.ts (plumb)',
    command: 'pnpm run plumb:gate',
    inputs: [SRC_GLOB, 'packages/command/src/commands/plumb-registry.ts', 'packages/*/package.json'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/devops/plumb-gate.test.ts',
    remediation: 'plumb the missing export, or update the plumb registry.',
  },
  {
    id: 'check/feedback-verify',
    title: 'Feedback-loop verification',
    claim: 'The feedback-loop artifacts are consistent with the live surface they summarize.',
    owner: 'scripts/feedback-verify.ts',
    command: 'pnpm run feedback:verify',
    inputs: [SRC_GLOB, 'scripts/feedback-verify.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 120_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/meta/feedback-integrity.test.ts',
    remediation: 'reconcile the feedback artifact with the current surface.',
  },
  {
    id: 'check/flex-verify',
    title: 'Flex policy verification',
    claim: 'The bench flex policy (accepted noise labels + thresholds) is internally consistent.',
    owner: 'scripts/flex-verify.ts',
    command: 'pnpm run flex:verify',
    inputs: ['scripts/flex-verify.ts', 'scripts/bench/flex-policy.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 120_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the flex-policy inconsistency the verifier reported.',
  },
  {
    id: 'check/devx',
    title: 'DevX policy check',
    claim: 'The developer-experience policy invariants (flex thresholds, labels) hold.',
    owner: 'scripts/devx-check.ts',
    command: 'pnpm run devx:check',
    inputs: ['scripts/devx-check.ts', 'scripts/bench/flex-policy.ts', 'scripts/flex-verify.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 60_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'restore the devx policy invariant the check reported.',
  },
  {
    id: 'check/capsule-verify',
    title: 'Capsule verification',
    claim: 'Every compiled capsule verifies against its committed manifest.',
    owner: 'packages/cli/src/bin.ts (capsule-verify)',
    command: 'pnpm run capsule:verify',
    inputs: [SRC_GLOB, 'packages/command/src/commands/manifest.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/integration/capsule-verify.test.ts',
    remediation: 'recompile the capsule (pnpm run capsule:compile) and re-verify.',
  },

  // ── Advisory diagnostics (surface, never block) ────────────────────────────
  {
    id: 'check/audit',
    title: 'Audit report',
    claim: 'The full structure/integrity/surface audit report generates cleanly.',
    owner: 'scripts/audit/report.ts',
    command: 'pnpm run audit',
    inputs: [SRC_GLOB, 'scripts/audit/**/*.ts'],
    profiles: ['full', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 180_000,
    cache: 'none',
    authority: 'advisory',
    remediation: 'review the audit report; escalations are enforced by check/audit-floor.',
  },
  {
    id: 'check/report-runtime-seams',
    title: 'Runtime-seams report',
    claim: 'The runtime-seams report projects the current injection surface.',
    owner: 'scripts/report-runtime-seams.ts',
    command: 'pnpm run report:runtime-seams',
    inputs: [SRC_GLOB, 'scripts/report-runtime-seams.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 120_000,
    cache: 'none',
    authority: 'advisory',
    remediation: 'inspect the runtime-seams report for unexpected coupling.',
  },
  {
    id: 'check/report-adaptive-scan',
    title: 'Adaptive-scan report',
    claim: 'The adaptive-scan report projects the current adaptive-rendering surface.',
    owner: 'scripts/report-adaptive-scan.ts',
    command: 'pnpm run report:adaptive-scan',
    inputs: [SRC_GLOB, 'scripts/report-adaptive-scan.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 120_000,
    cache: 'none',
    authority: 'advisory',
    remediation: 'inspect the adaptive-scan report for unexpected drift.',
  },

  // ── Release lane: framework-integration tests ──────────────────────────────
  {
    id: 'check/test-vite',
    title: 'Vite integration test',
    claim: 'The Vite plugin builds and serves a real project end-to-end.',
    owner: 'scripts/test-vite.ts',
    command: 'pnpm run test:vite',
    inputs: ['packages/vite/src/**/*.ts', SRC_GLOB, 'scripts/test-vite.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the Vite integration failure the harness reported.',
  },
  {
    id: 'check/test-astro',
    title: 'Astro integration test',
    claim: 'The Astro integration builds and renders a real project end-to-end.',
    owner: 'scripts/test-astro.ts',
    command: 'pnpm run test:astro',
    inputs: ['packages/astro/src/**/*.ts', SRC_GLOB, 'scripts/test-astro.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the Astro integration failure the harness reported.',
  },
  {
    id: 'check/test-cloudflare',
    title: 'Cloudflare (Astro) integration test',
    claim: 'The Cloudflare adapter builds a deployable Astro worker end-to-end.',
    owner: 'scripts/test-cloudflare-astro.ts',
    command: 'pnpm run test:cloudflare',
    inputs: ['packages/edge/src/**/*.ts', 'packages/worker/src/**/*.ts', SRC_GLOB, 'scripts/test-cloudflare-astro.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the Cloudflare/Astro integration failure the harness reported.',
  },
  {
    id: 'check/test-cloudflare-dev',
    title: 'Cloudflare dev-server integration test',
    claim: 'The Cloudflare dev server boots and serves a real project end-to-end.',
    owner: 'scripts/test-cloudflare-dev.ts',
    command: 'pnpm run test:cloudflare-dev',
    inputs: ['packages/edge/src/**/*.ts', 'packages/worker/src/**/*.ts', SRC_GLOB, 'scripts/test-cloudflare-dev.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the Cloudflare dev-server integration failure the harness reported.',
  },
  {
    id: 'check/test-tailwind',
    title: 'Tailwind integration test',
    claim: 'The Tailwind pipeline compiles and quantizes styles for a real project.',
    owner: 'scripts/test-tailwind.ts',
    command: 'pnpm run test:tailwind',
    inputs: ['packages/vite/src/**/*.ts', SRC_GLOB, 'scripts/test-tailwind.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the Tailwind integration failure the harness reported.',
  },

  // ── Release lane: e2e + flake ──────────────────────────────────────────────
  {
    id: 'check/test-e2e',
    title: 'End-to-end (Playwright) suite',
    claim: 'The browser e2e suite passes against a real rendered app.',
    owner: 'tests/e2e/playwright.config.ts',
    command: 'pnpm run test:e2e',
    inputs: [SRC_GLOB, 'tests/e2e/**/*.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the e2e failure the Playwright run reported.',
  },
  {
    id: 'check/test-e2e-stress',
    title: 'E2E capture stress',
    claim: 'The capture e2e survives repeated (10x) single-worker stress without flaking.',
    owner: 'tests/e2e/capture.e2e.ts',
    command: 'pnpm run test:e2e:stress',
    inputs: [SRC_GLOB, 'tests/e2e/capture.e2e.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the capture-path instability the stress run exposed.',
  },
  {
    id: 'check/test-e2e-stream-stress',
    title: 'E2E stream stress',
    claim: 'The stream e2e survives repeated (10x) single-worker stress without flaking.',
    owner: 'tests/e2e/stream.e2e.ts',
    command: 'pnpm run test:e2e:stream-stress',
    inputs: [SRC_GLOB, 'tests/e2e/stream.e2e.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the stream-path instability the stress run exposed.',
  },
  {
    id: 'check/test-flake',
    title: 'Flake detector',
    claim: 'Repeated runs of the suite surface no nondeterministic (flaky) test.',
    owner: 'scripts/test-flake.ts',
    command: 'pnpm run test:flake',
    inputs: [SRC_GLOB, TESTS_GLOB, 'scripts/test-flake.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'advisory',
    remediation: 'quarantine and de-flake the nondeterministic test the detector named.',
  },

  // ── Release lane: bench gates + raw runner ─────────────────────────────────
  {
    id: 'check/bench',
    title: 'Benchmark suite (raw runner)',
    claim: 'The full benchmark suite executes and emits measurements for the bench gates.',
    owner: 'tests/bench',
    command: 'pnpm run bench',
    inputs: [SRC_GLOB, 'tests/bench/**/*.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'advisory',
    remediation: 'fix the benchmark that failed to execute (the gates below assert on its output).',
  },
  {
    id: 'check/bench-gate',
    title: 'Benchmark regression gate',
    claim: 'No benchmark regressed past its committed threshold (replicated).',
    owner: 'scripts/bench-gate.ts',
    command: 'pnpm run bench:gate',
    inputs: [SRC_GLOB, 'tests/bench/**/*.ts', 'scripts/bench-gate.ts', 'scripts/bench/**/*.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/meta/bench-gate.test.ts',
    remediation: 'recover the regressed benchmark, or re-baseline with justification.',
  },
  {
    id: 'check/bench-trend',
    title: 'Benchmark trend gate',
    claim: 'The benchmark trend has not drifted outside its strict envelope.',
    owner: 'scripts/bench-trend.ts',
    command: 'pnpm run bench:trend -- --strict',
    inputs: [SRC_GLOB, 'tests/bench/**/*.ts', 'scripts/bench-trend.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'investigate the trend drift the gate reported.',
  },
  {
    id: 'check/bench-reality',
    title: 'Benchmark reality gate',
    claim: 'The benchmark harness measures real work (no vacuous / optimized-away bench).',
    owner: 'scripts/bench-reality.ts',
    command: 'pnpm run bench:reality',
    inputs: [SRC_GLOB, 'tests/bench/**/*.ts', 'scripts/bench-reality.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'restore a real measured workload for the vacuous benchmark the gate flagged.',
  },
  {
    id: 'check/bench-alloc',
    title: 'Allocation gate',
    claim: 'The hot paths stay within their committed allocation budgets.',
    owner: 'scripts/alloc-gate.ts',
    command: 'pnpm run bench:alloc',
    inputs: [SRC_GLOB, 'scripts/alloc-gate.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'reclaim the allocations that exceeded the hot-path budget.',
  },

  // ── Release lane: coverage floor + consumer smoke + environment ────────────
  {
    id: 'check/coverage',
    title: 'Coverage floor',
    claim: 'Merged node+browser coverage clears the committed floor (lines/statements/functions 90, branches 80).',
    owner: 'scripts/merge-coverage.ts',
    command: 'pnpm run coverage',
    inputs: [SRC_GLOB, TESTS_GLOB, 'vitest.config.ts', 'vitest.browser.config.ts', 'vitest.shared.ts'],
    profiles: ['release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 900_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'add tests to lift the under-covered file back over the floor.',
  },
  {
    id: 'check/package-smoke',
    title: 'Packed-tarball consumer smoke',
    claim: 'Every published package packs and import-resolves from its packed tarball (with peers).',
    owner: 'packages/cli/src/bin.ts (package-smoke)',
    command: 'pnpm run package:smoke',
    inputs: [SRC_GLOB, 'packages/*/package.json', 'packages/command/src/commands/package-smoke-registry.ts'],
    profiles: ['release', 'consumer'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 300_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the packed-package export/peer that failed to resolve in the consumer smoke.',
  },
  {
    id: 'check/doctor',
    title: 'Environment doctor',
    claim: 'The host toolchain (node / pnpm / platform deps) satisfies the preflight requirements.',
    owner: 'scripts/doctor.ts',
    command: 'pnpm run doctor -- --preflight --ci',
    inputs: ['scripts/doctor.ts', 'package.json'],
    profiles: ['environment', 'release'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 60_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/cli/commands/doctor.test.ts',
    remediation: 'install / update the toolchain dependency the doctor flagged.',
  },
  {
    id: 'check/journey',
    title: 'Consumer journey flows',
    claim:
      'A real consumer can scaffold, build, debug, upgrade, author against, and navigate LiteShip from packed tarballs.',
    owner: 'scripts/test-journey.ts',
    command: 'pnpm run test:journey',
    inputs: [SRC_GLOB, 'tests/journey/**/*.ts', 'packages/create-liteship/templates/**'],
    profiles: ['consumer', 'release'],
    platforms: ['linux'],
    timeoutMs: 600_000,
    cache: 'none',
    authority: 'blocking',
    remediation: 'fix the consumer flow the journey test exercised (scaffold, build, diagnostic, upgrade, or context).',
  },
  {
    id: 'check/hermetic',
    title: 'Hermetic release build + closure',
    claim:
      'The packed release reinstalls with the network disabled, every public subpath is proved from packed artifacts, and package contents reproduce.',
    owner: 'packages/cli/src/bin.ts (package-smoke --hermetic)',
    command: 'pnpm run package:smoke:hermetic',
    inputs: [SRC_GLOB, 'packages/*/package.json', 'packages/command/src/commands/package-smoke-registry.ts'],
    profiles: ['release'],
    platforms: ['linux'],
    timeoutMs: 420_000,
    cache: 'none',
    authority: 'blocking',
    remediation:
      'fix the offline reinstall, public-subpath proof, or semantic package-content drift reported by the hermetic closure.',
  },
  {
    id: 'check/devcontainer-pins',
    title: 'Devcontainer pin parity',
    claim: 'The committed .devcontainer pins (node, pnpm, rust) equal the repo source-of-truth versions.',
    owner: 'tests/unit/meta/devcontainer-pins.test.ts',
    command: 'pnpm run test:devcontainer',
    inputs: [
      '.devcontainer/**',
      'rust-toolchain.toml',
      'package.json',
      '.nvmrc',
      '.github/workflows/ci.yml',
      '.github/workflows/release.yml',
    ],
    profiles: ['environment'],
    platforms: ['linux', 'darwin', 'win32'],
    timeoutMs: 60_000,
    cache: 'none',
    authority: 'blocking',
    negativeControl: 'tests/unit/meta/devcontainer-pins.test.ts',
    remediation:
      'realign the .devcontainer pin with package.json engines/packageManager, .nvmrc, or the CI toolchain pin.',
  },
] as const;

/** Application-local quick authority: a real host build, never cache-served. */
const APP_BUILD_CHECK: CheckDefinition = {
  id: 'check/app-build',
  title: 'LiteShip application build',
  claim: 'The current LiteShip application config is recognized and its host build completes.',
  owner: 'packages/cli/src/commands/build.ts',
  command: 'liteship build',
  execution: { kind: 'cli-command', argv: ['build'] },
  inputs: ['package.json', 'liteship.config.ts', 'astro.config.*', 'vite.config.*', 'src/**'],
  profiles: ['quick'],
  contexts: ['application'],
  platforms: ['linux', 'darwin', 'win32'],
  timeoutMs: 300_000,
  cache: 'none',
  authority: 'blocking',
  negativeControl: 'tests/unit/cli/commands/build.test.ts',
  remediation: 'fix the LiteShip config or host build failure reported by `liteship build`.',
};

/** The complete repository + application check catalog. */
export const CHECK_REGISTRY: readonly CheckDefinition[] = Object.freeze([
  ...REPOSITORY_CHECKS.map(materializeRepositoryCheck),
  APP_BUILD_CHECK,
]);
