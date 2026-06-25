[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / coverageClassSeverity

# Function: coverageClassSeverity()

> **coverageClassSeverity**(`a`, `b`): `"advisory"` \| `"warning"` \| `"error"`

Defined in: [gauntlet/src/repo-ir.ts:111](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L111)

The severity an oracle-divergence finding carries, calibrated from the
coverage-class PAIR of the two disagreeing oracles via the redlinable
[COVERAGE\_CLASS\_SEVERITY](../variables/COVERAGE_CLASS_SEVERITY.md) matrix. Symmetric: `(a, b)` and `(b, a)` agree.

- same class → `COVERAGE_CLASS_SEVERITY.same` (a real contradiction, loud).
- cross class → `COVERAGE_CLASS_SEVERITY.cross` (a coverage gap; the weak oracle
  is known-imprecise — quiet, and itself the retire-the-weak-oracle work-list).

## Parameters

### a

[`CoverageClass`](../type-aliases/CoverageClass.md)

### b

[`CoverageClass`](../type-aliases/CoverageClass.md)

## Returns

`"advisory"` \| `"warning"` \| `"error"`
