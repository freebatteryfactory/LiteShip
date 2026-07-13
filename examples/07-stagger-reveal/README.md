# Stagger reveal preset (#124)

Committed `Stagger.intent` data for the motion vertical slice. The preset is compiled in
`tests/unit/examples/stagger-reveal-dogfood.test.ts` — not a standalone runnable app.

See [`GETTING-STARTED.md`](../../GETTING-STARTED.md) for the learning path; core stagger
machinery lives in `@czap/core` / `@czap/compiler`.

## Multi-step composition (#141)

A stagger is a **par** composition: N children animating together, each offset by a
compile-time delay. `staggerProgram(lowered)` turns a `LoweredStagger` into a real
`TransitionProgram` (`{ kind: 'par', children: [...] }`), so `interpretProgram` emits
genuine per-child windows — `par` total is the `max` child window, and each child's
stagger delay rides its window start — instead of the pre-W9 routing-label collapse
(see [ADR-0039](../../docs/adr/0039-multi-transition-algebra.md)).

For a **seq** (a chain: "A then B") plus a **choice** ("A or B" by signal), author with
`Reveal.chain` (`lowerRevealChain`). The runnable end-to-end demo — a chain driven
through the `client:motion` floor — is `examples/showcase` → `/motion-chain`
(`src/server/motion-chain.ts`).
