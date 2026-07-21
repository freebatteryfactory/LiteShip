/**
 * The negative-control EXEMPTION ledger (data) — the blocking checks for which a
 * planted-regression negative control does NOT map, each with the one-line reason
 * it is exempt. This is the second half of the negative-control partition:
 *
 *   Every BLOCKING {@link CheckDefinition} EITHER declares a `negativeControl`
 *   (a real red-fixture / regression-guard / self-proving gate proving the check
 *   CAN fail) OR is a key of {@link NEGATIVE_CONTROL_EXEMPT} (with a rationale).
 *
 * The partition is TOTAL and DISJOINT over the blocking checks — nothing falls
 * through, and no check is both. That law is what makes the acceptance criterion
 * "every blocking check has a negative control" HONEST: an exempt check is not a
 * silent gap, it is a DECLARED, reasoned decision that a planted-regression fixture
 * would be vacuous (the tool / harness / measurement IS the oracle, or there is no
 * source behavior to plant a bug in).
 *
 * The `check-negative-control` gate ENFORCES the partition: a blocking check that
 * neither declares an existing negativeControl nor is exempt is an UNCLASSIFIED
 * finding; a check that is BOTH is a DISJOINTNESS finding. The `tests/unit/devops`
 * host meta-test additionally proves the data integrity of THIS ledger — every key
 * is a real blocking check id, no key also declares a control, and every reason is
 * non-empty.
 *
 * Keys are exact `check/<slug>` ids from {@link CHECK_REGISTRY}. The rationale kinds:
 *   - TOOL-ORACLE     — a tool computes conformance and reds on any violating input
 *                       by construction (format / lint / lint-structural / typecheck
 *                       / docs / coverage); there is no behavior to plant a bug in.
 *   - PARITY          — asserts a committed artifact equals its source-of-truth and
 *                       reds on any drift (devcontainer pins).
 *   - ENVIRONMENT     — validates the HOST toolchain, not repository source (doctor).
 *   - STRUCTURAL-SEAM — a structural verifier over declared seams / policy that reds
 *                       on any inconsistency by construction (runtime / flex / devx).
 *   - MEASUREMENT     — a benchmark gate whose verdict is a real wall-clock / alloc
 *                       measurement vs a committed threshold; a deterministic planted
 *                       "regression" would be flaky, not a sound control.
 *   - SUITE-ORACLE    — a test / integration / e2e RUNNER whose oracle is its own
 *                       assertions; it reds on any failing assertion by construction,
 *                       and the teeth of those assertions are proven by the
 *                       mutation-divergence + coverage-floor gates, not a separate
 *                       planted fixture.
 *
 * @module
 */

/**
 * The blocking checks exempt from declaring a `negativeControl`, keyed by
 * `check/<slug>` id → the one-line rationale (see the module doc for the kinds).
 * The negative-control gate treats a key here as "classified"; a blocking check
 * that is neither exempt nor declares an existing control is a partition hole.
 */
export const NEGATIVE_CONTROL_EXEMPT: Readonly<Record<string, string>> = Object.freeze({
  // ── TOOL-ORACLE — the tool computes conformance; nothing behavioral to plant ──
  'check/format':
    'TOOL-ORACLE: Prettier reds on any unformatted byte by construction — there is no behavioral regression to plant, only formatting the tool computes.',
  'check/lint':
    'TOOL-ORACLE: ESLint (max-warnings 0) reds on any lint violation by construction — a planted fixture only re-asserts what the linter already computes.',
  'check/lint-structural':
    'TOOL-ORACLE: ast-grep reds on any banned structural pattern by construction — the sgconfig rule set IS the oracle; a fixture cannot fail in a way the rules do not already catch.',
  'check/typecheck':
    'TOOL-ORACLE: tsc reds on any type error by construction — its NON-vacuity (that it checks something) is separately pinned by tests/unit/devops/gate-canaries.test.ts.',
  'check/docs':
    'TOOL-ORACLE: docs:check diffs the committed API docs against the live TSDoc surface and reds on any drift by construction — a stale-doc fixture only re-asserts the diff.',
  'check/coverage':
    'TOOL-ORACLE: the coverage tool computes merged line/branch coverage against a numeric floor and reds on any under-covered file by construction.',

  // ── PARITY — asserts a committed artifact equals its source-of-truth ─────────
  'check/devcontainer-pins':
    'PARITY: asserts the committed .devcontainer pins equal the repo source-of-truth (engines / .nvmrc / CI) and reds on any drift by construction — an equality check, not a behavioral gate.',

  // ── ENVIRONMENT — validates the host toolchain, not repository source ────────
  'check/doctor':
    'ENVIRONMENT: validates the HOST toolchain (node / pnpm / platform deps), not repository source — there is no source regression to plant; a broken host reds it by construction.',

  // ── STRUCTURAL-SEAM — a structural verifier over declared seams / policy ─────
  'check/runtime-gate':
    'STRUCTURAL-SEAM: scans source for un-seamed runtime coupling and reds on any hard-coupled seam by construction — a structural oracle over the tree, like a lint, not a behavioral fixture.',
  'check/flex-verify':
    'STRUCTURAL-SEAM: reds on any internally-inconsistent bench flex policy (labels / thresholds) by construction — it checks a data structure against itself, with no external behavior to plant.',
  'check/devx':
    'STRUCTURAL-SEAM: reds on any violated devx policy invariant (flex thresholds / labels) by construction — a data-consistency oracle, not a behavioral gate.',

  // ── MEASUREMENT — a real wall-clock / alloc measurement vs a committed floor ─
  'check/bench-trend':
    'MEASUREMENT: the trend verdict is computed from real measured samples against a strict envelope and reds on any drift by construction — a deterministic planted-slow fixture would be flaky, not a sound control.',
  'check/bench-alloc':
    'MEASUREMENT: the allocation verdict is computed from measured retained / transient bytes against a hot-path budget and reds on any over-budget path by construction.',

  // ── SUITE-ORACLE — a runner whose oracle is its own assertions ──────────────
  'check/test-unit':
    'SUITE-ORACLE: the fast unit runner reds on any failing assertion by construction; the teeth of those assertions are proven by the mutation-divergence + coverage gates, not a separate planted fixture.',
  'check/test':
    'SUITE-ORACLE: the aggregate node suite reds on any failing assertion by construction; teeth proven by the mutation-divergence + coverage-floor gates.',
  'check/test-vite':
    'SUITE-ORACLE: the Vite integration harness builds/serves a real project and reds on any broken adapter by construction — a fixture would duplicate the harness end-to-end assertions.',
  'check/test-astro':
    'SUITE-ORACLE: the Astro integration harness builds/renders a real project and reds on any broken adapter by construction.',
  'check/test-cloudflare':
    'SUITE-ORACLE: the Cloudflare (Astro) harness builds a deployable worker and reds on any broken adapter by construction.',
  'check/test-cloudflare-dev':
    'SUITE-ORACLE: the Cloudflare dev-server harness boots/serves a real project and reds on any broken adapter by construction.',
  'check/test-tailwind':
    'SUITE-ORACLE: the Tailwind harness compiles/quantizes styles for a real project and reds on any broken pipeline by construction.',
  'check/test-e2e':
    'SUITE-ORACLE: the Playwright e2e suite reds on any failing browser assertion by construction against a real rendered app.',
  'check/test-e2e-stress':
    'SUITE-ORACLE: a repeated-run stress harness over the capture e2e; it reds on any flake / failure by construction — the harness is the oracle.',
  'check/test-e2e-stream-stress':
    'SUITE-ORACLE: a repeated-run stress harness over the stream e2e; it reds on any flake / failure by construction — the harness is the oracle.',
});
