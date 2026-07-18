[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / SpineTypeAdmission

# Interface: SpineTypeAdmission

Defined in: [audit/src/spine-relation-build.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L53)

One admitted mirror type — the host-supplied seed row (frozen from the current
spine-conformance pins). `spineExpr` is the type expression under the `@czap/_spine`
namespace (e.g. `CompositeState`, `Codec.Shape<{ readonly a: 1 }, { readonly a: 1 }>`,
`Millis`); `runtimeExpr` the expression under the runtime module's namespace;
`runtimeModule` the repo-relative `.ts` source path of the runtime producer.

## Properties

### admittedRelation

> `readonly` **admittedRelation**: `SurfaceRelation`

Defined in: [audit/src/spine-relation-build.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L56)

***

### authority

> `readonly` **authority**: `SpineAuthority`

Defined in: [audit/src/spine-relation-build.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L55)

***

### runtimeExpr

> `readonly` **runtimeExpr**: `string`

Defined in: [audit/src/spine-relation-build.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L59)

***

### runtimeModule

> `readonly` **runtimeModule**: `string`

Defined in: [audit/src/spine-relation-build.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L58)

***

### spineExpr

> `readonly` **spineExpr**: `string`

Defined in: [audit/src/spine-relation-build.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L57)

***

### typeName

> `readonly` **typeName**: `string`

Defined in: [audit/src/spine-relation-build.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/spine-relation-build.ts#L54)
