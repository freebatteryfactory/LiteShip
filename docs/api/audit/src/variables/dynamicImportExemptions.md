[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / dynamicImportExemptions

# Variable: dynamicImportExemptions

> `const` **dynamicImportExemptions**: `ReadonlySet`\<`string`\>

Defined in: [audit/src/policy.ts:274](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/policy.ts#L274)

Dynamic package imports — `import('@czap/...')` — that are deliberately
allowed despite the importer not declaring the target in its package.json.
Format: `"<importer> -> <target>"`. Everything else that dynamic-imports a
workspace package absent from its manifest is flagged
(`missing-manifest-dependency-dynamic`) so dynamic edges can't smuggle a
dependency past the static audit. (CUT A1 — A1-T3.)
