[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ContentAddress

# Type Alias: ContentAddress

> **ContentAddress** = `string` & `object`

Defined in: [\_spine/core.d.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L81)

Content-addressed hash (FNV-1a, fnv1a:hex format).

APEX of THREE intentional homes (ADR-0013) — do NOT merge them. This spine
type is the strictest: a symbol-brand, so a raw `fnv1a:...` string cannot be
typed as ContentAddress without a validating constructor. `@liteship/core` and
`@liteship/genui` re-anchor this brand (`type ContentAddress = _ContentAddress`)
with validating constructors; `@liteship/canonical` is intentionally zero-dep
(only `@liteship/error`) and uses a `` `fnv1a:${string}` `` template-literal brand
instead. Merging the homes would either break canonical's zero-dep property or
weaken this symbol-brand to a template literal. The three are parity-guarded at
runtime by tests/unit/core/schema/brand-validators.test.ts ("ContentAddress three-home
parity drift-guard").

## Type Declaration

### \[ContentAddressBrand\]

> `readonly` **\[ContentAddressBrand\]**: `true`
