[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/testing](../README.md) / HarnessLane

# Type Alias: HarnessLane

> **HarnessLane** = `"unit"` \| `"bench"` \| `"integration"`

Defined in: core/dist/harness/scene-composition.d.ts:46

The lanes a generated check can run in. `unit` checks land in the `.test.ts`
file (run by `pnpm test`); `bench` checks land in the `.bench.ts` file (run
by `pnpm run bench`). `integration` is reserved for the siteAdapter arm — the
union carries it as a clean extension point but no arm emits it yet.
