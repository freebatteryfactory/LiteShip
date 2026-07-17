[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CommandMap

# Interface: CommandMap

Defined in: [command/src/catalog.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L53)

The name-keyed payload contract: for each handler-backed command, the `payload`
type its result carries. `dispatch<N extends keyof CommandMap>` reads this to
type its return as `CapsuleCommandResult<CommandMap[N]>`, so a caller of
`dispatch('glossary', …)` gets a compile-time `GlossaryPayload` with no cast.

Assembled from the `*Payload` types each command module already exports.
Commands whose payload type has not yet been extracted (the scene/capsule/
asset.verify shrinks land in the consumer-phase [SCH]/[CER] slices) map to
`unknown` until their module exports a named payload type — refining an entry
here is a pure type-level tightening those slices perform.

## Properties

### asset.analyze

> `readonly` **asset.analyze**: [`AssetAnalyzePayload`](../type-aliases/AssetAnalyzePayload.md)

Defined in: [command/src/catalog.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L59)

***

### asset.verify

> `readonly` **asset.verify**: `unknown`

Defined in: [command/src/catalog.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L60)

***

### audit

> `readonly` **audit**: [`AuditPayload`](../type-aliases/AuditPayload.md)

Defined in: [command/src/catalog.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L65)

***

### audit-floor

> `readonly` **audit-floor**: [`AuditFloorPayload`](../type-aliases/AuditFloorPayload.md)

Defined in: [command/src/catalog.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L66)

***

### capsule-verify

> `readonly` **capsule-verify**: [`CapsuleVerifyPayload`](../type-aliases/CapsuleVerifyPayload.md)

Defined in: [command/src/catalog.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L70)

***

### capsule.inspect

> `readonly` **capsule.inspect**: `unknown`

Defined in: [command/src/catalog.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L56)

***

### capsule.list

> `readonly` **capsule.list**: `unknown`

Defined in: [command/src/catalog.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L57)

***

### capsule.verify

> `readonly` **capsule.verify**: `unknown`

Defined in: [command/src/catalog.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L58)

***

### check

> `readonly` **check**: [`CheckPayload`](../type-aliases/CheckPayload.md)

Defined in: [command/src/catalog.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L71)

***

### check-invariants

> `readonly` **check-invariants**: [`CheckInvariantsPayload`](../type-aliases/CheckInvariantsPayload.md)

Defined in: [command/src/catalog.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L69)

***

### glossary

> `readonly` **glossary**: [`GlossaryPayload`](../type-aliases/GlossaryPayload.md)

Defined in: [command/src/catalog.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L54)

***

### package-smoke

> `readonly` **package-smoke**: [`PackageSmokePayload`](../type-aliases/PackageSmokePayload.md)

Defined in: [command/src/catalog.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L68)

***

### plumb

> `readonly` **plumb**: [`PlumbPayload`](../type-aliases/PlumbPayload.md)

Defined in: [command/src/catalog.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L67)

***

### scene.compile

> `readonly` **scene.compile**: `unknown`

Defined in: [command/src/catalog.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L62)

***

### scene.render

> `readonly` **scene.render**: `unknown`

Defined in: [command/src/catalog.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L63)

***

### scene.verify

> `readonly` **scene.verify**: `unknown`

Defined in: [command/src/catalog.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L61)

***

### verify

> `readonly` **verify**: [`VerifyPayload`](../type-aliases/VerifyPayload.md)

Defined in: [command/src/catalog.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L64)

***

### version

> `readonly` **version**: [`VersionPayload`](../type-aliases/VersionPayload.md)

Defined in: [command/src/catalog.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/catalog.ts#L55)
