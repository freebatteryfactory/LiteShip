[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / CurePacket

# Interface: CurePacket

Defined in: [command/src/checks/cure-packet.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L32)

Bounded failure handoff designed for deterministic agent repair.

## Properties

### authority

> `readonly` **authority**: `object`

Defined in: [command/src/checks/cure-packet.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L39)

#### checkId

> `readonly` **checkId**: `string`

#### lane

> `readonly` **lane**: `string`

#### platform

> `readonly` **platform**: `string`

#### profile

> `readonly` **profile**: `string`

#### ruleId

> `readonly` **ruleId**: `string`

#### toolchain

> `readonly` **toolchain**: `string`

***

### contract

> `readonly` **contract**: `object`

Defined in: [command/src/checks/cure-packet.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L47)

#### invariantIds

> `readonly` **invariantIds**: readonly `string`[]

#### owner

> `readonly` **owner**: `string`

#### publicRoutes

> `readonly` **publicRoutes**: readonly `string`[]

***

### editBoundary

> `readonly` **editBoundary**: `object`

Defined in: [command/src/checks/cure-packet.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L69)

#### allowedOwners

> `readonly` **allowedOwners**: readonly `string`[]

#### forbiddenShortcuts

> `readonly` **forbiddenShortcuts**: readonly `string`[]

***

### evidence

> `readonly` **evidence**: `object`

Defined in: [command/src/checks/cure-packet.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L64)

#### artifacts

> `readonly` **artifacts**: readonly [`CureArtifact`](CureArtifact.md)[]

#### stderrTail?

> `readonly` `optional` **stderrTail?**: `string`

#### stdoutTail?

> `readonly` `optional` **stdoutTail?**: `string`

***

### finding

> `readonly` **finding**: [`Finding`](../../../liteship/src/evidence/interfaces/Finding.md)

Defined in: [command/src/checks/cure-packet.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L52)

***

### observation

> `readonly` **observation**: `object`

Defined in: [command/src/checks/cure-packet.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L60)

#### actual

> `readonly` **actual**: readonly `string`[]

#### expected

> `readonly` **expected**: `string`

***

### packetId

> `readonly` **packetId**: [`IntegrityDigest`](../../../spine/type-aliases/IntegrityDigest.md)

Defined in: [command/src/checks/cure-packet.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L34)

***

### prompt

> `readonly` **prompt**: `string`

Defined in: [command/src/checks/cure-packet.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L74)

***

### reproducer

> `readonly` **reproducer**: `object`

Defined in: [command/src/checks/cure-packet.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L53)

#### command

> `readonly` **command**: readonly `string`[]

#### fixture?

> `readonly` `optional` **fixture?**: `string`

#### kind

> `readonly` **kind**: [`CureReproducerKind`](../type-aliases/CureReproducerKind.md)

#### schedule?

> `readonly` `optional` **schedule?**: readonly `unknown`[]

#### seed?

> `readonly` `optional` **seed?**: `string`

***

### schemaVersion

> `readonly` **schemaVersion**: `1`

Defined in: [command/src/checks/cure-packet.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L33)

***

### source

> `readonly` **source**: `object`

Defined in: [command/src/checks/cure-packet.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L35)

#### headSha

> `readonly` **headSha**: `string`

#### treeDigest

> `readonly` **treeDigest**: [`IntegrityDigest`](../../../spine/type-aliases/IntegrityDigest.md)

***

### verification

> `readonly` **verification**: readonly `string`[]

Defined in: [command/src/checks/cure-packet.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L73)
