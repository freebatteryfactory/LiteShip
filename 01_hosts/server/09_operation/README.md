# Server Operations

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/09_operation/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own trusted server-physical operation-handler realization: exact bindings to core operation definitions, capability rows, idempotency resources, cancellation, and lifecycle.

## Owns

- The handler: bound to its exact operation (A is provably not B) and its exact requirement row, speaking the definition's own input, output, and failure families, carrying exactly the bindings for that row — never a free requirement list — and an idempotency resource.
- Operation-correlated binding on the provider.
- The deployment-admitted handler catalog grounding.

## Does not own

- The operation catalog or schema meaning — core `07_operation`. Wire projections — direct, HTTP, CLI, MCP, LSP, and browser wires are downstream projections over this same authority; none restates the catalog. Authorization by placement — a handler's authority comes from its definition's requirements, checked, never assumed.

## Laws

- A handler cannot serve another operation; binding is operation-correlated.
- A handler carries idempotency, capabilities, and an owned lifecycle.

## Proof obligations

- Handlers use the canonical operation catalog and exact schemas; authorization is checked on the shipping path.

`system/01_assurance`.
