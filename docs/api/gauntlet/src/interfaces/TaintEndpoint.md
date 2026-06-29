[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TaintEndpoint

# Interface: TaintEndpoint

Defined in: [gauntlet/src/taint-facts.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L91)

One end of a flow — a classified call site (the source or the sink).

## Properties

### callee

> `readonly` **callee**: `string`

Defined in: [gauntlet/src/taint-facts.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L97)

The classified callee NAME the registry matched (e.g. `fetch`, `shaderSource`,
`createShaderModule`, `innerHTML`, `applyValidatedPatch`). This is the
registry KEY, not a re-derivation — it names WHY this site is a source/sink.

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/taint-facts.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L99)

The repo-relative file — MUST be an IR file (the gate aims its level there).

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/taint-facts.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L101)

1-based line of the call site (the finding's location).

***

### note

> `readonly` **note**: `string`

Defined in: [gauntlet/src/taint-facts.ts:103](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/taint-facts.ts#L103)

A short human description carried from the registry (the WHY of this seam).
