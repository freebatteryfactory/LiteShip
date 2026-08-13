# Edge Execution

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/08_execution/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own request-scoped edge execution: lawful backends bound to matching drivers, core's exact executor, and operation-handler resources bound to exact core operation definitions.

## Owns

- The execution host: `BoundEdgeDriver` roster and core's `RuntimeExecutor`, exactly.
- Operation- and requirements-correlated handler binding: a handler for operation A with requirement row R is provably not a handler for B or for another row, its definition carries the exact row, and its capabilities are exactly the bindings for that row — never a free requirement list.
- The offer's invocation and policy requirements — execution is request-scoped and policy-bound.

## Does not own

- Operation catalog or schema meaning — core `07_operation`. Wire projections — downstream. A generic edge application runtime — nothing here outlives the invocation.

## Authoritative edge

Edge executes authoritative operations when the plan lawfully supplies exact authenticated authority and capability rows. The architecture neither grants authority by placement nor forces a bounce through server — either extreme would misstate where authority actually comes from.

## Laws

- A backend and its driver cannot disagree — distributively.
- The host actually executes — core's executor, exactly.
- A handler cannot serve another operation; binding is operation-correlated.

## Proof obligations

- Parity with the reference backend; handlers use the canonical operation catalog; advisory hints never authorize.

`system/01_assurance`; request budgets and js/wasm crossover are empirical.
