[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / CapabilityLinkOptions

# Interface: CapabilityLinkOptions

Defined in: [audit/src/repo-ir-capability-link.ts:68](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L68)

Injected inputs for [buildCapabilityLinkFacts](../functions/buildCapabilityLinkFacts.md) — all LiteShip-local knowledge comes via these.

## Properties

### capabilityIds

> `readonly` **capabilityIds**: readonly `string`[]

Defined in: [audit/src/repo-ir-capability-link.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L74)

The known capability ids (kebab) — only module exports whose kebab name is in this set are probes.

***

### capabilityModules

> `readonly` **capabilityModules**: readonly `string`[]

Defined in: [audit/src/repo-ir-capability-link.ts:72](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L72)

Repo-relative paths to the canonical capability symbol-table modules (the SET the linker reads).

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/repo-ir-capability-link.ts:70](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L70)

Absolute repo root; every relative path resolves against it.

***

### sites

> `readonly` **sites**: readonly [`CapabilitySkipSite`](CapabilitySkipSite.md)[]

Defined in: [audit/src/repo-ir-capability-link.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L76)

The sanctioned skip sites to prove.
