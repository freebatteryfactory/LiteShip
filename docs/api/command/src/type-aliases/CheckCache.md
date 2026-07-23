[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckCache

# Type Alias: CheckCache

> **CheckCache** = `"content-addressed"` \| `"none"`

Defined in: [command/src/checks/definition.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L71)

The cache discipline for a check's verdict.
- `content-addressed` — the verdict is a pure function of the check definition's declared `inputs`;
  a warm run may SKIP it when no covered byte changed (reusing the verdict-cache
  pattern of `@liteship/gauntlet`'s `verdict-cache.ts`). SOUND only when `inputs`
  captures everything that affects the verdict.
- `none` — the verdict is NOT a pure function of source (timing, environment, network,
  or flake-sensitive): it ALWAYS re-runs, never caches.
