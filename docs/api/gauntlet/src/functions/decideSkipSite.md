[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / decideSkipSite

# Function: decideSkipSite()

> **decideSkipSite**(`site`): [`SkipVerdict`](../type-aliases/SkipVerdict.md)

Defined in: [gauntlet/src/skip-site-facts.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L154)

THE KERNEL — the bounded, DATA-ONLY decision for one skip site. Reproduces `sanctionedSkipFor`'s
law as a pure composition of the producer's three precomputed floors, in the SAME precedence:
a placeholder is never sanctionable (floor 1); an unenumerated site is unsanctioned (floor 2);
an enumerated-but-capability-inconsistent site is unsanctioned (floor 3); otherwise allowed.
No regex, no Map, no I/O — exactly the property the FactGate buys.

## Parameters

### site

[`SkipSiteFact`](../interfaces/SkipSiteFact.md)

## Returns

[`SkipVerdict`](../type-aliases/SkipVerdict.md)
