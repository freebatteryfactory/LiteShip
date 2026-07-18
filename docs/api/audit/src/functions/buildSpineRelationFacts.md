[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildSpineRelationFacts

# Function: buildSpineRelationFacts()

> **buildSpineRelationFacts**(`admissions`, `repoRoot`, `options?`): `SpineRelationFacts`

Defined in: [audit/src/spine-relation-build.ts:178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L178)

Probe every admitted mirror type's bidirectional assignability against its runtime
source and classify the observed two-axis relation. Returns flat, already-observed
`SpineRelationFacts` for the lean gate to fold. Observations are returned in
the admission order supplied.

## Parameters

### admissions

readonly [`SpineTypeAdmission`](../interfaces/SpineTypeAdmission.md)[]

### repoRoot

`string`

### options?

[`SpineRelationBuildOptions`](../interfaces/SpineRelationBuildOptions.md) = `{}`

## Returns

`SpineRelationFacts`
