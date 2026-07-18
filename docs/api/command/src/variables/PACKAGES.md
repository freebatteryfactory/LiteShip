[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PACKAGES

# Variable: PACKAGES

> `const` **PACKAGES**: readonly [`PackageSmokeSpec`](../interfaces/PackageSmokeSpec.md)[]

Defined in: [command/src/commands/package-smoke-registry.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/package-smoke-registry.ts#L43)

Mirrors every publishable scope under `packages/*` (see `pnpm-workspace.yaml`).

The MEMBERSHIP of this roster (the `name` set) is owned by
`scripts/gen-roster.ts` (`PUBLISHABLE_ROSTER` = the `@czap/*` fleet plus the
`create-liteship` / `liteship` umbrellas). This copy stays local — and keeps
its hand-authored `imports` / `dir` fields — because `@czap/command` sits below
the devops layer and cannot import the generator; parity with the canonical
roster is enforced by the `package-smoke-roster` drift-guard, which asserts
these names equal gen-roster's `PUBLISHABLE_ROSTER`.

The `@czap/*` subset of these names (and their dependency ORDER) is likewise the
[DUP] province of `@czap/audit`'s `CZAP_PACKAGE_ROSTER`, the canonical owner. This
copy stays local by the SAME layering — `@czap/command` cannot depend on the
devops-layer `@czap/audit` — and its parity is held by the `package-smoke-roster`
drift-guard, not a shared import.
