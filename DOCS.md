# LiteShip documentation map

This file is the shortest route to the right document.

Use it as the entry point for humans and agents.

Shared vocabulary (LiteShip / CZAP / `@czap/*`): [GLOSSARY.md](./GLOSSARY.md).

---

## Four layers

Docs sort into four layers by how deep you're going. Stop at the one that answers you.

1. **Use** — build a page. [GETTING-STARTED.md](./GETTING-STARTED.md) · `npm create liteship`.
2. **Author** — tokens, styles, themes, casts. [AUTHORING-MODEL.md](./AUTHORING-MODEL.md).
3. **Extend / host** — Astro, Vite, edge, workers, AI. [PACKAGE-SURFACES.md](./PACKAGE-SURFACES.md) · [HOSTING.md](./HOSTING.md).
4. **Engine room** — the IR, the package DAG, the gauntlet. [ARCHITECTURE.md](./ARCHITECTURE.md) · [CONTRIBUTING.md](./CONTRIBUTING.md).

## Start Here

### If the question is "What is LiteShip?"

Read [ASTRO-STATIC-MENTAL-MODEL.md](./ASTRO-STATIC-MENTAL-MODEL.md), then
[ARCHITECTURE.md](./ARCHITECTURE.md).

Together these explain the ontology and the package shape:

- signals
- boundaries
- named states
- outputs
- package DAG
- projection targets
- Vite and Astro positioning
- scene, asset, CLI, and MCP surfaces

### If the question is "What is the philosophy behind the runtime?"

Read [ADR-0002 zero-alloc](./docs/adr/0002-zero-alloc.md) and
[ADR-0004 plan/coordinator](./docs/adr/0004-plan-coordinator.md).

These are the performance and capability decisions:

- cheapest-valid runtime
- zero-allocation hot path (pool, dirty, dense ECS, microtask batching)
- per-tick phase sequencing

### If the question is "What is the IR everything casts from?"

Read [ARCHITECTURE.md](./ARCHITECTURE.md) — "Document graph (the IR)" and "AI cast" — then
[ADR-0015 document graph IR](./docs/adr/0015-document-graph-ir.md).

This is the keystone:

- the content-addressed document graph (eight node families)
- `GraphPatch`, the one typed mutation path
- the AI cast envelope (validate before apply, never the reverse)

### If the question is "How should I think with this on a visually rich Astro site?"

Read [ASTRO-STATIC-MENTAL-MODEL.md](./ASTRO-STATIC-MENTAL-MODEL.md).

This is the theory-first authoring frame:

- signals
- boundaries
- named states
- outputs
- Astro as document host

### If the question is "How do I author definitions and compose surfaces?"

Read [AUTHORING-MODEL.md](./AUTHORING-MODEL.md).

This is the mechanics layer:

- definitions
- file shapes
- boundaries, tokens, themes, styles
- naming and composition rules

### If the question is "How does Astro host and run this?"

Read [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md).

This is the LiteShip host layer (Astro + CZAP runtime):

- integration
- middleware
- server-resolved initial state
- client directives
- runtime escalation

### If the question is "Which package should I reach for?"

Read [PACKAGE-SURFACES.md](./PACKAGE-SURFACES.md).

This is the public surface map:

- package-by-package exports
- what each package owns
- what to import for which job

### If the question is "What is green right now?"

Read [STATUS.md](./STATUS.md).

This is the reality document:

- gates
- coverage
- benchmark policy
- current limitations

### If the question is "Where is the project headed?"

Read [ROADMAP.md](./ROADMAP.md).

### If the question is "What changed?"

Read [CHANGELOG.md](./CHANGELOG.md). For shipping npm/GitHub releases, see
[RELEASING.md](./RELEASING.md).

---

## Reading paths by reader

### If you're new (theory-first arc)

1. [GLOSSARY.md](./GLOSSARY.md): LiteShip / CZAP / `@czap/*` + prose register (short; read once)
2. [ASTRO-STATIC-MENTAL-MODEL.md](./ASTRO-STATIC-MENTAL-MODEL.md)
3. [ARCHITECTURE.md](./ARCHITECTURE.md)
4. [ADR-0002 zero-alloc](./docs/adr/0002-zero-alloc.md) + [ADR-0004 plan/coordinator](./docs/adr/0004-plan-coordinator.md)
5. [AUTHORING-MODEL.md](./AUTHORING-MODEL.md)
6. [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md)
7. [PACKAGE-SURFACES.md](./PACKAGE-SURFACES.md)
8. [STATUS.md](./STATUS.md)

### If you're authoring with LiteShip in your app

1. [GETTING-STARTED.md](./GETTING-STARTED.md): add LiteShip to your project and reach a runnable boundary in about five minutes
2. [AUTHORING-MODEL.md](./AUTHORING-MODEL.md): the shape of day-to-day authoring
3. [PACKAGE-SURFACES.md](./PACKAGE-SURFACES.md): which package owns what you need to import
4. [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md): when escalation makes sense
5. tests and package source for exact behavior

### If you're contributing to LiteShip

1. [ARCHITECTURE.md](./ARCHITECTURE.md): the package DAG and where things live
2. [ADR-0001 namespace pattern](./docs/adr/0001-namespace-pattern.md) + [ADR-0002 zero-alloc](./docs/adr/0002-zero-alloc.md): the load-bearing conventions
3. [AUDIT.md](./AUDIT.md): the advisory pipeline that watches for drift
4. [STATUS.md](./STATUS.md): live gates, watch items, runtime seam hotspots
5. [../CONTRIBUTING.md](./CONTRIBUTING.md): the gauntlet, PR conventions, code style

### If you're operating LiteShip in production

1. [../SECURITY.md](./SECURITY.md): trust boundaries, CSP requirements, Trusted Types policy
2. [STATUS.md](./STATUS.md): current bench posture, watch items, security defaults
3. [AUDIT.md](./AUDIT.md): the codebase-audit signal, what to expect in a release artifact
4. [RELEASING.md](./RELEASING.md): publish, tags, GitHub releases

---

## Discovery index (file paths for common queries)

For agents and grep-first humans, here is where the canonical answer lives:

| Question | File |
|---|---|
| Where is `Boundary` defined? | `packages/core/src/boundary.ts` (re-exported from `packages/core/src/index.ts`) |
| Where is `Token` defined? | `packages/core/src/token.ts` |
| Where is `Style` defined? | `packages/core/src/style.ts` |
| Where is `Theme` defined? | `packages/core/src/theme.ts` |
| Where does the canonical CBOR encoder live? | `packages/canonical/src/cbor.ts` (`@czap/canonical`; re-exported from `packages/core/src/cbor.ts`) |
| Where is the FNV-1a hash? | `packages/canonical/src/fnv.ts` (re-exported from `packages/core/src/fnv.ts`) |
| Where is the generated UI catalog renderer? | `packages/genui/src/` (`defineComponentCatalog`, `renderFromCatalog`; ADR-0014) |
| Where is the SPSC ring buffer? | `packages/worker/src/spsc-ring.ts` |
| Where is the compositor pool? | `packages/core/src/compositor-pool.ts` |
| Where is `DirtyFlags`? | `packages/core/src/dirty.ts` |
| Where is the HTML sanitizer? | `packages/web/src/security/html-trust.ts` |
| Where is the SSRF / private-IP guard? | `packages/web/src/security/runtime-url.ts` |
| Where is the runtime policy global written? | `packages/astro/src/runtime/policy.ts`, via `globals.ts` |
| Where does `client:satellite` register? | `packages/astro/src/integration.ts` |
| Where is the `Satellite` Astro component? | `packages/astro/src/Satellite.astro` (default export from `@czap/astro/Satellite`) |
| Where is the document graph IR? | `packages/core/src/document-graph.ts` + `document-graph-address.ts` (`sealNode`/`sealGraph`; ADR-0015) |
| How do I mutate a graph? | `packages/core/src/graph-patch.ts` (`GraphPatch.diff`/`apply`/`validate`; apply re-seals) |
| Where is the AI cast / how is a model proposal validated? | `packages/core/src/ai-cast.ts` (`castContext` → `validateGraphPatchProposal` → `applyValidatedPatch`); envelope in `validated-output.ts` (ADR-0015) |
| How does a surface choose a render tier? | `packages/core/src/escalation.ts` (`chooseRung`; budget-gated, wired in the compositor) |
| Where is the dual-export (one graph → page + video)? | `packages/stage/src/dual-export.ts` (`dualExport`; ffmpeg backend on `@czap/stage/ffmpeg`) |
| What runs in `lint:structural`? | `sgconfig.yml` + `sgrules/` (AST guards; `AUDIT.md` "Structural lint") |
| How do I add a new compile target? | `docs/adr/0006-compiler-dispatch.md`, then `packages/compiler/src/dispatch.ts` |
| How do I add a new primitive? | `docs/adr/0001-namespace-pattern.md`, then mirror the existing primitive shape in `packages/core/src/` |
| How do I extend an existing type union? | The pattern is grep-first today; see CONTRIBUTING.md "Architecture changes" and the affected `_spine/*.d.ts` file |
| Where is the canonical CI workflow? | `.github/workflows/ci.yml` (truth-linux job runs `pnpm run gauntlet:full`) |
| Where is the red-team regression suite? | `tests/regression/red-team-runtime.test.ts` |
| What does `flex:verify` check? | `scripts/flex-verify.ts` (7 dimensions; gauntlet's final phase rollup) |
| How do I batch-evaluate many values against one boundary? | `Boundary.evaluateBatch(boundary, values)` in `packages/core/src/boundary.ts` (routed through `WASMDispatch.kernels()`; output-identical to scalar `evaluate`) |
| Where does the WASM kernel ship / get resolved? | `scripts/build-wasm.ts` stages it into `@czap/core/dist`; `packages/vite/src/wasm-resolve.ts` resolves it through the module graph (`@czap/vite` → `@czap/core`) |
| How do I force the GPU shader below the tier gate? | `client:gpu={{ force: true }}` or `data-czap-gpu-force` (ASTRO-RUNTIME-MODEL.md § `gpu`; `packages/astro/src/runtime/gpu.ts`) |
| When does capability detection finish? | the `czap:detect-ready` event on `document` (ASTRO-RUNTIME-MODEL.md § "Capability detection"; `packages/astro/src/detect-upgrade.ts`) |
| How do I read the resolved GPU tier client-side? | the `czap:detect-ready` detail or `window.__CZAP_DETECT__` — `gpuTier`/`webgpu` are not `<html>` attributes (as of 0.3.0) |
| How do I drive a boundary from live audio? | `driveAudioFromAnalyser(analyser)` from `@czap/astro/runtime`, then `Boundary.make({ input: 'audio.amplitude' or 'audio.beat', ... })` (`packages/astro/src/runtime/audio-signal.ts`) |
| Where is the canonical signal-input vocabulary? | `SignalSource` + `sourceToInput`/`inputToSource` in `packages/core/src/signal-input.ts` (source of truth for `viewport.width`, `scroll.progress`, `audio.amplitude`, ...) |
| How do I open the dev boundary inspector? | the Astro dev-toolbar (czap toolbar icon) in `astro dev`; opt out with `czap({ inspector: false })` |
| How do I skip the manual `src/middleware.ts`? | `czap({ middleware: true })` auto-wires detection (`@czap/astro/middleware-entry`); typed `Astro.locals.czap.tiers` |
| How does a client send an edit back to the server? | `createGraphMutationClient` + `sendGraphMutation` (`packages/core/src/graph-mutation-client.ts`, `graph-mutation.ts`); the host route is `graphMutationRoute` (ARCHITECTURE.md § "The mutation channel"; `examples/06-mutation-roundtrip`) |
| How do I bind a form to the mutation channel? | `bindGraphForm` from `@czap/web` (`packages/web/src/mutation/graph-form.ts`; ADR-0031; `examples/06-mutation-roundtrip`) |
| How do I keep the morph out of a client-owned subtree (CodeMirror, canvas)? | mark it `data-czap-morph-opaque` — `MorphOpaque` in `@czap/web` (`packages/web/src/morph/opaque.ts`; ADR-0032) |
| How do I use LiteShip's node schema with a Standard-Schema-aware library? | `DocumentGraphNodeSchema` carries `~standard` (Standard Schema V1) (`packages/core/src/document-graph-schema.ts`; ADR-0033) |
| What does a `staleBase` refusal / HTTP 409 mean? | the mutation was proposed against a base the server has moved past — reload and re-propose (the client does this automatically with `refreshBase`); `packages/core/src/graph-mutation.ts`, ADR-0031 |

---

## Internal design notes

`docs/internal/` holds maintainer-only design and findings documents — the working notes behind decisions, not part of the canon reading path above. Browse the directory directly; it is intentionally not enumerated here, since those files come and go with active work.

---

## Working Principle

When the docs and the code disagree:

- trust [STATUS.md](./STATUS.md) for repo state
- trust package source for exact runtime behavior
- trust tests for executable truth
