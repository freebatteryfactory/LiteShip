[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / propagateProofStrength

# Function: propagateProofStrength()

> **propagateProofStrength**(`ir`, `localProofOf`): `ReadonlyMap`\<`string`, `number`\>

Defined in: [gauntlet/src/proof-propagation.ts:85](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/proof-propagation.ts#L85)

Propagate proof strength along the IR's INTERNAL import edges, returning the
EFFECTIVE (global) proof of every file in the IR: the fixpoint of

    effective(f) = min( local(f),
                        min over { e : e.fromFile === f } of effective(e.targetFile) ).

`local(f)` is `localProofOf(f)` — the module's blended local proof scalar in
`[0, 1]` (the host's mutation/coverage/property/invariant blend; in tests a stub).
The returned map has an entry for EVERY [FileId](../type-aliases/FileId.md) in `ir.files`; a file with
no weaker dependency maps to exactly its local proof (the propagation only ever
LOWERS, never raises).

The fixpoint is computed by iterating to stability over the dependency edges: each
pass walks every internal edge and lowers the IMPORTER's effective proof to at
most the dependency's CURRENT effective proof, repeating until a full pass changes
nothing. Because proofs only fall on the bounded `[0, 1]` interval, the loop
terminates (the total proof-sum strictly decreases each non-final pass and is
bounded below by 0). Cycle-safe by construction. The pass order does not affect
the FINAL map (a fixpoint is unique for a monotone bounded recurrence), so the
result is deterministic.

## Parameters

### ir

[`RepoIR`](../interfaces/RepoIR.md)

the injected repo-IR whose `imports` graph drives propagation.

### localProofOf

(`file`) => `number`

the local proof scalar of a file in `[0, 1]` (production: the
                     host's blend; tests: a stub). A value outside `[0, 1]` is a
                     tagged throw (a malformed proof scalar must be visible, never
                     silently clamped into a lie).

## Returns

`ReadonlyMap`\<`string`, `number`\>

## Throws

InvariantViolationError if a `localProofOf` value is not a finite number in
        `[0, 1]`, or if an internal import edge's endpoints are not in `ir.files`
        (a dangling edge — `makeRepoIR` already guards this; defence in depth).
