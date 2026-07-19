[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TRANSITION\_FAMILY\_LEVEL

# Variable: TRANSITION\_FAMILY\_LEVEL

> `const` **TRANSITION\_FAMILY\_LEVEL**: `Readonly`\<`Record`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>\>

Defined in: [gauntlet/src/gates/transition-conformance.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/transition-conformance.ts#L81)

The conformance-family → assurance-level map — exported, owner-redlinable DATA (the
sibling of the mutation kill-floor matrix). The Wave 5.5 reactive kernels are the
trust spine, so every reactive family resolves L4. A family ABSENT from the map
defaults to L4 (`levelForFamily`): the SAFE direction for a conformance cage
(an unclassified bisimulation family is treated as trust-spine — blocking — rather
than silently advisory, the same over-approximation discipline the mutation coverage
model uses).
