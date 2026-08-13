# Evidence, Truth, and Propositions

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `06_evidence/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Model operational evidence state, three-valued truth, source authority, lifetime, cadence, evolution, realm, and one inspectable proposition algebra reused wherever partial knowledge affects a decision.

## Owns

- Evidence observation identity, and the immutable addressed evidence cut one evaluation saw.
- The reproducibility claim grammar, instantiated per physical stage over that stage's profile reference.
- `Truth = true | false | unknown`.
- `Evidence = unavailable | pending | ready | failed`.
- Evidence source definitions and references.
- Source authority, lifetime, evolution, cadence, and realm axes.
- Generic `Proposition<Atom>` using strong Kleene logic.
- Evidence atoms, blockers, failures, supporting sources, and decisions.
- The constrained foreign evidence adapter contract.

## Does not own

- DOM, device, network, request, database, or media acquisition.
- Authorization policy.
- Host scheduling.
- Collection field semantics, which extend the generic proposition algebra with collection atoms.

## Semantic contracts

`Pending` is operational. `Unknown` is epistemic. Failure remains failure even when the visible truth result is already determined by another operand.

Collections reuse this proposition algebra rather than defining a second boolean predicate language. A field may be unknown because of null, missing data, or pending evidence, while blockers and failures still explain which case occurred.

## Laws

- An observation retains the whole operational state algebra: unavailable, pending, and failed sources genuinely participated in an evaluated world.
- An evidence cut is exact over its identity and addressed. Its observation population may be empty but never absent — "consulted nothing" and "nobody recorded what was consulted" are different claims.
- A reproducibility claim names a profile *reference*, never a profile product. A profile containing a claim parameterized by that profile is a type containing itself.
- `unclaimed` carries limitations and cannot carry a witness. Absent evidence is not a negative finding, and calling unmeasured output non-reproducible is the same error as calling an unmapped artifact unmappable.
- `reproducible-under-profile` requires both an exact profile and a witness; `observed-variable` requires repeated-run evidence.
- Strong Kleene truth tables apply.
- `false AND unknown = false` and `true OR unknown = true` without erasing blockers or failures.
- Advisory or presentational evidence cannot satisfy authoritative requirements.
- Source lifetime and evolution determine whether a subscription must remain live.
- A retractable source may reverse a prior result.
- A foreign adapter loses portability, early settlement, serialization, and alternate-backend eligibility unless a certified adapter earns each property explicitly.

## Operation vocabulary

- `define` describes source and proposition meaning.
- `resolve` evaluates a proposition over current evidence.
- `inspect` returns truth, blockers, failures, and supporting sources.
- Physical source `create` belongs to hosts.

## Proof obligations

- Complete strong Kleene truth table.
- Annihilator cases preserve hidden blocker and failure evidence.
- Authority mismatch refuses.
- Retractable evidence can reverse a decision without stale caching.
- Collection predicates and evidence propositions use one evaluator and one truth law.
- Foreign adapters cannot claim unsupported portability or settlement.
- Source disposal follows lifetime semantics.

## Implementation boundary

The proposition and source algebras are specified. Physical source producers, evaluation engine, and source-planning cost model are absent.

Determining subscription cancellation policy and measuring source cost are implementation obligations. Proposition semantics and reuse across collection predicates are settled here.
