[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CONTEXT\_MAP

# Variable: CONTEXT\_MAP

> `const` **CONTEXT\_MAP**: `Readonly`\<`Record`\<`string`, [`ContextTask`](../interfaces/ContextTask.md)\>\>

Defined in: [command/src/commands/context-map.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/context-map.ts#L54)

THE MAP — task id → its ordered context. The keys are the closed set of task
ids `context --task` accepts (surfaced as [CONTEXT\_TASK\_IDS](CONTEXT_TASK_IDS.md)); an unknown
id fails structurally with the valid list.
