[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / GeneratedUIValidator

# Type Alias: GeneratedUIValidator

> **GeneratedUIValidator** = (`node`, `catalog`) => \{ `ok`: `true`; \} \| \{ `error`: \{ `message`: `string`; `path?`: `string`; \}; `ok`: `false`; \}

Defined in: [core/src/ai-cast.ts:623](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L623)

The catalog-validation contract genui owns.

RESOLVED (open question #2 — inject vs MOVE genui's `validateGeneratedUITree`
into core). INJECTION: the cast core does NOT depend on genui's runtime, and we
do NOT relocate genui's validator into core. The host (which already has
`@czap/genui`) passes its `validateGeneratedUITree` in as this function, so the
cast reuses genui's EXACT validation discipline with ZERO genui-file churn and
no core→genui (renderer) edge — preserving the product boundary and keeping the
core pure. genui's internals are untouched; this is the only seam between them.

RESOLVED (open question #8 — the injected validator's error SHAPE). We pin the
narrowest contract that lets the cast surface a structured rejection: a success
or a failure carrying `error.message` (plus an optional `error.path`). This is
genui's existing `validateGeneratedUITree` return shape, so the host injects it
verbatim (no adapter). The cast NORMALIZES it into its own `ProposalRejection`
so both
targets reject through one `ProposalResult` shape — a foreign validator that
conforms to the type slots in cleanly, but a malformed model tree never reaches
a renderer because only `ok: true` mints the envelope.

## Parameters

### node

`GeneratedUINode`

### catalog

`ComponentCatalog`

## Returns

\{ `ok`: `true`; \} \| \{ `error`: \{ `message`: `string`; `path?`: `string`; \}; `ok`: `false`; \}
