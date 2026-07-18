# LiteShip examples — a ladder

Each folder adds one idea. New here? Climb in order — the early rungs teach authoring,
the later ones show what makes LiteShip different from a CSS framework.

The whole ladder is one sentence: **a continuous signal crosses a boundary into named
states, those states seal into a graph, and casts project that graph to outputs.**

## Climb in order

| Rung | Folder | What it teaches |
|---|---|---|
| 1 · author | [`tutorial/`](./tutorial) | `Boundary.make` + tokens + themes — quantize a signal into named states and style them |
| 2 · cast to ARIA | [`03-cast-aria/`](./03-cast-aria) | one `@quantize` block casts a boundary to CSS **and** ARIA at once |
| 3 · cast to the GPU | [`showcase/`](./showcase) | drive a WGSL shader uniform from a boundary (plus workers, streaming, LLM, **graph-native stream recovery** at `/stream-recovery` — emit → attest → replay, the **continuous-motion floor** at `/motion` — one intent, native `animation-timeline` + JS floor from one kernel, and **responsive media under Save-Data** at `/responsive-media` — one `selectCandidates` law behind every srcset/source/preload) |
| 4 · **the keystone** | [`05-ai-patch-refused/`](./05-ai-patch-refused) | a model's invalid `GraphPatch` is **refused**; only a validated proposal changes the graph |
| 5 · the return leg | [`06-mutation-roundtrip/`](./06-mutation-roundtrip) | `createGraphMutationClient` + `bindGraphForm`: a form submit becomes a validated `GraphPatch`; stale bases are refused (`staleBase`/409) and auto-recovered — the refuse-seam both ways |
| 6 · cast to video | [`remotion-demo/`](./remotion-demo) | the same DocumentGraph renders to video, headless |
| 7 · stagger reveal | [`07-stagger-reveal/`](./07-stagger-reveal) | committed `Stagger.intent` preset + compile test (#124) |

If you only open one, open **[`05-ai-patch-refused/`](./05-ai-patch-refused)** — it's the
thesis in ~40 lines: the graph is the single truth, and the one way to change it is a
validated patch. Three of its four model proposals are refused; one is applied and the
untouched property comes out byte-identical.

## Also here (not the learning path)

- [`default/`](./default) — the minimal `npm create liteship` starter.
- [`cloudflare-astro/`](./cloudflare-astro) — the boundary manifest cached in edge KV on Cloudflare.
- `scenes/` — shared test fixtures, not a runnable example.

## Running any of them

```sh
pnpm install
pnpm --filter <example-package-name> dev   # or: cd examples/<folder> && pnpm dev
```

Inside the monorepo the examples resolve the workspace `@czap/*`. Copying an example out
standalone, pin `@czap/*` at `^0.16.0`.
