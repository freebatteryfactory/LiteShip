[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/adaptive

# liteship/src/adaptive

The fully wired `liteship` adaptive composition root.

Core owns the pure lowering kernel and structural contract. Quantizer and
compiler own their existing semantic implementations. This module composes
those owners explicitly, so `defineAdaptive(...).plan()` never depends on a
prior side-effect import or mutable ambient registration.

## Functions

- [defineAdaptive](functions/defineAdaptive.md)
