[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / GPU\_TIER\_PATTERNS

# Variable: GPU\_TIER\_PATTERNS

> `const` **GPU\_TIER\_PATTERNS**: readonly \[readonly `RegExp`[], readonly `RegExp`[], readonly `RegExp`[], readonly `RegExp`[]\]

Defined in: [detect/src/gpu-patterns.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/gpu-patterns.ts#L30)

Regex groups indexed by the [GPUTier](../type-aliases/GPUTier.md) they classify (`0`..`3`).
Each entry is the set of unmasked-renderer-string fragments that mark a
device as that tier. The fragments are unanchored and group-free, so the
head-probe emitter can safely fold a group into a single `a|b|c` alternation
with identical match semantics to testing each pattern in turn.
