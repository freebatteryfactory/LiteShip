[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / PLACEHOLDER\_DIGEST

# Variable: PLACEHOLDER\_DIGEST

> `const` **PLACEHOLDER\_DIGEST**: `"placeholder:no-content-address"`

Defined in: [gauntlet/src/repo-ir.ts:287](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts#L287)

The deterministic placeholder content digest in-memory fixtures use when they
do not (and need not) compute a real blake3 digest. It is INERT by design —
never a real address — so a fixture's digest can never be mistaken for a
content-addressed one and the B2 incremental cache (which keys on real
digests) cannot be fooled by a fixture value. A host ALWAYS overwrites it.
