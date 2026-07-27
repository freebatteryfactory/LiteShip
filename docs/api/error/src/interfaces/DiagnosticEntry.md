[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / DiagnosticEntry

# Interface: DiagnosticEntry

Defined in: [error/src/codes.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L72)

What every enrolled [DiagnosticCode](../type-aliases/DiagnosticCode.md) carries — the human/agent-readable
meaning of the code, drawn from the emitter's own message / detail / remediation
text so the catalogue never drifts from what the code actually means.

## Properties

### area

> `readonly` **area**: `"gauntlet"` \| `"check"` \| `"error"` \| `"core"` \| `"schema"` \| `"audit"` \| `"compiler"` \| `"detect"` \| `"genui"` \| `"astro"` \| `"cli"` \| `"migrate"`

Defined in: [error/src/codes.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L80)

The subsystem that owns the code — the first segment of the [DiagnosticCode](../type-aliases/DiagnosticCode.md).

***

### explanation

> `readonly` **explanation**: `string`

Defined in: [error/src/codes.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L76)

The WHY — enough to understand the code without the source (from the emitter's detail / claim).

***

### owner

> `readonly` **owner**: `string`

Defined in: [error/src/codes.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L82)

The package/domain that actually emits this identity.

***

### remediation

> `readonly` **remediation**: `string`

Defined in: [error/src/codes.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L78)

The actionable fix — one precise instruction (from the emitter's remediation).

***

### title

> `readonly` **title**: `string`

Defined in: [error/src/codes.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/codes.ts#L74)

Short human summary — the WHAT (drawn from the emitter's finding title / message).
