[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / liteshipDevopsProfile

# Variable: liteshipDevopsProfile

> `const` **liteshipDevopsProfile**: [`DevopsProfile`](../interfaces/DevopsProfile.md)

Defined in: [audit/src/devops-profile.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/devops-profile.ts#L89)

LiteShip's own profile — the reference DEFAULT. It references this package's
policy consts verbatim; `repoRoot` defaults to the current working directory
(for in-repo `pnpm run audit`, run from the repo root). Tests and downstream
callers point it elsewhere with `withRepoRoot`.
