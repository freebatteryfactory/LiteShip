# ADR-0039 — A routing LABEL becomes a transition PROGRAM

**Status:** Accepted
**Date:** 2026-07-13

## Context

ADR-0035 established that motion is an authored intent that lowers into a CSS
projection plan + a runtime leaf-write floor, and named `EdgeType`
(`plan.ts:27` — `seq | par | choice_then | choice_else`) as the "sequencing
algebra" a `TransitionNode` carries in its `routing` field. The interpreter that
shipped (`interpretTransition`, #130) read that field through `keyframesForRouting`
(`interpret-transition.ts:145-174`) — and every arm returned the SAME two endpoint
frames (`{offset:0, from} … {offset:1, to}`); `choice_else` merely reversed them.

`routing` was therefore a LABEL, not an algebra. A single `EdgeType` on ONE node
cannot express the three things #141 needs:

- **"A THEN B"** (`seq`) — a total duration that is `Σ` of its parts, with each part
  mapped to a disjoint sub-window.
- **"A WITH B"** (`par`) — a total that is the `max` of its parts, children sharing
  the window, a short child holding after it completes.
- **"A OR B"** (`choice`) — exactly ONE branch executes, selected by a predicate over
  a live signal, the rest never writing.

The composition of transitions is a TREE over `EdgeType`, not a flag on one node.

## Decision

**Replace the routing-label overload with an explicit `TransitionProgram` IR.**
`keyframesForRouting` is DELETED (Law 8 — no shim; a single step keeps a trivial
two-frame lowering). A new `TransitionProgram` (`@czap/core`,
`transition-program.ts`) composes `TransitionNode`s:

```
TransitionProgram =
  | { kind:'step';  transitionId; delayMs? }
  | { kind:'seq';   children: TransitionProgram[] }
  | { kind:'par';   children: TransitionProgram[] }
  | { kind:'choice'; branches:{ when:BranchCondition; source:SignalInput; body }[]; otherwise? }
```

Two readers lower it:

- `lowerTransitionProgram(graph, program, env?)` → a deterministic `[0,1]` timeline of
  per-transition windows (`{ transitionId, windowStart, windowEnd, branchGuard? }`)
  plus the composed `totalMs`. Child ORDER runs through the existing Plan DAG
  (`Plan.make().seq()/.par()` + `topoSort`) — acyclicity + a canonical topological
  order come for free, so offsets are reproducible.
- `interpretProgram(graph, program, env?)` → a `LoweredMotionPlan` whose
  `css.keyframes` are REAL multi-offset stops (a `seq` seam is a genuine mid-timeline
  keyframe) and whose `runtime.windows` are per-window sub-samplers, each carrying its
  OWN easing descriptor. `sampleProgramWindows` is the one runtime reader the
  `client:motion` floor (`writeContinuousMap`) and the algebra tests share (Law 16).

`EdgeType` stays the edge flavor BETWEEN adjacent transitions; the program is the
composition tree over it. `choice` resolves against a `ProgramEnv` snapshot at
lowering time and records the selected `branchId` on the diagnostics as an auditable
receipt.

## Consequences

- `seq` / `par` / `choice` produce DISTINCT lowerings — the collapse is gone. `seq`
  total is `Σ` (+ delays), `par` total is `max`, `choice` emits only the selected
  branch's windows.
- The native CSS backend (`MotionCompiler`) needs NO change: it already emits
  `step.offset` verbatim, so richer multi-offset keyframes flow through unchanged.
- Cancellation is interrupt-from-current (a re-trigger starts the new program from the
  sampled value); replay is idempotent via the existing discrete generation guard
  (`state-cell.ts`); reduced-motion settles to the terminal step's `toPose` (each
  branch has a well-defined terminal pose).
- Authoring sugar: `lowerRevealChain` (a `seq` + optional trailing `choice`) and
  `staggerProgram` (a `par` over stagger children) build programs from intent.
- New additive `@czap/core` public surface (minor, pre-1.0): `lowerTransitionProgram`,
  `interpretProgram`, `sampleProgramWindows`, `lowerRevealChain`, `staggerProgram`
  (+ their types). No existing signature changed; `RuntimeWritePlan` gained one
  OPTIONAL `windows` field.

## Evidence

- Algebra laws pinned as tests: `tests/unit/core/transition-program.test.ts` — RED-first
  proof that `seq`/`par` no longer collapse; `seq` total `== Σ`, `par` total `== max`
  with a short child holding, `choice` executes exactly one branch (both arms +
  `otherwise` + unmatched), cancel-at-0.5 → a defined settled state, replay idempotent,
  reduced-motion → terminal pose.
- CSS backend unchanged: `tests/unit/compiler/motion-compiler.test.ts` — a `seq`
  program compiles to `0% / 25% / 100%` stops; `par` to `33%` (max vs `Σ`).
- Runs through the floor: `tests/unit/astro/motion-runtime.test.ts` — a two-step chain
  scrubs its per-window sub-samplers through the real `client:motion` directive.

## Rejected alternatives

- **Keep `routing` and add more `EdgeType` values** — a flat enum on one node still
  cannot nest; "A then (B with C)" has no representation. The composition is a tree.
- **Resolve `choice` at drive time in the runtime** — the selection is an auditable
  authority decision; resolving at lowering against a snapshot env keeps the receipt
  content-addressable and the inlined program honest (only the chosen branch ships).
- **Per-window `animation-timing-function` in the CSS keyframes** — the JS floor
  carries per-window easing precisely; the native path keeps ONE timing function, so
  the backend stays untouched (the important invariant is the multi-offset STRUCTURE).

## References

- `packages/core/src/transition-program.ts` — the IR + `lowerTransitionProgram` /
  `interpretProgram` / `sampleProgramWindows`
- `packages/core/src/interpret-transition.ts` — `keyframesForRouting` DELETED;
  `twoFrameKeyframes` single-step path; `RuntimeWritePlan.windows`
- `packages/core/src/plan.ts` — the ordering substrate (`Plan.make`/`topoSort`)
- `packages/core/src/reveal.ts` (`lowerRevealChain`), `packages/core/src/stagger.ts`
  (`staggerProgram`) — authoring sugar
- `packages/astro/src/runtime/write-continuous-map.ts` — the floor reads the windows
- Supersedes the `EdgeType`-as-algebra framing in **ADR-0035**; ADR-0035 keeps the
  motion-is-intent taxonomy, this ADR replaces its per-node sequencing claim.
- Extended by **[ADR-0040](./0040-cross-target-motion-parity.md)** — `sampleProgramWindows`
  is generalized into the ONE `sampleProgram` kernel every non-CSS target samples (and the
  CSS `@keyframes` are generated from), pinned by a differential oracle.
- Epic #141 (this decision); builds on #126 (the continuous floor), #130 (the interpreter)
