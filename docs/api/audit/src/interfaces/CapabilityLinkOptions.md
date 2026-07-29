[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / CapabilityLinkOptions

# Interface: CapabilityLinkOptions

Defined in: [audit/src/repo-ir-capability-link.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L69)

Injected inputs for [buildCapabilityLinkFacts](../functions/buildCapabilityLinkFacts.md) — all LiteShip-local knowledge comes via these.

## Properties

### capabilityIds

> `readonly` **capabilityIds**: readonly `string`[]

Defined in: [audit/src/repo-ir-capability-link.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L75)

The known capability ids (kebab) — only module exports whose kebab name is in this set are probes.

***

### capabilityModules

> `readonly` **capabilityModules**: readonly `string`[]

Defined in: [audit/src/repo-ir-capability-link.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L73)

Repo-relative paths to the canonical capability symbol-table modules (the SET the linker reads).

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/repo-ir-capability-link.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L71)

Absolute repo root; every relative path resolves against it.

***

### sites

> `readonly` **sites**: readonly [`CapabilitySkipSite`](CapabilitySkipSite.md)[]

Defined in: [audit/src/repo-ir-capability-link.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L77)

The sanctioned skip sites to prove.

***

### typeScriptPathAliases?

> `readonly` `optional` **typeScriptPathAliases?**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/repo-ir-capability-link.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L79)

Host-owned source aliases used by the TypeScript resolver.
