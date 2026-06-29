[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / BuildRepoIRTaintOptions

# Interface: BuildRepoIRTaintOptions

Defined in: [audit/src/repo-ir-taint.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L162)

Options for [buildRepoIRTaint](../functions/buildRepoIRTaint.md).

## Properties

### interproceduralDepth?

> `readonly` `optional` **interproceduralDepth?**: `number`

Defined in: [audit/src/repo-ir-taint.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L170)

The bounded interprocedural hop depth (default
[DEFAULT\_TAINT\_INTERPROCEDURAL\_DEPTH](../variables/DEFAULT_TAINT_INTERPROCEDURAL_DEPTH.md)). Reported in the facts so the
report states the honest bound. Must be `>= 0`.

***

### profile?

> `readonly` `optional` **profile?**: [`DevopsProfile`](DevopsProfile.md)

Defined in: [audit/src/repo-ir-taint.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L164)

The audit profile (`profile.repoRoot` is the target). Defaults to LiteShip's.
