[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckDefinition

# Interface: CheckDefinition

Defined in: [command/src/checks/definition.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L58)

One declared check — a root `package.json` script that asserts something, described
(never reimplemented). The `id` is `check/<slug>` (the stable identity a plan and a
report key by); `command` is the exact root-script shell line to spawn.

## Properties

### authority

> `readonly` **authority**: [`CheckAuthority`](../type-aliases/CheckAuthority.md)

Defined in: [command/src/checks/definition.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L80)

The authority this check holds over the aggregate verdict (see [CheckAuthority](../type-aliases/CheckAuthority.md)).

***

### cache

> `readonly` **cache**: [`CheckCache`](../type-aliases/CheckCache.md)

Defined in: [command/src/checks/definition.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L78)

The cache discipline for this check's verdict (see [CheckCache](../type-aliases/CheckCache.md)).

***

### claim

> `readonly` **claim**: `string`

Defined in: [command/src/checks/definition.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L64)

The single sentence this check PROVES when it passes (its claim on reality).

***

### command

> `readonly` **command**: `string`

Defined in: [command/src/checks/definition.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L68)

The full shell line to spawn — the SAME contract as `GauntletPhase.command`; references the root script.

***

### id

> `readonly` **id**: `string`

Defined in: [command/src/checks/definition.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L60)

Stable identity, `check/<slug>` (the slug is the kebab form of the root script name).

***

### inputs

> `readonly` **inputs**: readonly `string`[]

Defined in: [command/src/checks/definition.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L70)

Globs of the bytes whose change invalidates a content-addressed verdict (the cache coverage).

***

### negativeControl?

> `readonly` `optional` **negativeControl?**: `string`

Defined in: [command/src/checks/definition.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L89)

Optional path proving the check CAN fail (a negative control): a red fixture,
regression-guard test, or self-proving gate that plants a regression THIS check
catches. Every BLOCKING check EITHER declares this OR is a key of
`NEGATIVE_CONTROL_EXEMPT` (a documented, reasoned exemption) — the partition is
total + disjoint, enforced by the `check-negative-control` gate. Prefer pointing
at a real red-fixture / regression test over a gate's own source.

***

### owner

> `readonly` **owner**: `string`

Defined in: [command/src/checks/definition.ts:66](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L66)

The package or script path that OWNS the assertion (where the logic lives).

***

### platforms

> `readonly` **platforms**: readonly [`CheckPlatform`](../type-aliases/CheckPlatform.md)[]

Defined in: [command/src/checks/definition.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L74)

The platforms this check runs on — a plan on an unlisted platform SKIPS it (with a reason).

***

### profiles

> `readonly` **profiles**: readonly [`CheckProfile`](../type-aliases/CheckProfile.md)[]

Defined in: [command/src/checks/definition.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L72)

The profiles this check is a member of — a projection runs it iff its profile is listed.

***

### remediation

> `readonly` **remediation**: `string`

Defined in: [command/src/checks/definition.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L91)

The one-line remediation printed when this check reds — the fix, one copy away.

***

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: [command/src/checks/definition.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L76)

The wall-clock ceiling (ms) after which the host aborts the check.

***

### title

> `readonly` **title**: `string`

Defined in: [command/src/checks/definition.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L62)

Human title for the plan / report line.
