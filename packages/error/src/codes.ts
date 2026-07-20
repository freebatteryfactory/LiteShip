/**
 * `@liteship/error/codes` — the DIAGNOSTIC-CODE REGISTRY.
 *
 * One canonical, content-addressable catalogue of every stable diagnostic code
 * LiteShip emits: the gauntlet gate `Finding` `ruleId`s, the P11
 * `check/<slug>` ids, and the `@liteship/core` runtime diagnostics. Each code
 * enrolls a {@link DiagnosticEntry} — a title, an explanation (the WHY), and a
 * remediation (the fix) — so a human or an agent can `explainDiagnostic(code)`
 * and get the same, single source of truth the emitter drew from.
 *
 * This lives in `@liteship/error` on purpose: `@liteship/error` is the leaf
 * failure-algebra package every other package imports, and a diagnostic code is a
 * FAILURE identity. The registry has ZERO dependencies (like the rest of this
 * package) — the gauntlet reads it (gauntlet imports error, never the reverse),
 * so the dependency arrow stays legal: error is a leaf; gauntlet / command / cli
 * sit above it.
 *
 * The code FORMAT is a `namespace/slug` string kept VERBATIM from the emitters:
 * `gauntlet/no-placeholder`, `check/typecheck`, `core/document-graph/wrong_tag`.
 * {@link DiagnosticCode} pins the shape as `${DiagnosticArea}/${string}` — the
 * area is the first segment, everything after is the emitter's own slug (which may
 * itself carry further `/`-separated sub-codes, e.g.
 * `gauntlet/standards-integrity/weakened`).
 *
 * @module
 */

/**
 * The AREA a diagnostic belongs to — the first `/`-separated segment of every
 * {@link DiagnosticCode}. It names the SUBSYSTEM that owns the code:
 * - `gauntlet`  — a gauntlet gate `Finding` ruleId (the fitness-function layer).
 * - `check`     — a P11 `check/<slug>` id (the data-driven check registry).
 * - `core`      — an `@liteship/core` runtime diagnostic (a `Diagnostics.warn/error` code).
 * - `schema`    — a schema/decode diagnostic.
 * - `compiler`  — a compile-pipeline diagnostic.
 * - `astro`     — an Astro-integration diagnostic.
 * - `cli`       — a CLI-surface diagnostic.
 * - `migrate`   — a migration/codemod diagnostic.
 */
export type DiagnosticArea = 'gauntlet' | 'check' | 'core' | 'schema' | 'compiler' | 'astro' | 'cli' | 'migrate';

/**
 * A stable diagnostic code — `${DiagnosticArea}/${string}`. The area is the first
 * segment; the remainder is the emitter's own slug kept VERBATIM (it may contain
 * further `/` for sub-codes, e.g. `gauntlet/traceability/untraced`).
 */
export type DiagnosticCode = `${DiagnosticArea}/${string}`;

/**
 * What every enrolled {@link DiagnosticCode} carries — the human/agent-readable
 * meaning of the code, drawn from the emitter's own message / detail / remediation
 * text so the catalogue never drifts from what the code actually means.
 */
export interface DiagnosticEntry {
  /** Short human summary — the WHAT (drawn from the emitter's finding title / message). */
  readonly title: string;
  /** The WHY — enough to understand the code without the source (from the emitter's detail / claim). */
  readonly explanation: string;
  /** The actionable fix — one precise instruction (from the emitter's remediation). */
  readonly remediation: string;
  /** The subsystem that owns the code — the first segment of the {@link DiagnosticCode}. */
  readonly area: DiagnosticArea;
}

/** Build one gauntlet entry (area `gauntlet`), trimming the title/explanation/remediation triple. */
function gauntlet(title: string, explanation: string, remediation: string): DiagnosticEntry {
  return { title, explanation, remediation, area: 'gauntlet' };
}

/** Build one check entry (area `check`). */
function check(title: string, explanation: string, remediation: string): DiagnosticEntry {
  return { title, explanation, remediation, area: 'check' };
}

/** Build one core-runtime entry (area `core`). */
function core(title: string, explanation: string, remediation: string): DiagnosticEntry {
  return { title, explanation, remediation, area: 'core' };
}

/**
 * THE REGISTRY — one entry per stable diagnostic code. Frozen; the keys are the
 * codes VERBATIM as their emitters produce them (a gauntlet ruleId literal, a
 * `check/<slug>` id, an `@liteship/core` diagnostic code). The `gauntlet/*` and
 * `check/*` keys are the ones the `gauntlet/diagnostic-code-registered` gate
 * statically proves are enrolled.
 */
export const DIAGNOSTIC_REGISTRY: Readonly<Record<DiagnosticCode, DiagnosticEntry>> = Object.freeze({
  // ── gauntlet: the seven always-on hygiene / determinism gates ────────────────
  'gauntlet/no-bare-throw': gauntlet(
    'Bare throw instead of a tagged @liteship/error variant',
    'A bare `throw new Error(...)` is an untyped failure path — every failure the gauntlet governs must be a tagged @liteship/error variant so callers can branch on the `_tag` and agents can read the failure as data.',
    'Replace the bare throw with the best-fit @liteship/error variant.',
  ),
  'gauntlet/no-ts-ignore': gauntlet(
    'Blind type-checker suppression (@ts-ignore / @ts-nocheck)',
    '`@ts-ignore` / `@ts-nocheck` silence the type-checker without saying WHY, and stay silent even after the underlying error is gone — a blind suppression that hides the next real error.',
    'Use `@ts-expect-error` (a typed, intentional assertion that fails when the error disappears) instead.',
  ),
  'gauntlet/no-nondeterminism': gauntlet(
    'Ambient nondeterminism (Date.now / performance.now / Math.random / argless new Date)',
    'An ambient read of time or randomness makes a path non-reproducible — the L3 determinism contract requires the source of time/randomness to be injected, never read from the ambient global.',
    'Inject the source of time/randomness so the path is reproducible.',
  ),
  'gauntlet/no-silent-catch': gauntlet(
    'Silent catch — the caught error is swallowed',
    'An empty `catch { }` swallows the error it caught — the failure vanishes with no rethrow, no log, and no use, so a real fault ships green.',
    'Rethrow, log, or use the caught error — a swallowed error must never be silent.',
  ),
  'gauntlet/no-skipped-test': gauntlet(
    'Skipped test — green while proving nothing',
    'A skip form (`it.skip` / `.todo` / `xit` / `.skipIf` / `.runIf` / the `COND ? it : it.skip` alias) ships green while proving nothing — allowed only when the file is in the enumerated capability-gated allowlist. This rule is always-blocking.',
    'Un-skip the test and make it pass, or sanction it via the enumerated capability-gated skip allowlist.',
  ),
  'gauntlet/no-placeholder': gauntlet(
    'Placeholder — unfinished work shipped as source',
    'A placeholder directive comment (TODO / FIXME / XXX / HACK) is a signed promise of unfinished work left in shipped code — it reads as done while doing nothing. This rule is always-blocking: a placeholder can never be waived, only finished or removed.',
    'Finish the work or remove the marker — a placeholder is never shippable.',
  ),
  'gauntlet/no-early-return-test': gauntlet(
    'Early return before expect — green while proving nothing',
    'A bare `return;` in a test body before the first `expect(...)` is a silent pass disguised as coverage — the test exits green having asserted nothing.',
    'Replace the silent early return with an honest capability skip or real assertions.',
  ),

  // ── gauntlet: the waiver-lifecycle rules (waiver.ts) ─────────────────────────
  'gauntlet/waiver-forbidden': gauntlet(
    'Waiver targets an always-blocking rule (void)',
    'A waiver tried to suppress an always-blocking rule (the placeholder / skip / early-return floor). That floor can never be waived — the waiver is void and the finding it tried to cover still blocks.',
    'A forbidden-rule waiver cannot exist — delete it and resolve the finding.',
  ),
  'gauntlet/waiver-expired': gauntlet(
    'Expired waiver (the debt came due)',
    'A waiver whose owner-signed expiry is past the injected wall-clock date has lost its teeth — the finding it suppressed re-reds and blocks.',
    'An expired waiver blocks — resolve the underlying finding or renew the waiver with a fresh owner-signed expiry.',
  ),
  'gauntlet/waiver-stale': gauntlet(
    'Stale waiver (matches no finding)',
    'A waiver that matches no current finding suppresses nothing — a stale suppression that rots unnoticed and hides the next real regression.',
    'Delete the waiver — it no longer suppresses anything.',
  ),

  // ── gauntlet: the triangulated oracle-divergence layer ───────────────────────
  'gauntlet/no-default-export-divergence': gauntlet(
    'Oracle divergence on is-default-export',
    'The AST (file-proxy) and invariant-regex (text-only) oracles disagree on is-default-export at a (file, line) — the regex fired on a comment/string the AST ignores. Reports, never decides.',
    'Resolve the oracle divergence — the engine reports, you decide.',
  ),
  'gauntlet/no-var-divergence': gauntlet(
    'Oracle divergence on var-declaration',
    'The AST (file-proxy) and invariant-regex (text-only) oracles disagree on var-declaration at a (file, line) — the regex fired on a comment/string the AST ignores. Reports, never decides.',
    'Resolve the oracle divergence — the engine reports, you decide.',
  ),
  'gauntlet/no-require-divergence': gauntlet(
    'Oracle divergence on require-call',
    'The AST (file-proxy) and invariant-regex (text-only) oracles disagree on require-call at a (file, line) — the regex fired on a comment/string the AST ignores. Reports, never decides.',
    'Resolve the oracle divergence — the engine reports, you decide.',
  ),
  'gauntlet/symbol-orphan-divergence': gauntlet(
    'Orphan-evidence divergence on an exported symbol',
    'The symbol-evidenced LanguageService oracle and the IR file-proxy refs graph disagree on whether an exported symbol is referenced across files (the file-proxy credits a name-only match the checker resolves as an orphan, or misses a re-export the checker resolves). Reports, never decides.',
    'Resolve the orphan-evidence divergence — the engine reports, you decide.',
  ),

  // ── gauntlet: the avionics / claim-vs-reality tier ───────────────────────────
  'gauntlet/crdt-laws-pinned': gauntlet(
    'L4 CRDT / linearizability laws not pinned',
    'The L4 CRDT / linearizability laws (HLC + GraphPatch) must be pinned by deterministic property tests — the coverage rail for the causal/CRDT trust spine. A law family with no pinning property test is a hole in the safety case.',
    'Pin the CRDT law family with a deterministic property test.',
  ),
  'gauntlet/performance-contracts': gauntlet(
    'Performance contract violated (undeclared distribution / complexity regression)',
    'A bench result is invalid unless its input distribution is declared, and a hot path must not regress its complexity class past its accepted ceiling.',
    'Declare the bench input distribution, or restore the path to its accepted complexity class.',
  ),
  'gauntlet/perf-claim-without-bench': gauntlet(
    'Performance claim with no benchmark',
    'A measurable performance claim (zero-alloc / fast-path / O(1) …) in published src with no benchmark measuring it is a claim untethered to reality.',
    'Back the perf claim with a benchmark, or remove the claim.',
  ),
  'gauntlet/claim-without-confirmer': gauntlet(
    'Semantic property claim with no confirmer',
    'A name-based semantic property claim (deterministic / pure / content-addressed / canonical) in published src with no measurable confirmer — or a purity claim contradicted by an in-declaration ambient read — is a claim untethered to reality (a leading doc-claim with no confirmer is advisory, the Rice boundary).',
    'Back the claim with its confirmer (a determinism / round-trip / ambient-entropy test), or remove the claim.',
  ),
  'gauntlet/active-modeled-surface-reader': gauntlet(
    'Active modeled surface has unread load-bearing fields',
    'A load-bearing field on an active modeled surface that no enrolled reader path reads is a field-level orphan — a surface declared but never completed by a projection.',
    'Wire the reader — an active modeled surface must be completed by a projection.',
  ),

  // ── gauntlet: the check-governance meta-gates ────────────────────────────────
  'gauntlet/check-registry-complete': gauntlet(
    'Check-registry partition broken',
    'Every root package.json script must be EITHER a registered check (in CHECK_REGISTRY) OR an exempt script (in SCRIPT_EXEMPTIONS) — the partition must be total and disjoint, and every registered command must resolve to a script that exists.',
    'Register the script as a check or add a SCRIPT_EXEMPTIONS entry — keep the check registry and the root scripts in exact partition.',
  ),
  'gauntlet/check-negative-control': gauntlet(
    'Blocking check declares a missing negative control',
    'A blocking check whose declared `negativeControl` path does not exist is a dangling red-fixture proof — the check claims it can fail, but the fixture proving it is gone.',
    'A declared negative control must point at a real red-fixture path — restore it or fix the declaration.',
  ),
  'gauntlet/check-waiver-freshness': gauntlet(
    'Expired waiver across a governed store',
    'An expired waiver in either governed store — the gauntlet waivers.ts registry or the traceability testing ledger — has lost its teeth (expiry is decided against an injected wall-clock date, the two-clock law).',
    'An expired waiver blocks — resolve or renew it.',
  ),

  // ── gauntlet: the host-fact coverage / correctness tier ──────────────────────
  'gauntlet/mutation-divergence': gauntlet(
    'Surviving mutant / mutation-score regression',
    "Each surviving or no-coverage mutant is a coverage divergence at the file's propagated assurance level (kill-floor by level decides blocking), plus a per-file mutation-score-ratchet regression. Folds host-injected MutationFacts; reports, never decides.",
    'Kill the surviving mutant by adding a test that distinguishes the original from the mutation (or restore the mutation score to at least its committed baseline).',
  ),
  'gauntlet/mcdc-coverage': gauntlet(
    'Condition not MC/DC-covered',
    "Each atomic condition whose independent effect is NOT MC/DC-observed (a surviving force-true/force-false condition-mutant) is a coverage gap at the file's propagated assurance level (L4 requires full MC/DC — DO-178B Level A). Folds host-injected McdcFacts; reports, never decides.",
    'Close the MC/DC gap by adding a test that shows this condition independently affects the decision.',
  ),
  'gauntlet/proof-propagation': gauntlet(
    'Globally under-proven via a weak dependency',
    'The per-module proof scalar propagated along the dep DAG (min-fixpoint, the lax-functor) dropped a trust-spine module below its level floor because of a weak dependency — the weak-link path is named. Folds host-injected ProofFacts; reports, never decides.',
    'Strengthen the weak-link dependency the path names (or run the proof-propagation analysis so the global-proof composition is evidenced).',
  ),
  'gauntlet/composition-coverage': gauntlet(
    'Untested composition edge',
    "An uncovered composition edge (A calls B, both individually tested, no integration test exercises them together) at the edge's propagated level — a structural over-approximation of integration coverage, honestly stated. Folds host-injected CompositionFacts; reports, never decides.",
    'Add an integration test that exercises the two units together (or run the composition-coverage analysis so the untested interactions are evidenced).',
  ),
  'gauntlet/transition-conformance': gauntlet(
    'Transition bisimulation divergence / unevidenced case',
    "Each divergent bisimulation case (the single-oracle model and the implementation disagree over one op history) is a replayable coverage divergence at the family's assurance level, plus each unevidenced case is a coverage gap floored by the committed ratchet. Folds host-injected TransitionFacts; reports, never decides.",
    'Restore bisimulation with the declared reactive model (or evidence the unevidenced case, ratcheting the baseline down as gaps are closed).',
  ),
  'gauntlet/spine-relation': gauntlet(
    'Spine mirror relation drift / unresolved mirror',
    'An admitted @liteship/_spine mirror type whose observed relation (bidirectional assignability against its runtime source) no longer satisfies its admitted two-axis relation, or a mirror that no longer resolves, is a public-contract drift. Folds host-injected SpineRelationFacts; reports, never decides.',
    'Restore the admitted relation, or deliberately re-admit the new relation.',
  ),
  'gauntlet/supply-chain': gauntlet(
    'Supply-chain hermeticity violation',
    'The build-hermeticity facts runtime determinism depends on — lockfile policy, SBOM completeness, ShipCapsule provenance, no-ambient-CI-authority — carry a violation (or are not evidenced).',
    'Restore the hermetic-build invariant this fact pins (or supply the supply-chain facts so the avionics gate can attest them).',
  ),
  'gauntlet/taint-flow': gauntlet(
    'Unsanitized taint flow (source → sink)',
    'An untrusted SOURCE (fetched shader source, AI-cast proposal, runtime URL, file/env) reaching a dangerous SINK (shader compile, innerHTML, graph-apply, fetch) with NO sanitizer on the path is a blocking flow; a sanitized flow is the guarded-seam green. Reports, never decides.',
    'Break the taint by sanitizing the untrusted value before the sink.',
  ),
  'gauntlet/capability-gate-link': gauntlet(
    'Capability-gated skip not proven by its capability probe',
    'A sanctioned capability-gated skip whose guard does NOT derive from its declared capability probe (an unrelated runtime condition, or a mislabel) is a blocking finding; a guard that derives from its declared capability is a genuine gate. Reports, never decides.',
    'Make the skip guard derive from its declared capability probe (or remove the mislabeled skip).',
  ),
  'gauntlet/fuzz-corpus': gauntlet(
    'Decode-surface fuzz violation',
    'A decode-surface violation (a crash / a prototype pollution / a misparse on an untrusted-byte decoder) is a self-explaining L4 finding carrying the reproducer — the untrusted-byte decode surface is the trust spine.',
    'Make the decoder fail closed on the reproducer (or supply the decode-fuzz facts so the avionics gate can attest the decode surface).',
  ),
  'gauntlet/simulation-determinism': gauntlet(
    'Deterministic-simulation replay divergence',
    'A replay-divergence (two replays of one seed produce different byte-exact trace digests) is a self-explaining L4 finding carrying the seed — determinism is the trust spine.',
    'Restore deterministic replay — the same seed must yield a byte-identical trace.',
  ),
  'gauntlet/declared-fix-protocol': gauntlet(
    'Agent-fix admission rejected (the raccoon rule)',
    'An agent auto-fix REJECTED for scope-creep, size-exceeded, an unsigned/forbidden standards weakening, or a forged/missing receipt is a blocking finding per reason; an admitted (in-scope, sized, non-weakening, receipted) fix is clean.',
    'Make the fix match its declaration, or revise the declaration to the truth — then re-verify.',
  ),
  'gauntlet/standards-integrity': gauntlet(
    'Standards surface weakened (the raccoon rule)',
    "The unconditional commit backstop: a content-addressed snapshot of the gauntlet's own standards surface (the gate set, each gate's fixtures, the assurance map, the waivers, the invariants ledger, the numeric floors) is diffed on change — a weakening blocks unless owner-signed. The specific class is reported as a sub-code (weakened / signoff-forbidden / signoff-expired / weakened-signed / snapshot-stale).",
    'Reverse the weakening, or sign it off explicitly with an owner-signed standards-waiver + regenerated snapshot.',
  ),
  'gauntlet/traceability': gauntlet(
    'Requirements-traceability break',
    "Every system invariant (a LAW) must be traced to a proving test or covered by a waiver-with-teeth. An untraced invariant, an expired waiver, or a ledger⇔header divergence is a self-explaining finding at the invariant's level (reported as an untraced / waiver-expired / divergence sub-code).",
    'Trace the invariant to a real proving test, sign an owner waiver, or reconcile the ledger with the live PROVES headers.',
  ),

  // ── gauntlet: sub-codes with a fixed suffix (distinct diagnostics) ────────────
  'gauntlet/standards-integrity/weakened': gauntlet(
    'Standards weakened without sign-off (the raccoon caught)',
    'The committed standards snapshot was silently weakened (a removed gate, reduced fixtures, a lowered floor/level, a new/extended waiver, a removed/lowered invariant). A weakening is permitted only via an explicit, owner-signed standards-waiver naming the exact element + class + an expiry.',
    'Reverse the weakening, or sign it off explicitly with an owner-signed standards-waiver + regenerated snapshot.',
  ),
  'gauntlet/standards-integrity/signoff-forbidden': gauntlet(
    'Forbidden standards sign-off (void)',
    'A sign-off tried to authorize weakening an always-blocking rule (the placeholder/skip family). That floor can never be weakened-in — the sign-off is void and the weakening it tried to cover still blocks. You cannot sign away a lie.',
    'Delete the forbidden sign-off and restore the always-blocking floor.',
  ),
  'gauntlet/standards-integrity/signoff-expired': gauntlet(
    'Expired standards sign-off',
    'The standards-waiver authorizing a weakening has expired against the injected wall-clock date — the deferral came due, the weakening is unsigned again and blocks.',
    'Resolve or renew the expired standards sign-off (reverse the weakening, or bump the expiry with a re-confirmed owner + justification).',
  ),
  'gauntlet/standards-integrity/weakened-signed': gauntlet(
    'Signed standards weakening (recorded)',
    'A weakening that IS owner-signed with a justification — allowed and recorded as an audit advisory (the only honest escape, a weakening with teeth). The advisory keeps it visible in every run so the sign-off cannot rot unnoticed.',
    'No action required — the signed weakening is recorded; review the sign-off if it is no longer intended.',
  ),
  'gauntlet/standards-integrity/snapshot-stale': gauntlet(
    'Standards snapshot stale (un-regenerated strengthen)',
    'The live standards surface STRENGTHENED but the committed snapshot was not regenerated. This is safe (the standards grew, not shrank) but the snapshot must be kept current so the backstop diffs against truth.',
    'Regenerate the committed standards snapshot (LITESHIP_UPDATE_STANDARDS_SNAPSHOT=1) and review the diff.',
  ),
  'gauntlet/traceability/untraced': gauntlet(
    'Untraced invariant',
    'A system invariant (a LAW) declared in traceability/invariants.yaml with no proving test and no waiver covering it is a hole in the safety case — a law the system claims to uphold with nothing proving it.',
    'Trace the invariant to a real proving test (with a `// PROVES:` header), or sign an owner waiver.',
  ),
  'gauntlet/traceability/waiver-expired': gauntlet(
    'Expired traceability waiver',
    'The waiver covering an untraced invariant has expired against the injected wall-clock date — the deferral came due and the invariant is untraced again.',
    'Resolve or renew the expired waiver (add a real proving test, or renew with a fresh owner-signed expiry).',
  ),
  'gauntlet/simulation-determinism/replay-divergence': gauntlet(
    'Replay divergence',
    'Two replays of one seed produced different byte-exact trace digests — a determinism break on the trust spine. The finding carries the seed so the bug replays byte-for-byte.',
    'Restore deterministic replay — the same seed must yield a byte-identical trace.',
  ),
  'gauntlet/simulation-determinism/not-evidenced': gauntlet(
    'Simulation determinism not evidenced',
    'No deterministic-simulation (DST) facts were injected, so replay-determinism could not be attested — an honest advisory rather than a silent green.',
    'Supply the DST facts so the avionics gate can attest replay-determinism.',
  ),
  'gauntlet/fuzz-corpus/not-evidenced': gauntlet(
    'Decode-surface fuzzing not evidenced',
    'No decode-fuzz facts were injected, so the untrusted-byte decode surface could not be attested fail-closed — an honest advisory rather than a silent green.',
    'Supply the decode-fuzz facts so the avionics gate can attest the decode surface is fail-closed.',
  ),

  // ── gauntlet: the diagnostic-code registry meta-gate (this registry's guard) ──
  'gauntlet/diagnostic-code-registered': gauntlet(
    'Emitted diagnostic code is not registered',
    'A gauntlet gate emits a `ruleId` (or the check registry declares a `check/<slug>` id) that has no entry in the DIAGNOSTIC_REGISTRY. Every emitted diagnostic code must be enrolled so it can be explained by `explainDiagnostic`.',
    'Enroll the emitted code in packages/error/src/codes.ts DIAGNOSTIC_REGISTRY with a title, explanation, and remediation.',
  ),

  // ── check: the P11 check registry (check/<slug>) ─────────────────────────────
  'check/format': check(
    'Prettier formatting',
    'Every package source file is Prettier-clean.',
    "run 'pnpm run format' to auto-fix, then re-run.",
  ),
  'check/lint-structural': check(
    'Structural lint (ast-grep)',
    'No banned structural pattern (sgconfig.yml rules) appears in the tree.',
    "fix the ast-grep finding (or run 'pnpm run lint:structural' for the full report).",
  ),
  'check/lint': check(
    'ESLint (max-warnings 0)',
    'Package/test/script source passes ESLint with zero warnings.',
    "run 'pnpm run fix' (format + eslint --fix), then re-run.",
  ),
  'check/typecheck': check(
    'TypeScript typecheck',
    'The package, scripts, and tests projects all typecheck (tsc --build + scripts + tests).',
    'fix the type errors (tsc --build + scripts + tests projects).',
  ),
  'check/test-unit': check(
    'Unit tests (fast lane)',
    'The fast unit suite is green — the quick-lane behavioural floor.',
    'make the failing unit assertions pass.',
  ),
  'check/docs': check(
    'TSDoc freshness (docs:check)',
    'The committed API docs match the current public TSDoc surface.',
    "run 'pnpm run docs:build' and commit docs/api/ if you touched a public TSDoc surface.",
  ),
  'check/gates': check(
    'Gauntlet gate fold (check:gates)',
    'The in-process gauntlet gate fold (self-proving gates) emits no blocking finding.',
    'resolve the blocking gate findings, or file a signed waiver.',
  ),
  'check/audit-floor': check(
    'Audit warning floor',
    'The audit warning inventory has not grown past its committed floor.',
    'clear the new audit warning(s), or update the floor with justification.',
  ),
  'check/test': check(
    'Test suite (unit + component + property + integration)',
    'The aggregate node test suite is green.',
    'make the failing assertions pass.',
  ),
  'check/test-redteam': check(
    'Red-team runtime regression',
    'The red-team runtime adversarial suite finds no exploitable regression.',
    'fix the runtime safety regression the red-team assertion caught.',
  ),
  'check/runtime-gate': check(
    'Runtime seam gate',
    'The runtime injection seams stay sound (no un-seamed runtime coupling).',
    'restore the runtime seam the gate flagged (inject the dependency, do not hard-couple).',
  ),
  'check/standards-gate': check(
    'Standards integrity gate',
    'No unsigned weakening of the gauntlet standards surface vs the base-ref snapshot.',
    'sign the standards change, or restore the weakened rigor.',
  ),
  'check/capability-gate': check(
    'Capability-link gate',
    'Every sanctioned skip guard derives from its declared capability probe.',
    'link the skip guard to its capability probe, or remove the mislabeled skip.',
  ),
  'check/spine-relation-gate': check(
    'Spine-relation gate',
    'Every admitted @liteship/_spine mirror type still satisfies its frozen assignability relation.',
    'reconcile the mirror type with its runtime source, or re-admit the new relation.',
  ),
  'check/transition-gate': check(
    'Transition conformance gate',
    'Every pinned op history bisimulates the current declared reactive model on the native transport.',
    'restore bisimulation with the declared reactive model (fix the transport or the model).',
  ),
  'check/plumb-gate': check(
    'Plumbing gate',
    'Every declared package export is reachable and correctly plumbed.',
    'plumb the missing export, or update the plumb registry.',
  ),
  'check/feedback-verify': check(
    'Feedback-loop verification',
    'The feedback-loop artifacts are consistent with the live surface they summarize.',
    'reconcile the feedback artifact with the current surface.',
  ),
  'check/flex-verify': check(
    'Flex policy verification',
    'The bench flex policy (accepted noise labels + thresholds) is internally consistent.',
    'fix the flex-policy inconsistency the verifier reported.',
  ),
  'check/devx': check(
    'DevX policy check',
    'The developer-experience policy invariants (flex thresholds, labels) hold.',
    'restore the devx policy invariant the check reported.',
  ),
  'check/capsule-verify': check(
    'Capsule verification',
    'Every compiled capsule verifies against its committed manifest.',
    'recompile the capsule (pnpm run capsule:compile) and re-verify.',
  ),
  'check/audit': check(
    'Audit report',
    'The full structure/integrity/surface audit report generates cleanly.',
    'review the audit report; escalations are enforced by check/audit-floor.',
  ),
  'check/report-runtime-seams': check(
    'Runtime-seams report',
    'The runtime-seams report projects the current injection surface.',
    'inspect the runtime-seams report for unexpected coupling.',
  ),
  'check/report-adaptive-scan': check(
    'Adaptive-scan report',
    'The adaptive-scan report projects the current adaptive-rendering surface.',
    'inspect the adaptive-scan report for unexpected drift.',
  ),
  'check/test-vite': check(
    'Vite integration test',
    'The Vite plugin builds and serves a real project end-to-end.',
    'fix the Vite integration failure the harness reported.',
  ),
  'check/test-astro': check(
    'Astro integration test',
    'The Astro integration builds and renders a real project end-to-end.',
    'fix the Astro integration failure the harness reported.',
  ),
  'check/test-cloudflare': check(
    'Cloudflare (Astro) integration test',
    'The Cloudflare adapter builds a deployable Astro worker end-to-end.',
    'fix the Cloudflare/Astro integration failure the harness reported.',
  ),
  'check/test-cloudflare-dev': check(
    'Cloudflare dev-server integration test',
    'The Cloudflare dev server boots and serves a real project end-to-end.',
    'fix the Cloudflare dev-server integration failure the harness reported.',
  ),
  'check/test-tailwind': check(
    'Tailwind integration test',
    'The Tailwind pipeline compiles and quantizes styles for a real project.',
    'fix the Tailwind integration failure the harness reported.',
  ),
  'check/test-e2e': check(
    'End-to-end (Playwright) suite',
    'The browser e2e suite passes against a real rendered app.',
    'fix the e2e failure the Playwright run reported.',
  ),
  'check/test-e2e-stress': check(
    'E2E capture stress',
    'The capture e2e survives repeated (10x) single-worker stress without flaking.',
    'fix the capture-path instability the stress run exposed.',
  ),
  'check/test-e2e-stream-stress': check(
    'E2E stream stress',
    'The stream e2e survives repeated (10x) single-worker stress without flaking.',
    'fix the stream-path instability the stress run exposed.',
  ),
  'check/test-flake': check(
    'Flake detector',
    'Repeated runs of the suite surface no nondeterministic (flaky) test.',
    'quarantine and de-flake the nondeterministic test the detector named.',
  ),
  'check/bench': check(
    'Benchmark suite (raw runner)',
    'The full benchmark suite executes and emits measurements for the bench gates.',
    'fix the benchmark that failed to execute (the gates below assert on its output).',
  ),
  'check/bench-gate': check(
    'Benchmark regression gate',
    'No benchmark regressed past its committed threshold (replicated).',
    'recover the regressed benchmark, or re-baseline with justification.',
  ),
  'check/bench-trend': check(
    'Benchmark trend gate',
    'The benchmark trend has not drifted outside its strict envelope.',
    'investigate the trend drift the gate reported.',
  ),
  'check/bench-reality': check(
    'Benchmark reality gate',
    'The benchmark harness measures real work (no vacuous / optimized-away bench).',
    'restore a real measured workload for the vacuous benchmark the gate flagged.',
  ),
  'check/bench-alloc': check(
    'Allocation gate',
    'The hot paths stay within their committed allocation budgets.',
    'reclaim the allocations that exceeded the hot-path budget.',
  ),
  'check/coverage': check(
    'Coverage floor',
    'Merged node+browser coverage clears the committed floor (lines/statements/functions 90, branches 80).',
    'add tests to lift the under-covered file back over the floor.',
  ),
  'check/package-smoke': check(
    'Packed-tarball consumer smoke',
    'Every published package packs and import-resolves from its packed tarball (with peers).',
    'fix the packed-package export/peer that failed to resolve in the consumer smoke.',
  ),
  'check/doctor': check(
    'Environment doctor',
    'The host toolchain (node / pnpm / platform deps) satisfies the preflight requirements.',
    'install / update the toolchain dependency the doctor flagged.',
  ),

  // ── core: @liteship/core runtime diagnostics (Diagnostics.warn/error codes) ──
  'core/document-graph/not_an_object': core(
    'DocumentGraph decode: value is not an object',
    'A DocumentGraph decode received a value that is not a plain object — the untrusted bytes did not shape-check.',
    'Supply a well-formed DocumentGraph object; the decoder fails closed on a non-object.',
  ),
  'core/document-graph/wrong_tag': core(
    'DocumentGraph decode: wrong _tag',
    'A DocumentGraph decode received a value whose `_tag` is not the expected DocumentGraph tag.',
    'Ensure the encoded value carries the correct DocumentGraph `_tag`.',
  ),
  'core/document-graph/unsupported_version': core(
    'DocumentGraph decode: unsupported version',
    'A DocumentGraph decode received a version the current decoder does not support.',
    'Re-encode with a supported DocumentGraph version, or migrate the payload forward.',
  ),
  'core/document-graph/malformed_nodes': core(
    'DocumentGraph decode: malformed nodes',
    'A DocumentGraph decode found the `nodes` collection malformed (not the expected shape).',
    'Fix the `nodes` structure in the encoded DocumentGraph.',
  ),
  'core/document-graph/malformed_edges': core(
    'DocumentGraph decode: malformed edges',
    'A DocumentGraph decode found the `edges` collection malformed (not the expected shape).',
    'Fix the `edges` structure in the encoded DocumentGraph.',
  ),
  'core/graph-patch/not_an_object': core(
    'GraphPatch decode: value is not an object',
    'A GraphPatch decode received a value that is not a plain object — the untrusted bytes did not shape-check.',
    'Supply a well-formed GraphPatch object; the decoder fails closed on a non-object.',
  ),
  'core/graph-patch/wrong_tag': core(
    'GraphPatch decode: wrong _tag',
    'A GraphPatch decode received a value whose `_tag` is not the expected GraphPatch tag.',
    'Ensure the encoded value carries the correct GraphPatch `_tag`.',
  ),
  'core/graph-patch/unsupported_version': core(
    'GraphPatch decode: unsupported version',
    'A GraphPatch decode received a version the current decoder does not support.',
    'Re-encode with a supported GraphPatch version, or migrate the payload forward.',
  ),
  'core/state-transition/malformed': core(
    'DiscreteStateTransition decode: malformed',
    'A DiscreteStateTransition decode received a malformed value — the untrusted bytes did not shape-check.',
    'Supply a well-formed DiscreteStateTransition; the decoder fails closed on a malformed value.',
  ),
  'core/state-transition/wrong_kind': core(
    'DiscreteStateTransition decode: wrong kind',
    'A DiscreteStateTransition decode received a value whose kind is not the expected transition kind.',
    'Ensure the encoded transition carries the correct kind.',
  ),
  'core/hlc/malformed': core(
    'HLC decode: malformed timestamp',
    'A hybrid-logical-clock (HLC) decode received a malformed timestamp — the causal-ordering bytes did not shape-check.',
    'Supply a well-formed HLC timestamp; the decoder fails closed on a malformed value.',
  ),
  'core/receipt/malformed': core(
    'Receipt decode: malformed',
    'An evidence receipt decode received a malformed value — the receipt bytes did not shape-check.',
    'Supply a well-formed receipt; the decoder fails closed on a malformed value.',
  ),
  'core/gap-replay/discrete-transition-subject-mismatch': core(
    'Gap-replay: discrete-transition subject mismatch',
    'A discrete-transition gap replay found the transition subject does not match the cell it was applied to.',
    'Align the discrete transition with its subject cell before replay.',
  ),
  'core/gap-replay/discrete-transition-chain-invalid': core(
    'Gap-replay: discrete-transition chain invalid',
    'A discrete-transition gap replay found the transition chain invalid (a break in the causal chain).',
    'Repair the discrete-transition chain so the causal ordering is valid.',
  ),
  'core/gap-replay/discrete-transition-unknown-cell': core(
    'Gap-replay: discrete-transition unknown cell',
    'A discrete-transition gap replay referenced a cell that is not known in the graph.',
    'Reference an existing cell, or add the missing cell before replay.',
  ),
  'core/state-cell/discrete-generation-rollback': core(
    'State-cell: discrete generation rollback',
    'A reactive state cell observed a discrete generation moving backwards — a rollback that would break causal monotonicity.',
    'Ensure discrete generations advance monotonically; investigate the source of the rollback.',
  ),
  'core/assembly/pure_transform_missing_run': core(
    'defineCapsule: pureTransform missing run',
    'A pureTransform assembly was defined without a `run` function — the transform has no body to execute.',
    'Supply the `run` function for the pureTransform assembly.',
  ),
  'core/style/style-unknown-state': core(
    'Style.tap: unknown boundary state',
    "Style.tap was called with a state that is not one of the style's boundary states; base styles are returned as a fallback.",
    "Pass a state that belongs to the style's boundary, or extend the boundary to include it.",
  ),
  'core/boundary/unknown-previous-state': core(
    'evaluateResult: unknown previous state',
    'evaluateResult received a `previousState` that is not a state of the given boundary; it is treated as a crossing. Check that the state came from this boundary.',
    'Pass a previousState that belongs to this boundary.',
  ),
  'core/token/token-tap-miss': core(
    'Token.tap: no value for key',
    'Token.tap was called with a key that has no value in the token; the fallback is returned.',
    'Use a key that exists in the token, or add the value for the missing key.',
  ),
  'core/interpret-transition/not-found': core(
    'interpretTransition: transition node not found',
    'interpretTransition was given a transition id that resolves to no transition node.',
    'Reference an existing transition node id.',
  ),
  'core/transition-program/empty-program': core(
    'interpretProgram: empty program',
    'A transition program lowered to no windows (an empty composition or an unmatched choice) — nothing to animate.',
    'Provide a non-empty composition or an `otherwise` arm so the program lowers to at least one window.',
  ),
  'core/transition-program/step-unresolved': core(
    'interpretProgram: transition step did not lower',
    'A transition step did not lower to a motion plan — the step could not be resolved into a concrete animation.',
    'Ensure the transition step resolves to a valid motion plan.',
  ),
} as Readonly<Record<DiagnosticCode, DiagnosticEntry>>);

/**
 * Look up a diagnostic code's {@link DiagnosticEntry}, or `undefined` when the code
 * is not enrolled. Accepts any string (the gauntlet's static scan passes raw
 * emitted-code literals through here) — an unregistered code returns `undefined`,
 * which is exactly the signal the `gauntlet/diagnostic-code-registered` gate reds on.
 */
export function explainDiagnostic(code: string): DiagnosticEntry | undefined {
  const registry = DIAGNOSTIC_REGISTRY as Readonly<Record<string, DiagnosticEntry>>;
  return Object.prototype.hasOwnProperty.call(registry, code) ? registry[code] : undefined;
}
