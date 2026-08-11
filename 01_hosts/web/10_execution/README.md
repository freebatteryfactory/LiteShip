# Web Execution Host

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/10_execution/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical browser host for residual-program execution: instantiating the selected browser realization, supplying browser clocks and scheduling, binding backend drivers, and handing committed outputs to browser egress authorities.

## Owns

- The browser execution host surface and its lawful backend set, derived from the core authority.
- The committed-output handoff to the projection commit.

## Does not own

- Residual-program meaning, memory plans, execution images, the transactional fold, write plans, commit semantics, reference behavior, or backend contracts. Core owns all of it.
- A second residual format, scheduler authority, compositor meaning, or scene runtime.
- Worker lifecycle. The browser Worker constructor is a web facility, but worker execution authority belongs to `01_hosts/worker/`, and any concrete cross-realm realization is declared at a downstream composition point that can import both surfaces — never predeclared from one side.

## The seam

The fold produces a `RuntimeCommit` — semantic commit, resulting revision, write plan, and trace together — and the browser egress applies it through one projection commit. Nothing loose crosses that seam: no detached write plan, no direct DOM writes from execution, no bypass of the region writer, no partial transaction visible.

The local residual backend set is derived as exactly what this home owns: javascript, wasm, and webgpu. `html-css` is platform settlement that ended before residual execution began, `worker` is a sibling physical realm, and trusted host execution never runs here — all by derivation, not convention. The host binds real `ExecutionBackendDriver` contracts, not backend-name strings, and standing it up is an offer requiring the intrinsic scheduling facility and the commit-application authority.

## Speculative preparation

This home also owns the web preparation provider: it prepares predicted expensive consequences — projection work, shader state, media state, island chunks, selected Wasm paths — as revision-pinned, owned, cheaply disposable `PreparedWork` that never mutates committed state and becomes visible only through the real transaction commit. The compiler owns candidate meaning and the disposition algebra; a wrong prediction is discarded without a trace in visible state.

## Laws

- The local backend set is exactly the residual browser backends.
- Each declared backend is bound to a driver whose own kind is that same backend — the roster and drivers cannot drift.
- The handoff carries the full runtime commit, never a loose plan.
- Scheduling schedules; it never fabricates an applied address — only commit application mints the physical web-commit address.
- Standing up execution is an offer requiring the scheduling facility and the commit-application authority: execution cannot claim the full path without possessing the projection authority.

## Proof obligations

- Selected browser backends resolve through the exact catalog the plan committed to.
- Execution resources dispose with their realization instance, exactly once.

The first is assurance; the second is an implementation fixture.

## Implementation boundary

Specified with physical profiles deferred: backend crossover profiles are empirical. No scheduler, driver, or execution code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/10_execution
  title: "Web Execution Host"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - browser-backends-derived-trusted-execution-excluded
  - committed-plans-cross-the-seam-never-loose-writes
  - no-second-scheduler-or-residual-format
  - worker-composition-declared-downstream-never-predeclared
  empirical_contracts:
  - backend-crossover-profiles
  production_authority: false
```
