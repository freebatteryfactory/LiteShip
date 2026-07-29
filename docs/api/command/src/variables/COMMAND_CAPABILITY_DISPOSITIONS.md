[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / COMMAND\_CAPABILITY\_DISPOSITIONS

# Variable: COMMAND\_CAPABILITY\_DISPOSITIONS

> `const` **COMMAND\_CAPABILITY\_DISPOSITIONS**: readonly [`CommandCapabilityDisposition`](../interfaces/CommandCapabilityDisposition.md)[]

Defined in: [command/src/registry.ts:536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L536)

One explicit owner for every admitted capability. `modeled-fallback` is a real
command-level counterpart (currently the injected clock's systemClock floor),
not permission to silently ignore an absent required capability.
