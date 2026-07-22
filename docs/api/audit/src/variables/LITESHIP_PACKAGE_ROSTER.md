[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / LITESHIP\_PACKAGE\_ROSTER

# Variable: LITESHIP\_PACKAGE\_ROSTER

> `const` **LITESHIP\_PACKAGE\_ROSTER**: readonly `string`[] = `GENERATED_LITESHIP_PACKAGE_ROSTER`

Defined in: [audit/src/consumer.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L32)

The dependency-ordered scoped fleet projection authored in
`scripts/package-catalog.ts`. Manifests remain the independent packaging
oracle; this public wrapper preserves the established `readonly string[]`
API while the generated tuple preserves exact values internally.
