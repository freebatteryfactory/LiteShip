[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CurePacket

# Interface: CurePacket

Defined in: [command/src/checks/cure-packet.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L21)

## Properties

### authority

> `readonly` **authority**: `object`

Defined in: [command/src/checks/cure-packet.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L28)

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

Defined in: [command/src/checks/cure-packet.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L36)

#### invariantIds

> `readonly` **invariantIds**: readonly `string`[]

#### owner

> `readonly` **owner**: `string`

#### publicRoutes

> `readonly` **publicRoutes**: readonly `string`[]

***

### editBoundary

> `readonly` **editBoundary**: `object`

Defined in: [command/src/checks/cure-packet.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L58)

#### allowedOwners

> `readonly` **allowedOwners**: readonly `string`[]

#### forbiddenShortcuts

> `readonly` **forbiddenShortcuts**: readonly `string`[]

***

### evidence

> `readonly` **evidence**: `object`

Defined in: [command/src/checks/cure-packet.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L53)

#### artifacts

> `readonly` **artifacts**: readonly [`CureArtifact`](CureArtifact.md)[]

#### stderrTail?

> `readonly` `optional` **stderrTail?**: `string`

#### stdoutTail?

> `readonly` `optional` **stdoutTail?**: `string`

***

### finding

> `readonly` **finding**: [`Finding`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/finding.ts)

Defined in: [command/src/checks/cure-packet.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L41)

***

### observation

> `readonly` **observation**: `object`

Defined in: [command/src/checks/cure-packet.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L49)

#### actual

> `readonly` **actual**: readonly `string`[]

#### expected

> `readonly` **expected**: `string`

***

### packetId

> `readonly` **packetId**: `IntegrityDigest`

Defined in: [command/src/checks/cure-packet.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L23)

***

### prompt

> `readonly` **prompt**: `string`

Defined in: [command/src/checks/cure-packet.ts:63](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L63)

***

### reproducer

> `readonly` **reproducer**: `object`

Defined in: [command/src/checks/cure-packet.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L42)

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

Defined in: [command/src/checks/cure-packet.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L22)

***

### source

> `readonly` **source**: `object`

Defined in: [command/src/checks/cure-packet.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L24)

#### headSha

> `readonly` **headSha**: `string`

#### treeDigest

> `readonly` **treeDigest**: `IntegrityDigest`

***

### verification

> `readonly` **verification**: readonly `string`[]

Defined in: [command/src/checks/cure-packet.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L62)
