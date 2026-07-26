[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CurePacket

# Interface: CurePacket

Defined in: [command/src/checks/cure-packet.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L28)

## Properties

### authority

> `readonly` **authority**: `object`

Defined in: [command/src/checks/cure-packet.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L35)

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

Defined in: [command/src/checks/cure-packet.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L43)

#### invariantIds

> `readonly` **invariantIds**: readonly `string`[]

#### owner

> `readonly` **owner**: `string`

#### publicRoutes

> `readonly` **publicRoutes**: readonly `string`[]

***

### editBoundary

> `readonly` **editBoundary**: `object`

Defined in: [command/src/checks/cure-packet.ts:65](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L65)

#### allowedOwners

> `readonly` **allowedOwners**: readonly `string`[]

#### forbiddenShortcuts

> `readonly` **forbiddenShortcuts**: readonly `string`[]

***

### evidence

> `readonly` **evidence**: `object`

Defined in: [command/src/checks/cure-packet.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L60)

#### artifacts

> `readonly` **artifacts**: readonly [`CureArtifact`](CureArtifact.md)[]

#### stderrTail?

> `readonly` `optional` **stderrTail?**: `string`

#### stdoutTail?

> `readonly` `optional` **stdoutTail?**: `string`

***

### finding

> `readonly` **finding**: [`Finding`](../../../liteship/src/evidence/interfaces/Finding.md)

Defined in: [command/src/checks/cure-packet.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L48)

***

### observation

> `readonly` **observation**: `object`

Defined in: [command/src/checks/cure-packet.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L56)

#### actual

> `readonly` **actual**: readonly `string`[]

#### expected

> `readonly` **expected**: `string`

***

### packetId

> `readonly` **packetId**: `IntegrityDigest`

Defined in: [command/src/checks/cure-packet.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L30)

***

### prompt

> `readonly` **prompt**: `string`

Defined in: [command/src/checks/cure-packet.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L70)

***

### reproducer

> `readonly` **reproducer**: `object`

Defined in: [command/src/checks/cure-packet.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L49)

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

Defined in: [command/src/checks/cure-packet.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L29)

***

### source

> `readonly` **source**: `object`

Defined in: [command/src/checks/cure-packet.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L31)

#### headSha

> `readonly` **headSha**: `string`

#### treeDigest

> `readonly` **treeDigest**: `IntegrityDigest`

***

### verification

> `readonly` **verification**: readonly `string`[]

Defined in: [command/src/checks/cure-packet.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/cure-packet.ts#L69)
