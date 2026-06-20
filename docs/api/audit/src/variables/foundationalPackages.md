[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / foundationalPackages

# Variable: foundationalPackages

> `const` **foundationalPackages**: readonly `string`[]

Defined in: [audit/src/policy.ts:238](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L238)

Foundational packages every internal package may import WITHOUT an explicit
`allowedInternalImports` entry — the runtime analogue of how `@czap/_spine`
is the universal type source. `@czap/error` is the one zero-dependency error
algebra the whole monorepo (and downstream consumers) builds failure paths
on; threading it through every package's allow-list would be noise that every
NEW package must then remember to repeat. Listed here once, the topology
check (structure.ts) treats an edge to any of these as always-blessed.

Kept deliberately tiny: a package qualifies only if it is a zero-`@czap`-dep
root that is genuinely universal. Adding to this list widens what every
package may import unchecked, so it is a conscious architectural decision.
