[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FixRejectionClass

# Type Alias: FixRejectionClass

> **FixRejectionClass** = `"scope-creep"` \| `"size-exceeded"` \| `"unsigned-weakening"` \| `"forbidden-weakening"` \| `"forged-receipt"`

Defined in: [gauntlet/src/declared-fix.ts:177](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/declared-fix.ts#L177)

The CLASS of a single rejection reason — the specific admission failure, so the
gate can fold each into a self-explaining, separately-actionable Finding. Mirrors
the four verifier checks (+ the never-signable always-blocking floor, surfaced
distinctly from a plain unsigned weakening because it can NEVER be cured by a
sign-off — only by reversing the weakening).
