[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleGateSummary

# Interface: CapsuleGateSummary

Defined in: [command/src/registry.ts:382](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L382)

Structured verdict returned by the injected [CommandContext.runCapsuleGate](CommandContext.md#runcapsulegate)
capability — the capsule-corpus freshness + bench-honesty + green-suite gate.
`status` is `ok` only when every generated test+bench exists, no committed file
is stale against a fresh regeneration, no bench is a lazy placeholder/drift, and
the whole generated suite passes; `stale` means a missing/stale/dishonest
artifact (run `capsule:compile`); `failed` means the generated tests ran red.
`errors` is the human work-list (empty on success). Declared here so the
`capsule-verify` command's contract lives in `@liteship/command` without a host import.

## Properties

### benches

> `readonly` **benches**: [`CapsuleBenchClassification`](CapsuleBenchClassification.md)

Defined in: [command/src/registry.ts:389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L389)

Per-corpus bench-honesty classification.

***

### capsuleCount

> `readonly` **capsuleCount**: `number`

Defined in: [command/src/registry.ts:387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L387)

Number of capsules in the manifest the gate read.

***

### errors

> `readonly` **errors**: readonly `string`[]

Defined in: [command/src/registry.ts:385](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L385)

Human work-list: each blocking reason (missing/stale/dishonest/red). Empty on `ok`.

***

### status

> `readonly` **status**: `"ok"` \| `"stale"` \| `"failed"`

Defined in: [command/src/registry.ts:383](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L383)
