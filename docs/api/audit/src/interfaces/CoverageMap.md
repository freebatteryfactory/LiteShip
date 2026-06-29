[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / CoverageMap

# Interface: CoverageMap

Defined in: [audit/src/mutation-verdict.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L68)

The deterministic covering-tests mapping — `(file, line)` → the sorted, unique
test ids that exercise that site. The host builds it from a coverage report; the
verdict reads it. A site with no entry (or an empty entry) is NO-COVERAGE.

## Methods

### covering()

> **covering**(`file`, `line`): readonly `string`[]

Defined in: [audit/src/mutation-verdict.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L70)

The sorted, de-duplicated test ids covering `(file, line)`, or `[]` if none.

#### Parameters

##### file

`string`

##### line

`number`

#### Returns

readonly `string`[]
