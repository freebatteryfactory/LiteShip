# LiteShip — engineering skill (battle scars, evergreen)

This file is the **tacit knowledge** for working on LiteShip: the laws we learned
by breaking things, abstracted so they outlive any one version. No public training
data covers this codebase — the reasoning below is the difference between an agent
that helps and one that quietly reintroduces a scar we already paid for.

Read it before you change engine code, records, or docs. It is deliberately about
_how to reason here_, not _where things live_ — for that, start at
[AGENTS.md](./AGENTS.md) → [DOCS.md](./DOCS.md).

The through-line: **LiteShip is a multimedia-native adaptive UI compiler/runtime — not
a component library — whose mortal enemy is silent drift.** One definition projects to CSS, GPU, ARIA, TypeScript, AI manifests,
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
**build the behavior up to the claim** — it is often a few LOC of plumbing or types —
_not_ to water the claim down to the code. Agents still pay for unnecessary ontology
through context, tokens, latency, and review opacity, so semantic compression matters.
Connecting the things is usually less debt than the retreat. Reserve doc-softening for
claims that are genuinely wrong in intent, not merely ahead of the wiring. Fix the doc
when the doc is behind _safer_ code; build the code when the doc states the real target.

### 3. Fix the root, never fence it

Measure the blast radius before you touch anything. A guard that fences a real bug and
defers the cure is laundering — never offer "defer" as the recommended path. Corollary:
when a newly-tightened contract exposes a flake, it **surfaced a real one** — sweep the
affected ownership surface with the smallest deterministic proofs, then let the
conservative affected selector fail broad when its closure is uncertain. Don't loosen
the contract.

### 4. Definition labels and integrity witnesses are different laws

`ContentAddress` is LiteShip's existing non-adversarial definition label: FNV-1a over
canonical CBOR, used for local equality, memoization, drift detection, and compact
provenance. It is deterministic, not cryptographic. `IntegrityDigest` (or the paired
`AddressedDigest`) is mandatory when bytes cross a trust boundary: external artifacts,
attacker-influenced caches, wire validation, security decisions, and release evidence.
FNV alone must never authorize or validate hostile input. A content-derived label
self-invalidates on payload change — that is a feature for definition caches and a bug
for _stable_ names (marker names and logical keys derive from a stable key). Digests
that gate a 304 must exclude mutable `meta`, or the 304 lies.

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

### 16. Completeness is machine-defined — "done" is a green gate, not a model's word

An **active** modeled surface whose load-bearing fields no interpreter/lowerer/runtime
path reads is a **blocking** Finding — dead data inside a live type (a `TransitionNode`
with `routing`/`durationMs` that nothing reads). Do not phase a declaration ahead of its
consumer; that is how orphaned turtles are born. "Done" is not a doc, an issue, or an
agent saying so — it is: the compiler names the types, the gauntlet proves the fields are
read, and a **red fixture reproduces the orphan** the gate prevents. No default cases on
must-handle unions (exhaustive + `assertNever` → an unhandled arm is a red compiler). The
obligation list **derives from the type unions and exported source** — never a
hand-maintained second list of symbol names (that is a drift-prone mirror; where a
contract must name a symbol, reference the real imported symbol, not a string).

**Mechanical certainties block; heuristics advise.** A field-level orphan blocks; a
high-ambition/low-proof smell is a diagnostic/watch until it becomes mechanical. That line
keeps the gauntlet a seatbelt, not a cage — which is the whole point of the rigor
taxonomy (name a thing by what it may do, so not everything becomes an "invariant"):

- **Law** — never break (security, graph identity, validation, no silent drift); blocking.
- **Contract** — a public/accepted promise; blocking when violated.
- **Receipt** — evidence that something happened.
- **Diagnostic** — a loud signal; not always blocking.
- **Watch item** — a known risk under observation; promotable to Law.
- **Recipe** — an example; never blocks completeness.
- **Preset** — data over canonical intent; never behavior authority.

Reuse the engine, sharpen the oracle: the gauntlet already has the authority ratchet
(gates earn blocking only via red/green/mutation fixtures), FactGate, the evidence
recorder, and symbol-level orphan detection. The gap is field-level — see #132. And the
gate proves **wired, not correct**: semantic correctness stays with red-green + a
differential oracle, never the compiler alone.

Qualification also covers the gate's **subjects**, not only its planted fixtures. A
`GateProof` must report a deterministic complete census (enumerator, count, and digest)
or explicitly report that its subject coverage is opaque. A required gate with opaque
coverage is an unwaivable authority-integrity failure: a detector that cannot enumerate
what it governs has not earned the right to claim the release is complete. Feature-edge
families derive producers and consumers from their canonical executable catalogs (typed
ECS Parts/systems, command and MCP registries, protocol event owners), then the shared
connectivity gate checks the projection. Do not substitute a hand-maintained list or a
string scan for a source-owned catalog merely because the scan is easier to write.

**Lean on the compiler first — the gate is the backstop, not the front line.** Push each
completeness obligation as high as it will go before it becomes a gauntlet fact: make it
_unrepresentable_ (a node family you can't add to the union without its interpreter case;
a signal typed `discrete | continuous` so a continuous value cannot type-pass into a
replay path — which makes the old-brain "widen the SSE replay payload" fix _uncompilable_),
then _uncompilable_ (exhaustive unions + `assertNever`; a typed `dispatchLiteshipEvent(name,
detail)` over a source-derived event union, so a fabricated event name like
`liteship:stream-reconnecting` is a compile error, not a shipped bug), and only then
_unmergeable_ (#132 reachability, for the cross-module cases types can't see). **Generate**
docs and wire-contracts from the typed source so drift is impossible by construction —
never a prose mirror to police. Keep the types load-bearing and readable: a type-level
metaprogramming cathedral is its own ceremony. The proof-brain asks not "did a test pass"
but "is every active modeled surface completed by a reader/projection" — **projection must
complete.**

### 17. One vertical proof packet, not a pile of patches

A risk-bearing change travels as one owner-sized packet: behavioral law, planted red
control, root implementation, focused unit/integration proof, property/model/differential
generalization where the law permits it, adversarial proof where the failure mode needs
it, observable diagnostic/receipt, and refactor-proof assertion over public behavior or
canonical bytes. Proof class follows risk; ceremony does not earn authority.

### 18. Evidence is execution-qualified

A file named `fuzz`, `chaos`, `property`, `mutation`, or `benchmark` proves nothing by
existing. Its receipt must show that the subject ran and that the class had semantic
teeth: generated diversity and shrinking, injected faults and observed steady-state,
created and killed mutants, independent differential provenance, or measured benchmark
work. A skipped or unexecuted authority remains visible and non-green.

### 19. Every escaped red becomes a replayable CurePacket

Read the exact failure before editing. Preserve the seed/input, minimized reproducer,
platform and toolchain, failing obligation, owner, diagnostic tail, and evidence paths.
Fix the root, then retain the smallest deterministic replay in the cheap lane. Never
blind-rerun, relabel, waive, or loosen a gate merely because the cloud found the defect.

### 20. Affected selection is an optimization, never an authority downgrade

The selector maps changed implementation and support evidence to executable owners.
Support files are not test entrypoints; they reverse-close to the suites that import
them. Unknown paths, stale calibration, selector misses, and changes to global authority
fail broad. Persist the selected plan and result evidence so another process can verify
what ran, what skipped, and why.

### 21. Final authority belongs to one frozen head

During implementation, run focused deterministic proofs and caged generation at owner
boundaries. At freeze, push one coherent SHA, let affected CI finish, cure exact failures,
then run one complete cloud authority. Standards snapshots move only after functional
green and explicit owner review; the post-snapshot SHA receives the complete authority
again. Historical green never certifies a newer head.

---

## Operating hazards (workstation safety)

These are evergreen because they follow from what the commands _are_, not from any
machine:

- **`gauntlet:full` is CI-grade.** It is the full ~40-min truth suite (browser lanes,
  coverage merge, stress). Do **not** run it casually on a workstation — it has crashed
  boxes. Use `pnpm preflight --staged` plus the packet's focused tests. Run individual
  dependency-boundary checks once; reserve the complete gauntlet for cloud/frozen-head
  authority.
- **Use the resource planner before heavyweight local work.** `pnpm resources:plan`
  samples the host and current load. `pnpm preflight --staged` applies the admitted
  native-TypeScript worker cap and skips TypeDoc when staged inputs cannot affect it.
- **TypeDoc is memory-hungry.** Prefer `pnpm run docs:check:local`; it reuses a current
  local proof and otherwise invokes the caged docs authority. Run docs alone at the
  projection boundary. Set `LITESHIP_DOCS_USE_SWAP=1` only to admit the explicit
  swap-backed profile—the proof is delayed or caged, never skipped.
- **Never SIGKILL the vitest suite.** `capsule-verify` mutates real source with a
  `finally`-restore; killing it mid-run can strand the mutant in your tree. If it
  happens, stop and inspect the exact diff and capsule receipt. Do not run a broad
  restore over user work; recover only the proven mutated path with maintainer approval.
- **Docs/asset-only changes use the affected PR authority; they never bypass it.** The
  affected planner should select the cheap documentation and projection checks needed
  by the changed surface, while changes to global CI authority deliberately fail broad.
  Never disable the workflow, add a ruleset bypass, or direct-push around evidence to
  save compute. If the selected plan is unexpectedly broad, fix or calibrate the
  planner with a negative control instead of skipping the run.
- **Do not run a CI watcher/rerun loop.** Observe state changes, wait for the authority to
  finish, then read the exact logs and artifacts once. Intermediate yellow is research,
  not permission to start speculative edits.

---

## Where this points

- [AGENTS.md](./AGENTS.md) — entry point; canonical docs + the grep-first discovery index.
- [DOCS.md](./DOCS.md) — the documentation map (start here for "where does X live").
- [ARCHITECTURE.md](./ARCHITECTURE.md) — the document-graph IR and the package DAG every
  surface casts from.
- [ROADMAP.md](./ROADMAP.md) — open upstream/engine work, source-anchored and impl-ready.
- [STATUS.md](./STATUS.md) — what is green right now (the reality document).
- [SECURITY.md](./SECURITY.md) — trust boundaries, the HTML/URL sinks, CSP/TT posture.
