# ADR-0046 — Direct generic types: the `.Shape` convention retired

**Status:** Accepted
**Date:** 2026-07-19

## Context

ADR-0001 established the namespace-object pattern: every primitive exported a
value const merged with a `declare namespace` whose `Shape` member carried the
instance type, so consumers wrote `Cell.Shape<T>`, `Boundary.Shape<I, S>`,
`Lifetime.Shape`. The census before this change measured 52 namespaces with a
literal `Shape` member and 519 `.Shape` usage sites across packages, tests,
examples, and the `_spine` mirrors — `Boundary.Shape` alone threaded through
15+ packages as a generic constraint.

The convention was mechanically consistent but paid rent nowhere:

- Signatures read unidiomatically (`watch(cell: Cell.Shape<number>)` instead of
  `watch(cell: Cell<number>)`), a translation tax on every reader.
- TypeScript already separates the type and value declaration spaces; the
  indirection through a namespace member duplicates what declaration merging
  gives for free (proven in-repo: `interface StateCell` + `const StateCell`
  coexisted before this change).
- IntelliSense and agent retrieval surface the namespace as a second symbol per
  primitive, doubling apparent surface without adding capability.

## Decision

Every public instance type shares its value's name directly. The underlying
`XxxShape`/`XxxDef` interfaces were promoted to the bare namespace name
(`interface Boundary`, `type Cell<T>`, `interface Lifetime`), all 519 usage
sites rewritten to the direct spelling, all namespace `Shape` members deleted,
and the `_spine/*.d.ts` mirrors rewritten in lockstep.

Namespaces that merge with a same-name exported **value** survive where they
still carry non-`Shape` auxiliary type members (`Boundary.Spec`,
`Lifetime.Finalizer`, `Compositor.Config`, …). Those members are retired
alongside their value consts in the verb-grammar phase (ADR-0046 appendix
below), which deletes the factory consts themselves (`Boundary.make` →
`defineBoundary`); a namespace whose value dies has its remaining type members
promoted to prefixed direct names (`Boundary.Spec` → `BoundarySpec`).

## Consequences

- The value API surface is provably untouched: the api-surface snapshot diff
  for this change is empty (byte-identical), and the type-export snapshot diff
  contains exactly +21 interfaces, +48 type aliases, −28 namespace entries —
  pure type-space movement.
- `sgrules/no-shape-namespace-type.yml` enforces the retirement: any namespace
  member named `Shape` and any qualified `.Shape` type reference under
  `packages/*/src` or the spine is an error-severity structural-lint finding,
  proven red/green in `tests/unit/meta/source-grammar-rules.test.ts`.
- ADR-0001 is superseded. Its branded-types half (sanctioned constructors,
  withheld `brand` factory) is unaffected and remains law.

## Appendix — verb grammar (lands with the verb-grammar phase)

One enforced verb per operation class, recorded here so the type and value
conventions live in one ruling:

| Verb        | Exact meaning                                    |
| ----------- | ------------------------------------------------ |
| `define`    | Create immutable authored intent                 |
| `create`    | Allocate stateful runtime behavior or a resource |
| `compile`   | Turn intent into a target artifact               |
| `parse`     | Read syntax into an untrusted intermediate       |
| `decode`    | Validate/convert unknown data into typed data    |
| `resolve`   | Choose one concrete result from alternatives     |
| `sample`    | Evaluate a time/index-dependent object           |
| `apply`     | Mutate a target using a validated operation      |
| `serialize` | Convert typed data into wire text/bytes          |
| `inspect`   | Return structured debug information              |
| `explain`   | Return the causal reason for a decision          |
| `dispose`   | End owned runtime activity                       |

## Evidence

- Census worklog: 110 `export declare namespace` declarations pre-change
  (~68 source + ~42 spine mirrors), 52 with `Shape` members, 519 usage sites.
- Post-change: `rg "\.Shape"` over packages/tests/examples/scripts = 0 hits;
  full gate green (7,556 unit tests, 312 property tests, spine-relation 42
  mirrors probed, standards 0 unsigned weakenings, check:gates 0 findings).

## Rejected alternatives

- **Keep `.Shape` for consistency with ADR-0001** — consistency with a
  convention that costs every reader beats nothing; the convention itself was
  the debt.
- **`XxxShape` suffixed direct types** (`BoundaryShape`) — still a second name
  per primitive; declaration merging makes the suffix pure noise.
- **Namespace-only types with no direct export** — inverts the problem;
  qualified names remain mandatory everywhere.
