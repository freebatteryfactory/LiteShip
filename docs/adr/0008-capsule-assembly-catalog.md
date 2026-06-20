# ADR-0008: Capsule Assembly Catalog

**Status:** Accepted
**Date:** 2026-04-23
**Supersedes:** —

## Context

The capsule factory needs a bounded vocabulary of assembly kinds to avoid cathedral creep. Unbounded catalogs let every new domain mint its own arm, at which point the "factory" degenerates into a dispatch table of ad-hoc shapes.

## Decision

The catalog is closed at seven arms:

1. `pureTransform`: deterministic function
2. `receiptedMutation`: side-effecting op with receipt
3. `stateMachine`: states + transitions
4. `siteAdapter`: host-runtime bridge
5. `policyGate`: permission / authz check
6. `cachedProjection`: content-addressed transform with cache
7. `sceneComposition`: ECS-world-backed timeline

Each arm has a typed contract (`CapsuleContract<K, In, Out, R>`), a factory (`defineCapsule`), and a harness template that emits property tests, benches, docs, and audit receipts.

**Closure rule:** adding an 8th arm requires:
1. An ADR amendment to this document with explicit justification
2. Demonstration that the candidate archetype does not cleanly reduce to an existing arm
3. A first concrete instance in the same PR (no speculative arms)

## Consequences

- Contributors must map new domains to existing arms; speculative arms are rejected.
- Catalog audit becomes mechanical: grep `_kind` literals, compare against the seven.
- Cross-domain isomorphism claim becomes testable: if most real-world primitives (HTTP handlers, GraphQL resolvers, LLM tool-calls, DB migrations, scenes) do reduce to these seven, the catalog is load-bearing.

## Supporting evidence

- `packages/core/src/assembly.ts` implements the tagged union.
- `packages/core/src/harness/` ships 7 per-arm templates (`pure-transform.ts`, `receipted-mutation.ts`, `state-machine.ts`, `site-adapter.ts`, `policy-gate.ts`, `cached-projection.ts`, `scene-composition.ts`).
- `scripts/capsule-compile.ts` dispatches per arm via `isAssemblyKind` guard + exhaustive `switch`; no fallback path.
- `scripts/flex-verify.ts` `CapsuleFactory` dimension reports `arms-with-instances=K/7` so the closure is observable.

## References

- [LiteShip vocabulary](../../GLOSSARY.md): product / engine / `@czap/*` naming
- `docs/adr/0007-adapter-vs-peer-framing.md` (paired adapter framing ADR)
- `docs/adr/0010-spine-canonical-type-source.md` (paired bridge ADR)

### Capsule detection is type-directed (2026-04-24 amendment)

The capsule compiler at `scripts/capsule-compile.ts` originally used
a syntax-only AST walker (`ts.createSourceFile`) that extracted
`_kind` and `name` from string-literal initializers. It was blind
to factory-wrapped capsules. `defineAsset(...)`,
`BeatMarkerProjection(id)`, and similar patterns silently dropped
from the manifest because they don't pass `_kind: 'cachedProjection'`
as a literal at the factory call site.

The detector at `scripts/lib/capsule-detector.ts` now uses
`ts.createProgram` + `getTypeChecker()` to resolve every
`CallExpression`'s return type. Any call whose type extends
`CapsuleContract<K, ...>` or `CapsuleDef<K, ...>` is detected,
regardless of whether the callee is `defineCapsule` directly or a
factory wrapper. `K` is read from the type parameter via
`CAPSULE_TYPE_NAMES` (`packages/core/src/capsule.ts`).

Factory-wrapped capsules surface in the manifest with a `factory`
field (the wrapper name) and `args` (literal arguments captured at
the call site). Naming conventions for known factories (e.g.
`BeatMarkerProjection('intro-bed')` → `intro-bed:beats`) live in
`scripts/capsule-compile.ts` `FACTORY_NAMING`; unknown factories
fall back to the first string-literal argument or the binding name.

Cross-package import resolution uses an explicit `WORKSPACE_ALIASES`
map (`scripts/lib/capsule-detector.ts` L24-43) so the type checker
sees source `.ts` files rather than built `.d.ts` outputs. Without
that, factory return types like `CapsuleDef<'cachedProjection', ...>`
collapse to `any` and the type-directed detector would degenerate
back to the syntax-only behavior.

This closes the "factory-wrapped capsule" gap: the `cachedProjection`
arm now records real instances instead of an empty list.

### policyGate gains a `decide` channel + its first instance (2026-06-20 amendment)

ADR-0008 closed the catalog at seven arms, with `policyGate` (#5) named
"permission / authz check." `policyGate` shipped as a closed-catalog
member with **zero instances** and a harness that threw `UnsupportedError`:
the `CapsuleContract` had no channel to drive a verdict, so the one real
permission decision in the tree — `chooseRung`, the reader of `PolicyNode`
(`packages/core/src/escalation.ts`) — was filed under `pureTransform` to
be harnessable at all. The arm was reserved for a decision it had no way
to express. This amendment closes that gap.

1. **Contract.** `CapsuleContract` gains an optional
   `decide?: (subject: In) => Decision`, meaningful only for `policyGate`,
   where `Decision = { effect: 'allow' | 'deny'; reasons: readonly Reason[] }`
   and `Reason = { code: string; message: string }`. `decide` MUST be
   **pure and total** over the subject domain (the same discipline as
   `mutate`), and `Out` is the verdict shape — a `policyGate` declares
   `output` as the `Decision` schema. A `policyGate` **returns** a verdict;
   it never enforces it — side-effecting admission stays in the downstream
   producer (ADR-0014 "no built-in authority").

2. **Mandatory `decide`.** `defineCapsule` REJECTS a `policyGate` with no
   `decide` core (loud `InvariantViolationError`), exactly as a
   `receiptedMutation` must expose a `mutate` core or a typed exemption.
   There is **no policyGate exemption**: a gate that cannot decide is not
   a gate.

3. **Harness.** `generatePolicyGate` emits a real traversal — allow/deny
   coverage (reasons non-empty *exactly* when `deny`), reason-chain
   integrity (each reason's `code`/`message` non-empty; the verdict
   round-trips through the declared `Decision` schema), determinism (same
   subject → deep-equal verdict twice), every declared invariant
   `check(subject, verdict)`, and a real `decide()` bench — or fails the
   compile loud (wire-or-fail). The reason chain justifies a **rejection**:
   a `deny` names why; an `allow` is a bare admission with an empty chain.

4. **First instance (closure rule satisfied).** `core.escalation.choose-rung`
   (`packages/core/src/capsules/escalation-choose-rung.ts`) is reclassified
   from `pureTransform` to `policyGate`. Its `decide` seals a real
   `PolicyNode` from the subject and calls `chooseRung`; allow ⇒
   `{ effect: 'allow', reasons: [] }`, deny ⇒
   `{ effect: 'deny', reasons: [{ code, message }] }` where `message` is the
   chooser's own error string verbatim. This is the canonical
   permission/authz check ADR-0008 #5 reserved the arm for.

**The catalog stays at seven.** No arm is added or removed; `policyGate` is
unchanged as a member. This amendment only gives it the contract channel
and the concrete instance its closure rule always required. With all seven
arms now shipping real instances, the `flex:verify` capsule-factory
dimension gates every arm (`scripts/flex-verify.ts` `requiredArms`).
