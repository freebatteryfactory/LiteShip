[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / FeatureEdgeSubjectCoverage

# Type Alias: FeatureEdgeSubjectCoverage

> **FeatureEdgeSubjectCoverage** = \{ `censusDigest`: `` `sha256:${string}` ``; `enumeratedCount`: `number`; `enumerator`: [`FeatureEdgeEnumerator`](FeatureEdgeEnumerator.md); `status`: `"complete"`; \} \| \{ `censusDigest`: `` `sha256:${string}` ``; `enumeratedCount`: `number`; `enumerator`: [`FeatureEdgeEnumerator`](FeatureEdgeEnumerator.md); `opaqueSites`: readonly [`OpaqueFeatureEdgeSite`](../interfaces/OpaqueFeatureEdgeSite.md)[]; `status`: `"unknown"`; \}

Defined in: [gauntlet/src/facts/feature-edge-facts.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/feature-edge-facts.ts#L102)

Exact subject-coverage receipt for one governed family.

## Union Members

### Type Literal

\{ `censusDigest`: `` `sha256:${string}` ``; `enumeratedCount`: `number`; `enumerator`: [`FeatureEdgeEnumerator`](FeatureEdgeEnumerator.md); `status`: `"complete"`; \}

#### censusDigest

> `readonly` **censusDigest**: `` `sha256:${string}` ``

#### enumeratedCount

> `readonly` **enumeratedCount**: `number`

Number of distinct subjects, never the number of scanned files.

#### enumerator

> `readonly` **enumerator**: [`FeatureEdgeEnumerator`](FeatureEdgeEnumerator.md)

#### status

> `readonly` **status**: `"complete"`

***

### Type Literal

\{ `censusDigest`: `` `sha256:${string}` ``; `enumeratedCount`: `number`; `enumerator`: [`FeatureEdgeEnumerator`](FeatureEdgeEnumerator.md); `opaqueSites`: readonly [`OpaqueFeatureEdgeSite`](../interfaces/OpaqueFeatureEdgeSite.md)[]; `status`: `"unknown"`; \}

#### censusDigest

> `readonly` **censusDigest**: `` `sha256:${string}` ``

#### enumeratedCount

> `readonly` **enumeratedCount**: `number`

Number of distinct statically enumerated subjects before opacity was found.

#### enumerator

> `readonly` **enumerator**: [`FeatureEdgeEnumerator`](FeatureEdgeEnumerator.md)

#### opaqueSites

> `readonly` **opaqueSites**: readonly [`OpaqueFeatureEdgeSite`](../interfaces/OpaqueFeatureEdgeSite.md)[]

#### status

> `readonly` **status**: `"unknown"`
