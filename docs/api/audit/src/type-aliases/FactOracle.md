[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / FactOracle

# Type Alias: FactOracle

> **FactOracle** = (`input`) => readonly [`Fact`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)[]

Defined in: [audit/src/repo-ir-build.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/repo-ir-build.ts#L104)

A host-supplied fact oracle — the injection hook that keeps `@czap/audit`
LiteShip-agnostic (ADR-0012). It is a PURE function the host passes to
[buildRepoIR](../functions/buildRepoIR.md): given one source file's raw text + path + owning package,
it returns the [Fact](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)s it observes. `buildRepoIR` invokes each injected
oracle per file and merges the returned facts into the single IR, knowing
NOTHING about what they check.

This is where a repo-LOCAL rule set enters the IR WITHOUT the engine importing
it. The canonical example is the host's `invariant-regex` oracle: the CLI (which
deps `@czap/command`) constructs an oracle that runs LiteShip's
`NO_DEFAULT_EXPORT` rule over the file text and emits `is-default-export`
`text-only` facts — the audit engine never sees `@czap/command`. The generic
structural facts (`is-default-export` via AST, `bare-throw`) STAY in audit
because they are facts EVERY TS repo has, not LiteShip config.

Text-only oracles work off `text` + `file`; an oracle that needs the parsed
tree is given the canonical `sourceFile` (the very `ts.SourceFile` audit
walked). The contract is: emit Facts whose `file` IS the passed `file` (so the
fact lands on a real IR node) — `buildRepoIR` rejects a dangling fact via
`makeRepoIR`, exactly as for its own facts.

## Parameters

### input

#### file

`FileId`

#### packageName

`PkgName` \| `null`

#### sourceFile

`ts.SourceFile`

#### text

`string`

## Returns

readonly [`Fact`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)[]
