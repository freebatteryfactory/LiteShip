[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / GPU\_TIER\_PRECEDENCE

# Variable: GPU\_TIER\_PRECEDENCE

> `const` **GPU\_TIER\_PRECEDENCE**: readonly [`GPUTier`](../type-aliases/GPUTier.md)[]

Defined in: detect/src/gpu-patterns.ts:70

The order tiers are tested in, highest-fidelity-overlap first. A renderer
can match multiple groups (e.g. an "RTX" string also contains "geforce");
resolving most-specific (3) before mid (2) before integrated (1) — with
software (0) first as an absolute override — is the canonical precedence
both the runtime classifier and the emitted head-probe follow.
