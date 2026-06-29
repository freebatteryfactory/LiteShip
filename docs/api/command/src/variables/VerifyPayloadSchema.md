[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / VerifyPayloadSchema

# Variable: VerifyPayloadSchema

> `const` **VerifyPayloadSchema**: `Struct`\<\{ `capsule_id`: `NullOr`\<`String`\>; `checks`: `Struct`\<\{ `chain_link`: `Literal`\<`"skipped"`\>; `lockfile`: `Literal`\<`"skipped"`\>; `tarball_manifest`: `Union`\<readonly \[`Literal`\<`"match"`\>, `Literal`\<`"mismatch"`\>, `Literal`\<`"skipped"`\>\]\>; `workspace_manifest`: `Literal`\<`"skipped"`\>; \}\>; `mismatches`: `$Array`\<`String`\>; `tarball`: `String`; \}\>

Defined in: [command/src/commands/verify.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/verify.ts#L43)

Structured payload returned alongside a verdict — ONE Effect Schema is the
source of both [VerifyPayload](../type-aliases/VerifyPayload.md) and the descriptor's `outputSchema`.

`capsule_id` is modelled as a nullable string (its on-the-wire shape — a
`ContentAddress` is a branded string, and the brand is a phantom with no
JSON-Schema image), then the exported [VerifyPayload](../type-aliases/VerifyPayload.md) re-tightens that
single field to the `ContentAddress | null` brand consumers expect. There is
still exactly ONE schema; only the static type of the one branded field
narrows — no hand-written JSON-Schema lives beside it.
