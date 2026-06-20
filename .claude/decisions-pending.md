# Decisions pending owner review (throughput mode)

Rule: at each fork I try "cake and eat it" (satisfy both horns, no quality loss) and proceed.
Only GENUINELY IRREDUCIBLE tradeoffs land here — I keep moving and you batch-review these later.
Each entry: the fork, the both-win attempt, why it's irreducible, my default choice (what I shipped
so the pipeline didn't stall), and how to reverse if you disagree.

Resolved-by-cake-and-eat-it (NOT pending — logged for the record):
- Error construction: zero-dep `_tag` classes AND full Effect interop (catchTag keys on _tag). ✅
- Topology gate: foundational allowlist AND downstream-extensible (optional profile field). ✅
- Brand validation "all 8" AND no ceremony: each scalar gets its REAL invariant, not a type-restate. ✅

## RESOLVED

### ✅ ⚑ Assurance-level assignment — APPROVED WITH REDLINES (owner, 2026-06-20)
The owner blessed the L0–L4 model (most-specific glob wins, default L1, gates filter
by level+) but sent the correcting principle: **"folder names do not decide
assurance. AUTHORITY decides assurance."** A grader that can block a release cannot
itself be low-assurance just because it lives in a tools folder. Applied to
`packages/gauntlet/src/assurance-map.ts`:
- **Authority-bearing tooling pulled OUT of L0/L1.** The gauntlet's own judgment core
  (engine/authority/waiver/gate/assurance-map/finding/assurance) → **L4**; its gates +
  runner + node-context → **L3**. The audit authority (structure/policy/devops-profile/
  integrity) → **L3**. The gate/generate/verify SCRIPTS (16 of them — exit-nonzero or
  emit artifacts) → **L3**. Cosmetic tooling (reports, scaffolds, test harnesses,
  shell wrappers) stays L1.
- **brands split by criticality.** `assets`/`genui` brands.ts (AssetRefId / ContentAddress
  identity kernels) → **L4**. `core/brands.ts` kept whole at L4 conservatively (it holds
  ContentAddress + IntegrityDigest; the cosmetic brands it also carries get the strict
  level until the file-split, which is a Slice-C precondition — L3/L4 is inert until the
  avionics gates exist). `ai-cast` moved L4→**L3** (deterministic proposer, not a trusted-
  artifact emitter), per the redline.
- **External-input / tool-dispatch / state-mutating boundaries** raised: mcp http/stdio/
  dispatch, command dispatcher, cli dispatch + the mutating/verifying cli executors → **L3**;
  the protocol + command surfaces → **L2**; transport wrappers stay L1.
- **stage/remotion**: artifact-producing cores (dual-export, ffmpeg-encoder, composition)
  → **L3**; previews/hooks → L2.
Every file was classified by READING its behavior against the authority criterion (3 fan-out
agents, zero ambiguous). Result: nothing in the grader defaults to L1 — `gauntlet` was pulled
out of the cosmetic catch-all so any unmatched file fails UPWARD to L2.

### ✅ Clock/RNG substrate — RESOLVED by cake-and-eat-it (for the record + redline)
**The fork:** the owner's triage guidance said L3/L4 `Date.now()` is "guilty until
clock-injected" — cure by injection unless it's the declared entropy boundary. That needs
a determinism substrate, and there was none (time was read 4 different ad-hoc ways).
**Both-win resolution (shipped):** `@czap/core` now exports TWO declared entropy boundaries —
`systemClock` (monotonic `performance.now`, for DURATIONS) and `wallClock` (epoch `Date.now`,
for TIMESTAMPS / HLC wall_ms / time-range). Every runtime path threads an optional
`clock?: Clock` defaulting to the right boundary (no caller breaks; full determinism under a
`fixedClock`/`manualClock`); Effect-land code (hlc/zap) uses Effect's `Clock` (TestClock-
replayable, no waiver). The ONLY ambient reads left are the two boundary definitions + one
`systemRng` (`Math.random`) — each explicitly WAIVED in `waivers.ts` with an annual re-review.
- **The split matters:** a cli/command cure agent CAUGHT that a one-boundary `systemClock`
  (perf.now ~30) fed into `new Date(...)`/HLC would yield 1970 timestamps — laundering (green
  gate, broken data) — and STOPPED rather than do it. That's why there are TWO boundaries.
- **Cured:** core (boundary/signal/zap/hlc/token-buffer/gen-frame/speculative), quantizer,
  web, worker, astro runtime, cli/command — all build green, package tests pass.
- **Redline knobs:** the systemClock-vs-wallClock choice per site is documented inline; the
  3 boundary waivers + annual `BOUNDARY_REVIEW` date are in `waivers.ts`.

## PENDING

### ⚑ The internal-tooling contract — do build SCRIPTS owe the error + determinism laws?
**The fork (newly surfaced, genuinely irreducible — your call):** widening the gate scan to
`scripts/**` surfaced that the no-bare-throw (31) and no-nondeterminism (~14) contracts now
bind leaf build scripts (`scripts/*.ts`). These are NOT shipped/consumed product — they run
once in CI and abort-with-stack on failure. The authority principle says a script's VERDICT
(pass/fail) is high-assurance, but its abort-throw and its phase-timing are arguably NOT its
authority surface.

**Cake-and-eat-it attempt (partial):** I CURED everything on the shipped surfaces (packages +
cli + command) and the two REAL generator bugs the gauntlet caught in `capsule-compile`
(`new Date().toISOString()` stamped into a `CapsuleManifest` — left for your call, see below;
+ an exhaustiveness `throw new Error` → `assertNever`, CURED). What's left is a genuine policy
call about INTERNAL tooling, so it lands here.

**Two coupled questions + my defaults (NOT yet applied — gauntlet stays red on these so the
choice is visible):**
1. **no-bare-throw in leaf scripts (31 findings, mostly L1 reports/bench/changelog):** default
   = SCOPE the contract to shipped/handled code (exempt pure-L1 leaf scripts; a `throw new
   Error('usage')` that aborts a build tool has no catcher needing a `_tag`). KEEP it for any
   script that GENERATES code/artifacts (capsule-compile's exhaustiveness already cured this
   way). Alternative if you want zero-exceptions: migrate all 31 to `@czap/error`.
2. **Script timing + the `generatedAt` provenance convention (~14 no-nondeterminism + the
   manifest stamp):** `generatedAt: new Date().toISOString()` is a DELIBERATE, monorepo-wide
   provenance field (`WallClockTimestamp` brand, ~20 sites) that `artifact-verifiers.ts`
   ALREADY decoupled from identity ("CUT generated-time-ordering … false-failed on benign
   clock skew … dropped"). So it's the declared provenance boundary, not a bug. Default =
   either route script timing/provenance through `wallClock` (couples build scripts to
   `@czap/core`) OR waive the L3-script measurement sites as the declared boundary. I did NOT
   touch the `generatedAt` convention — restructuring a pervasive artifact shape is exactly the
   "docs/artifacts are sacred, don't restructure autonomously" line; it needs your nod.

**How to apply once you choose:** (1) is a one-line scope predicate in the no-bare-throw gate
(or a class of waivers); (2) is either a `wallClock` thread through the named scripts or a
block of measurement-boundary waivers. Either way nothing in the shipped runtime changes.

<!-- entries appended here as they arise -->
