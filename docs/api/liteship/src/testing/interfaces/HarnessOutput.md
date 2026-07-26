[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / HarnessOutput

# Interface: HarnessOutput

Defined in: core/dist/harness/pure-transform.d.ts:3

Emitted file contents for a capsule harness (test + bench pair).

## Properties

### benchFile

> `readonly` **benchFile**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:5

***

### integrationFile?

> `readonly` `optional` **integrationFile?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:13

INTEGRATION-lane file contents (the `tests/generated/integration/<name>.test.ts`
file). Only the `siteAdapter` arm emits this today: the host-capability-matrix
check runs under a REAL host and lands in the integration lane, separate from
the unit-lane `.test.ts`. Absent for every other arm (and for siteAdapters whose
integration check is a not-applicable exemption, which is recorded inline).

***

### testFile

> `readonly` **testFile**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:4
