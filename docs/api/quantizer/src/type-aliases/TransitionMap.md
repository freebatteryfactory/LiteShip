[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / TransitionMap

# Type Alias: TransitionMap\<S\>

> **TransitionMap**\<`S`\> = `object` & `` { readonly [K in `${S}->${S}`]?: TransitionConfig } ``

Defined in: [quantizer/src/transition.ts:42](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/transition.ts#L42)

State-transition map keyed by `"from->to"` literal or `"*"` wildcard.

Lookup resolves exact keys first, then the wildcard, then falls back to
an instantaneous transition (duration: 0).

The key template is generic over the state union `S`, so with a concrete
boundary (`TransitionMap<'mobile' | 'tablet'>`) only real `from->to`
pairs type-check — keys like `'*->*'` (which never match at runtime;
the any-to-any wildcard is `'*'`) are compile errors, not silent
duration-0 transitions.

## Type Declaration

### \*?

> `readonly` `optional` **\*?**: [`TransitionConfig`](../interfaces/TransitionConfig.md)

Wildcard fallback applied when no exact `from->to` key matches.

## Type Parameters

### S

`S` *extends* `string` = `string`
