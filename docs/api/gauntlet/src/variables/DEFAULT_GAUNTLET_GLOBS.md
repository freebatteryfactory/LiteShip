[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / DEFAULT\_GAUNTLET\_GLOBS

# Variable: DEFAULT\_GAUNTLET\_GLOBS

> `const` **DEFAULT\_GAUNTLET\_GLOBS**: readonly `string`[]

Defined in: [gauntlet/src/runner.ts:330](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L330)

The default JUDGED scope: every package's TypeScript source. This is the surface the
gates FLAG findings on — narrow on purpose (a gate must not red a finding outside the
published, downstream-installable tree).

The CONFIRMER EVIDENCE a claim-vs-reality gate reads (the test corpus a determinism /
round-trip test lives in) is NOT judged — it is read through the context's unscoped
`allFiles()` (see [nodeContext](../functions/nodeContext.md)'s `confirmerGlobs`), so it never enters this
judged scope and never makes another gate (no-placeholder, traceability) fire on a
test file. Keeping the judged scope at published source while the confirmer corpus
reads the test tree is the precise fix for the claim-property honesty bug WITHOUT the
collateral of broadening every gate's judged surface.
