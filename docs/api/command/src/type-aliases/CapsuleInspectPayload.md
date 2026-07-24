[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CapsuleInspectPayload

# Type Alias: CapsuleInspectPayload

> **CapsuleInspectPayload** = `object`

Defined in: [command/src/commands/capsule.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule.ts#L60)

Structured payload returned by `capsule.inspect` — a single manifest entry.
The descriptor's outputSchema keeps the entry opaque (decision #2, no drift
with the manifest); this TS mirror is the precise real shape, a
CapsuleManifestEntry.

## Properties

### capsule

> `readonly` **capsule**: [`CapsuleManifestEntry`](../interfaces/CapsuleManifestEntry.md)

Defined in: [command/src/commands/capsule.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/capsule.ts#L61)
