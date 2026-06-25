[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / propagateAssuranceLevels

# Function: propagateAssuranceLevels()

> **propagateAssuranceLevels**(`ir`, `baseLevelOf`): `ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

Defined in: [gauntlet/src/assurance-propagation.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance-propagation.ts#L79)

Propagate assurance levels along the IR's INTERNAL import edges, returning the
EFFECTIVE level of every file in the IR: the fixpoint of

    effective(f) = max( base(f),
                        max over { e : e.targetFile === f } of effective(e.fromFile) ).

`base(f)` is `baseLevelOf(f)` — the file's floor (the glob level in production;
a stub in tests). The returned map has an entry for EVERY [FileId](../type-aliases/FileId.md) in
`ir.files`; a file with no high importer maps to exactly its base level (the
propagation only ever RAISES, never lowers).

The fixpoint is computed by iterating to stability over the reverse-reachability
the import edges describe: each pass walks every internal edge and raises the
target's level to at least the source's CURRENT effective level, repeating until
a full pass changes nothing. Because levels only rise on the bounded `L0..L4`
ladder, the loop terminates (the total rank-sum strictly increases each
non-final pass and is bounded by `4 * |files|`). Cycle-safe by construction —
a cycle simply lifts its whole strongly-connected set to its highest member and
then stops changing.

Pure + deterministic: no clock, no randomness, no filesystem; the same IR +
`baseLevelOf` always yields an identical map.

## Parameters

### ir

[`RepoIR`](../interfaces/RepoIR.md)

the injected repo-IR whose `imports` graph drives propagation.

### baseLevelOf

(`file`) => [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

the floor level of a file (production: a glob-map lookup).

## Returns

`ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

## Throws

InvariantViolationError if an internal import edge's endpoints are not in
        `ir.files` (a dangling edge — `makeRepoIR` already guards this, so this is
        a defence-in-depth invariant, never a silent skip).
