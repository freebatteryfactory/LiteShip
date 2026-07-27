[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / BuildRepoIRTaintOptions

# Interface: BuildRepoIRTaintOptions

Defined in: [audit/src/repo-ir-taint.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L172)

Options for [buildRepoIRTaint](../functions/buildRepoIRTaint.md).

## Properties

### interproceduralDepth?

> `readonly` `optional` **interproceduralDepth?**: `number`

Defined in: [audit/src/repo-ir-taint.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L182)

The bounded interprocedural hop depth (default
[DEFAULT\_TAINT\_INTERPROCEDURAL\_DEPTH](../variables/DEFAULT_TAINT_INTERPROCEDURAL_DEPTH.md)). Reported in the facts so the
report states the honest bound. Must be `>= 0`.

***

### profile?

> `readonly` `optional` **profile?**: [`DevopsProfile`](DevopsProfile.md)

Defined in: [audit/src/repo-ir-taint.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L174)

The audit profile. Omission uses generic current-workspace defaults only.

***

### typeScriptPathAliases?

> `readonly` `optional` **typeScriptPathAliases?**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/repo-ir-taint.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-taint.ts#L176)

Host-owned source aliases used by the TypeScript resolver.
