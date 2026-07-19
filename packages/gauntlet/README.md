# @liteship/gauntlet

The self-proving, extendable rigor engine — gates, findings, assurance levels (L0–L4), the authority ratchet, and `defineFactGate` (evidence-bound gates). It is the contract every LiteShip fitness function speaks, and the one a downstream project extends.

> You usually don't run this directly — it arrives via `liteship check` in [@liteship/cli](https://www.npmjs.com/package/@liteship/cli), which builds the repo-IR and runs LiteShip's gates for you. Install it directly only to author and compose your own gates.

## Install

```bash
pnpm add @liteship/gauntlet
```

No `effect`, no `typescript` — the engine is deliberately lean. It defines the `RepoIR` type but never parses; the heavy oracles are host-injected (that work lives in `@liteship/audit`, which depends on the gauntlet, not the reverse).

## 30 seconds

```ts
import { defineGate, finding, memoryContext, runGates } from '@liteship/gauntlet';

// A gate is (context) => Finding[]. It ships its own red/green/mutation
// fixtures — that is how it EARNS blocking authority instead of being granted it.
const noFixme = defineGate({
  id: 'no-fixme',
  level: 'L2',
  describe: 'No FIXME left in source.',
  run: (ctx) =>
    ctx.files()
      .filter((f) => ctx.readFile(f)?.includes('FIXME'))
      .map((f) => finding({ ruleId: 'no-fixme', severity: 'error', level: 'L2', title: 'FIXME found', detail: `${f} still carries a FIXME.`, location: { file: f } })),
  fixtures: {
    red: { name: 'has-fixme', context: memoryContext({ 'a.ts': '// FIXME later' }) },
    green: { name: 'clean', context: memoryContext({ 'a.ts': 'export const x = 1;' }) },
    mutation: { describe: 'never flags', mutate: (g) => ({ ...g, run: () => [] }) },
  },
});

const result = runGates([noFixme], memoryContext({ 'src/app.ts': '// FIXME' }));
console.log(result.blocked);          // true — the gate self-proved, so its error blocks
console.log(result.findings[0].detail);
```

`runGates` first verifies each gate against its own fixtures: the red must flag, the green must pass clean, and the mutation must break one of them. A gate that proves itself blocks; one that can't is demoted to `advisory` and runs anyway. Compose your own gates alongside `LITESHIP_GATES` — the same ratchet qualifies all of them.

## Where it sits

This is the floor of LiteShip's rigor stack. It owns the vocabulary — `Finding`, `AssuranceLevel`, `Gate`, `Waiver`, `RepoIR` — and the engine that runs and qualifies gates. Its only `@liteship` dependency is `@liteship/error`, whose tagged failures project to `Finding`s via `fromError`. It carries no parser by design: a `Gate` reads the world only through `GateContext`, so the same gate runs against a `memoryContext` fixture and against the real repo unchanged. `@liteship/audit` builds the triangulated `RepoIR` and the AST oracles and injects them; `@liteship/cli` hosts the run. For the gate-as-data variant whose decision is bounded to a declared `FactBundle`, see `defineFactGate`. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If a gate won't block

The authority ratchet is the usual surprise: a gate whose findings stay `advisory` has not self-proven. Check its fixtures — the `red` must produce at least one finding, the `green` must produce none, and the `mutation` must make one of those fail. A gate that can't demonstrate catching its own target is advisory forever, on purpose.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [ADR-0023 — the gauntlet rigor engine](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/adr/0023-gauntlet-rigor-engine.md) — the design and the authority ratchet
- [ADR-0019 — FactGate, evidence-bound gates](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/adr/0019-factgate-evidence-bound-gates.md)
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/gauntlet/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
