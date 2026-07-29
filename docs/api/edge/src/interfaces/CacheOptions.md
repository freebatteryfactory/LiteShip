[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [edge/src](../README.md) / CacheOptions

# Interface: CacheOptions

Defined in: [edge/src/kv-cache.ts:180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L180)

Construction policy for one content-addressed boundary cache.

## Properties

### prefix?

> `readonly` `optional` **prefix?**: `string`

Defined in: [edge/src/kv-cache.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L201)

KV key prefix (default `liteship`). Doubles as the per-deploy CONTENT VERSION
for a bundled `compile` callback: when compile's output depends on
build-time content the boundary id does not cover, set `prefix` to a hash
of that compiled output (e.g. `layout-${fnv1a(compileLayoutCss())}`) so a
content change busts the keyspace.

***

### ttl?

> `readonly` `optional` **ttl?**: `number`

Defined in: [edge/src/kv-cache.ts:193](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/kv-cache.ts#L193)

Cache entry TTL in seconds. This is an eviction/cost knob, not a
freshness knob: an entry is keyed by its boundary content address, tier,
name, and resolved-theme fingerprint, so it never goes stale for a change
in ANY of those. (A `compile` callback whose output ALSO depends on
build-time inputs outside the boundary's own content — e.g. shared layout
CSS — must additionally vary `prefix` per deploy; see [CacheOptions.prefix](#prefix).)
Each deploy that changes boundary content mints a new `ContentAddress`,
orphaning the old keys — and Workers KV never evicts on its own and bills
storage. Set a TTL to garbage-collect superseded builds. Omit to cache
indefinitely.
