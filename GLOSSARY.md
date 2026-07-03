# LiteShip documentation glossary

Vocabulary for prose across this repository. Technical identifiers (`Boundary`, `@czap/core`, `czapMiddleware`, `--czap-*`, `host-wired`, CLI `czap`, ...) stay exactly as shipped; this file governs surrounding language only.

## The shape

<!-- BEGIN DIAGRAM (canonical mental model — keep byte-identical across README / GLOSSARY / AUTHORING-MODEL; pinned by tests/unit/meta/diagram-drift.test.ts) -->

```text
signal ─▶ boundary ─▶ graph ─▶ cast ─▶ patch
```

- **signal** — a continuous input from the world (viewport, scroll, audio…)
- **boundary** — quantizes it into a few named states
- **graph** — seals boundaries, tokens, and styles into one content-addressed truth
- **cast** — projects (verb) that truth to CSS, GPU, ARIA, AI, TypeScript, and video
- **patch** — the only way to change the truth: a validated mutation

<!-- END DIAGRAM -->

## Three-layer naming

| Layer | Use when |
| --- | --- |
| **LiteShip** | Product and distribution: what readers adopt, what README hooks name, social posts. |
| **CZAP** | Engine name (Content-Zoned Adaptive Projection, "see-zap"): architecture, ADRs, how projection and zones work. |
| **`@czap/*`** | npm namespace only: install lines, imports, package lists. Never renamed. |

**Canonical sentence:** *LiteShip — powered by the CZAP engine, distributed as `@czap/*` packages on npm.*

## Primitives (prose register)

| Term | Consistent description |
| --- | --- |
| **Boundaries** | Rig, tension, set. Where continuous signals partition into named bearings. Avoid *wire* for boundaries in prose. |
| **Tokens** | Materials of the design language: axes, fallbacks, craft vocabulary. |
| **Styles** | Named-state outputs: what casts or projects when a boundary's bearing changes. |
| **Themes** | Coordinated variants: how materials re-trim when the presentation mode shifts. |
| **Compile path** | Cast to CSS, project to GLSL / WGSL / ARIA / AI. Not "compile" in casual prose if a register verb fits. |
| **Runtime / hot path** | Working deck, working line, thrust / photon language for trim and off-main-thread work; off-deck or engine room for workers. |

## Substrate & cast vocabulary (prose register)

Terms-of-art for the IR and the cast machinery. Pin the meaning; do not translate by surface form.

| Term | Consistent description |
| --- | --- |
| **Document graph** | `@czap/core`'s content-addressed IR: a graph of typed nodes that authored definitions seal into, and that every cast target reads from. The keystone. Capitalize as a proper noun for the symbol (`DocumentGraph`); lowercase "document graph" in running prose. |
| **Node family** | One of the eight node kinds a document graph holds: `signal`, `entity`, `component`, `pose`, `transition`, `projection`, `policy`, `export`. A closed union — adding one is a typed change, not a copy-paste. |
| **Signal source** | The canonical vocabulary for what drives a boundary: `SignalSource` (the typed union in `@czap/core`) is the source of truth, and `sourceToInput` / `inputToSource` round-trip its serialized input forms — the dot-string axes (`viewport.width`, `scroll.progress`, `audio.amplitude` / `audio.beat`) and the colon-delimited free-form payloads (`media:<query>`, `custom:<id>`). Every domain reads through it rather than re-parsing input strings. |
| **Cast target** | A surface a definition casts to: CSS, GLSL, WGSL, ARIA, AI manifest, video. "Cast" is the verb (always with a target); "surface" is the noun the cast emits to. |
| **Escalation rung** | A runtime tier a projection may be admitted to under a policy + frame budget. `chooseRung` returns the admitted target set; a surface over budget drops to a cheaper rung. Not "level" in prose. |
| **tier / tiers** | The capability triple resolved at the edge — `tier` (device capability), `motion`, `design` — keyed by axis. Emitted on `<html>` as `data-czap-<axis>` and exposed typed on `Astro.locals.czap.tiers`; the axis name is the single source (`CAP_AXES`), so the attribute and the locals field can't disagree. "tier" alone is the capability axis; "tiers" the triple. |
| **Capsule** | A unit of reusable assembly built from the closed set of factory arms (ADR-0008). A property test plus a budgeted bench, not a component. "Capsule-ize" = lock a behavior as a standing capsule. |
| **GraphPatch** | The one typed mutation over a document graph: propose -> validate -> apply -> re-seal. The editor and the AI cast both mutate *through* it; nothing edits node maps by hand. |
| **ValidatedProposal / ApplyToken** | The AI-cast security envelope. A `ValidatedProposal` is what a validator mints; the `ApplyToken` it carries is the unforgeable witness that `applyValidatedPatch` demands. Describe it as an *envelope* or *witness*, never "permission" or "key". |
| **Mutation channel** | The client→server return leg: a remote client proposes a `GraphPatch` and the server validates it through the same refuse-seam before applying (`handleGraphMutation` in `@czap/core`, `graphMutationRoute` in `@czap/astro`). Three outcomes — `applied`, `refused`, `error`; a compare-and-swap on `saveGraph` makes optimistic concurrency free. The host owns the store and the route (the authority boundary). Not a general RPC layer — one validated graph-patch seam. |
| **seal / address** | `sealNode` / `sealGraph` mint a node's content address from its canonical bytes. "Seal" = assign identity; "re-seal" = re-address after a patch. Distinct from the unrelated "seal" (close) sense. |
| **content address (CBOR / FNV-1a)** | A definition's identity: the **FNV-1a** hash of its **canonical CBOR** bytes — a deterministic binary encoding (RFC 8949 §4.2.1; ADR-0003 for the why). Identical definitions produce an identical address, so a cast computed once is provably correct on every surface. CBOR is the byte format; FNV-1a is the hash; together they are the address. |
| **host-wired** | A package's runtime status: it is instantiated and driven by a host (Astro, a worker, the edge), not imported and run by app code on its own. Contrast `standalone` (runs anywhere) and `standalone subsystem`. The status tag in PACKAGE-SURFACES. |
| **ECS** | Entity-Component-System — the composition model `@czap/scene` uses: a scene is a world of entities, each carrying components, advanced by systems once per tick. Chosen so video / audio / transition / effect tracks compose without per-track glue (ADR-0009). |
| **DirtyFlags** | A bit-packed change-tracker on the hot path: up to 31 keys ride in one integer for allocation-free dirty checks; past 31 it falls back to a map. An instance of the "honest fallback past its regime" discipline (ADR-0002). |

## Banned in marketing-style prose

*next-generation, leverage, robust, powerful, seamless, blazingly fast, cutting-edge, world-class, enterprise-grade, paradigm-shifting, game-changing, revolutionary, unleash, supercharge, harness the power of.* Replace with concrete behavior, or cut.

## Translator notes

A few terms in this corpus are polysemous; future i18n / machine-translation work should treat them as terms-of-art and pin the meaning rather than translate by surface form:

- **cast** — verb only, "project a definition into a target output surface" (CSS, GLSL, ARIA, etc.). Not the noun (theatrical cast) and not type-coercion (`as` casting). Always carries a target.
- **rig** — both verb ("rig a boundary") and noun ("the rig is in between"). The system that ties continuous signals to named bearings. Not the unrelated rigging-of-results sense.
- **surface** — noun, "a runtime target the compiler emits to" (CSS surface, ARIA surface). Not the verb sense (something coming to attention).
- **bearing** — noun, "a named discrete state a boundary partitions to" (one of `mobile/tablet/desktop`, etc.). Not the mechanical-bearing or the comportment sense.
- **trim** — runtime-cost language: "kept the working deck trim" = "kept the runtime cost low."

## Maritime register (CLI surface)

User-facing CLI strings (`czap doctor`, `pnpm shakedown`, postinstall, clean, dispatch errors) draw from one consistent shipyard vocabulary. Authors of new CLI output should pull from here rather than invent register on the fly. The lint test `tests/unit/cli/glossary-lint.test.ts` enforces that every term used in CLI source is defined here and in `czap glossary`.

| Term | Meaning | Where it appears |
| --- | --- | --- |
| **hull** | The built `dist/` artifact of a package. "Hull not yet laid" = no `dist/` on disk. "Hull check" = the rolled-up status emitted by `czap doctor`. | `czap doctor` verdict; `bin/czap.mjs` not-yet-built error |
| **keel** | The TypeScript build output. "Lay the keel" = run `pnpm run build`. The first thing you put down before anything else floats. | `czap doctor` hints |
| **cast off** | Begin the run: leave the dock. Used for first actions after install ("Cast off with: pnpm shakedown") and for non-blocking caution states. | postinstall banner; `czap doctor` verdict; workspace-install hint |
| **moored** | Installed but not yet underway. Immediately after `pnpm install` — `node_modules` present, build / test not run. | `scripts/postinstall.ts` |
| **shake-down** | First-run aggregate (`pnpm shakedown`). Runs doctor → build → test on a new hull. The npm-script is named `shakedown` rather than `setup` because `pnpm setup` is pnpm's built-in installer command — a collision that would have run the wrong thing for every new contributor following the docs. | `scripts/setup.ts` phase headers |
| **dry-dock** | Clean state. `pnpm clean` wipes `dist/`, `coverage/`, `reports/`, `.tsbuildinfo`. | `scripts/clean.ts` |
| **deck plan** | The npm-scripts catalogue (`pnpm scripts`). Grouped by purpose. | `scripts/scripts-index.ts` header |
| **chart** | The CLI verb table (`czap help`). Map of bearings — what verb does what. | `czap help` header; dispatch unknown-command error |
| **rig** *(verb)* | Install or wire infrastructure into place. "Rig the pre-commit hook" = link `.git/hooks/pre-commit`. Distinct from the noun "rig" (the boundary system). | `czap doctor` git-hook hint |
| **stow** | Pack a downloaded artifact into its expected location. "Stow the browsers" = `pnpm exec playwright install`. "Stow Rust" = install via rustup. | `czap doctor` Playwright / WASM hints |
| **quay** | The release surface. Where a package ties up before shipping to npm. "Tied up at the quay" = packed and capsule written, awaiting `npm publish`. | `czap help` "Ship out (quay-side, release)" section + release hint |
| **bearing** *(verdict sense)* | One of `ok` / `warn` / `fail` for a probe; or `ready` / `caution` / `blocked` for the rolled-up verdict. Same metaphor as the boundary-bearing primitive — a discrete state projected from a continuous signal. | `czap doctor` receipts |

## Time semantics (two clocks, one rule)

A `timestamp` field names *which* clock by its TYPE, never by the bare word. The two must never be confused — one bears identity, one does not.

| Term | What it is | Contract |
| --- | --- | --- |
| **HLC** *(causal clock)* | A hybrid logical clock `{wall_ms, counter, node_id}` (`@czap/core` `HLC`). | Ordered + monotonic. **Included** in the receipt hash (`hashEnvelope`) and validated by the chain (`hlc_not_increasing`). Identity- and ordering-bearing. The capsule's `generated_at` is an HLC. |
| **WallClockTimestamp** *(wall clock)* | A volatile ISO-8601 string stamped when a result is produced (`@czap/core` `WallClockTimestamp`). | **Excluded** from `resultId`; never used for causal ordering. Provenance/display only. The `timestamp` on CLI / MCP / command receipts AND the `generatedAt` on report/artifact shapes are this. |
| **media / performance time** | Frame presentation time (µs/ms) or `performance.now()` relative ms. | A different axis entirely — not a clock for identity or causality. Out of the HLC↔wall-clock split. |

Rule: an identity-adjacent command/result type must type a volatile stamp as `WallClockTimestamp` (or `HLC` for a causal one) — never a bare `timestamp: string`. Wiring a wall clock where an HLC belongs corrupts identity; the type names the contract so it can't happen silently.

The two generated-time names follow the same rule by their TYPE, not by being renamed:

- **`generated_at`** (snake_case) — the ship-capsule's HLC: causal, public, **identity-bearing** (hashed into the content address). Preserve it.
- **`generatedAt`** (camelCase) — report/artifact provenance: a volatile `WallClockTimestamp`. Stable field key, typed as the alias.

For *same-run coherence* of gauntlet artifacts, the authoritative signal is **`gauntletRunId`** (a per-run UUID stamped into every artifact), NOT a `generatedAt` comparison. Any `Date.parse(generatedAt)` vs file-mtime check is a secondary wall-clock heuristic, not causal proof.

## Gauntlet & rigor engine (prose register)

The vocabulary of `@czap/gauntlet` ([AUDIT.md](./AUDIT.md), [ADR-0023](./docs/adr/0023-gauntlet-rigor-engine.md)).

- **gauntlet** — the self-proving rigor engine; the gate set + the runner that qualifies them.
- **gate** — a `(context) → Finding[]` fitness function; earns blocking authority only by self-proof.
- **FactGate** — a gate whose decision is DATA over a declared FactPack (vs a closure), so it cannot read undeclared evidence ([ADR-0019](./docs/adr/0019-factgate-evidence-bound-gates.md)). Built by `defineFactGate`; the discriminant is an unforgeable `WeakSet`, not a string.
- **producer / kernel** — a FactGate's two halves: the producer does acquisition + normalization (host-side); the kernel is the bounded, data-only decision.
- **assurance level** — L0–L4; the hazard model that aims a gate's rigor. Authority decides the level, not folder location.
- **finding** — a gate's emitted result (`ruleId`, severity, level, location, remediation).
- **authority ratchet** — a gate is `advisory` until it self-proves red/green/mutation, then `blocking`. Authority is earned, not granted.
- **evidence digest** — the out-of-IR bytes a gate's verdict depends on, folded into the verdict-cache key. A FactGate derives it from its declared channels; a closure gate must author it.
- **green is not clean** — the standing discipline: a passing gauntlet means only that the gates that ran, on the surfaces they scanned, found nothing — never that the repo is correct.

## Drift check

After editing docs, run the sweep: mixed boundary verbs (*wire* vs *rig*), banned words, accidental rename of `@czap/*` or public APIs. The glossary holds; the prose comes back to it.
