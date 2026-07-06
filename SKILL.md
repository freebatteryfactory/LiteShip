# LiteShip — engineering skill (battle scars, evergreen)

This file is the **tacit knowledge** for working on LiteShip: the laws we learned
by breaking things, abstracted so they outlive any one version. No public training
data covers this codebase — the reasoning below is the difference between an agent
that helps and one that quietly reintroduces a scar we already paid for.

Read it before you change engine code, records, or docs. It is deliberately about
_how to reason here_, not _where things live_ — for that, start at
[AGENTS.md](./AGENTS.md) → [DOCS.md](./DOCS.md).

The through-line: **LiteShip is an adaptive projection engine whose mortal enemy is
silent drift.** One definition projects to CSS, GPU, ARIA, TypeScript, AI manifests,
and SSR. The dangerous failure is never a crash — it is one surface quietly ceasing
to match another while the UI smiles like nothing is wrong. Every law below is a way
of refusing that.

---

## The laws

### 1. No silent drift — loud, or refused, never quietly wrong

A projection cannot lie quietly. Every fallback names its reason; every derived
surface carries provenance; every trust widening is explicit. When behavior can
degrade silently (a frozen shader clock, a synthetic default tier, a shadowed
boundary style), the fix is to make it **loud** (a diagnostic) or **unrepresentable**
(a type that can't express the wrong call) — not to document the footgun. This is the
whole product thesis; the other laws are how you keep it.

### 2. Complete, don't nerf

When a doc, type, or intent claims more than the code delivers, the default cure is to
**build the behavior up to the claim** — it is almost always a few LOC of plumbing or
types — _not_ to water the claim down to the code. Nerfing only looks easier because
human best-practice optimizes for cognitive load; an agent isn't paying that tax.
Connecting the things is usually less code than the retreat. Reserve doc-softening for
claims that are genuinely wrong in intent, not merely ahead of the wiring. Fix the doc
when the doc is behind _safer_ code; build the code when the doc states the real target.

### 3. Fix the root, never fence it

Measure the blast radius before you touch anything. A guard that fences a real bug and
defers the cure is laundering — never offer "defer" as the recommended path. Corollary:
when a newly-tightened contract exposes a flake, it **surfaced a real one** — sweep the
whole affected surface locally, don't loosen the contract.

### 4. Identity is a sha256 content-address, never a weak hash

Anything security- or cache-key-bearing keys on the canonical digest. `fnv1a` is fine
for internal maps and dirty-tracking; it is a silent-stale / cache-poisoning vector the
moment it becomes a wire validator or a cache key over attacker-influenced input. A
content-address self-invalidates on payload change — that is a feature for cache keys and
a bug for _stable_ names (marker names, logical keys derive from a stable key, not a
content-address). Digests that gate a 304 must exclude mutable `meta`, or the 304 lies.

### 5. Clock substrate law

`systemClock` (monotonic → durations) and `wallClock` (epoch → timestamps/HLC) are
different substrates; conflating them is a determinism bug. Inject `clock?` / `rng?`
rather than reading ambient time or randomness. Module-scope `new Date()` / `Date.now()`
in a Workers-targeted bundle reads frozen/epoch time (the 1970 trap) — ambient state is
poison unless explicitly injected.

### 6. One source + a drift guard that derives `expected` from the source

Hand-mirrored lists rot silently and diverge across environments (the dev-vs-prod header
scar). Any fact that lives in two places needs a single source and a guard — and the
guard must compute its `expected` value **from the source of truth**, never from the
thing under test, or it proves nothing. Verify the _production_ path, not just dev.

### 7. Composition over inheritance

No class hierarchies. Data is `_tag`ed discriminated unions; behavior is standalone
composable functions over open structural contracts. If you reach for `extends`, stop.

### 8. No placeholders, ever

`TODO`, pseudocode, `it.skip`, "stub for now" — all blocking, zero exceptions.
Grandfathering incomplete work is laundering. A thing is done or it is not in the tree.

### 9. Green gates are necessary, not sufficient

A passing gauntlet does not mean a correct repo. Triangulate with an independent
adversarial oracle before claiming done. "Honest / plausibly / likely / CI will confirm"
is a handwaving tell — name the cause, or say plainly you can't reproduce it and dig.

### 10. External finding-lists rot — re-baseline against source before recording

Before you write down any externally-supplied gap, defect, or "audit," open the cited
source and confirm it still holds today. Historically most external lists arrive largely
stale or inverted (the consumer wins where the report says the framework does). Record
the source-verified version, with a file anchor, or don't record it.

### 11. The upstream full-send checklist

Before promoting a dogfood finding into engine work, it must pass all four:
**loud-not-silent** (the failure announces itself) · **plumbed-or-bounded** (wired end to
end, or explicitly scoped) · **regression-gated** (a test pins it) · **in-scope-by-construction**
(it belongs to a primitive, not a UI-kit convenience). Items that fail the last test are
owner design forks, not intake nods — flag them, don't quietly adopt them.

### 12. Docs are load-bearing plumbing — and sacred

A subsystem isn't done until it's in the prose chain
(README → GETTING-STARTED → ARCHITECTURE → DOCS → PACKAGE-SURFACES, plus an ADR and a
GLOSSARY entry). But **never restructure, rename, or move docs autonomously** — confirm
the exact plan first; this overrides autonomy. Prefer a link to a drift-prone prose
mirror ([AGENTS.md](./AGENTS.md) is deliberately thin for this reason). When docs and
code disagree, trust [STATUS.md](./STATUS.md) for repo state, package source for runtime
behavior, and tests for executable truth.

### 13. Boundary CSS is self-contained

`CompiledOutputs.css` is the FULL, ordered stylesheet. Sibling fields
(`propertyRegistrations`, `containerQueries`) are **mirrors**, not additive parts —
prepending them onto `css` double-emits. If a serializer conditionally prepends them,
that condition is load-bearing; reassert "emit only `css`" whenever it drifts.

### 14. Pin laws, not implementations

Tests are property-based (fast-check) and anti-fragile: they pin the invariant, not the
current code path. A test that breaks when you refactor _without_ changing behavior was
testing the wrong thing.

### 15. The trust seam: validate before apply, host owns authority

The model may propose; the validator disposes. A `GraphPatch` proposal is validated and
only a valid one changes the graph — an invalid proposal leaves the graph byte-identical.
HTML flows route through the one trust pipeline (`createHtmlFragment`); URL sinks go
through one scheme-canonicalizing check (strip `[\t\n\r]` before comparing schemes — the
URL parser strips them, so a naive `startsWith` is bypassable). Never add a second HTML
authority or a second unguarded `innerHTML` path. New platform primitives (QUERY, DPU)
are adopted _under_ these seams, never beside them.

---

## Operating hazards (workstation safety)

These are evergreen because they follow from what the commands _are_, not from any
machine:

- **`gauntlet:full` is CI-grade.** It is the full ~40-min truth suite (browser lanes,
  coverage merge, stress). Do **not** run it casually on a workstation — it has crashed
  boxes. Local-safe verification = `build` · `typecheck` · `lint` ·
  `check-invariants` · the vitest suite · individual gates run one at a time.
- **TypeDoc is memory-hungry.** `docs:build` _and_ `docs:check` both regenerate TypeDoc.
  Memory-cage them (`systemd-run --user --scope -p MemoryMax=8G` +
  `NODE_OPTIONS=--max-old-space-size=…`), run them alone, and only after the rest of
  verification is green.
- **Never SIGKILL the vitest suite.** `capsule-verify` mutates real source with a
  `finally`-restore; killing it mid-run strands the mutant in your tree. If it happens,
  recover with `git checkout` on the affected package and rebuild — don't debug the
  mutant as if it were your code.
- **Docs/asset-only changes burn zero CI.** Every push to `main` and every PR triggers
  the full `ci.yml`. For docs-only work the sanctioned path is the direct-push recipe:
  disable `ci.yml` → add the repo-admin ruleset bypass → commit on `main` (the local
  pre-commit quick-verify still runs, and is free) → push → confirm no run was created
  for the new sha → **restore the bypass and re-enable `ci.yml` immediately**. Never
  leave the repo ungated. Ask before opening a docs _PR_ — the PR-open run is
  unrecoverable.

---

## Where this points

- [AGENTS.md](./AGENTS.md) — entry point; canonical docs + the grep-first discovery index.
- [DOCS.md](./DOCS.md) — the documentation map (start here for "where does X live").
- [ARCHITECTURE.md](./ARCHITECTURE.md) — the document-graph IR and the package DAG every
  surface casts from.
- [ROADMAP.md](./ROADMAP.md) — open upstream/engine work, source-anchored and impl-ready.
- [STATUS.md](./STATUS.md) — what is green right now (the reality document).
- [SECURITY.md](./SECURITY.md) — trust boundaries, the HTML/URL sinks, CSP/TT posture.
