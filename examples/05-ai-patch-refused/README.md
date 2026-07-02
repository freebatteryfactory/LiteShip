# 05 — The AI patch that gets refused

**The catnip demo.** LiteShip lets a model _propose_ changes to your UI graph, but a
model can never _make_ one. This example makes that safety seam visible.

## What it shows

The AI cast is two steps that cannot be collapsed into one:

1. **`AICast.validateGraphPatchProposal(graph, patch)`** — cast IN. Check an untrusted
   model proposal against the graph it was cast from.
2. **`AICast.applyValidatedPatch(graph, proposal)`** — a separate, host-authorized step
   whose _only_ input is a validation-minted `ValidatedProposal`.

There is no public constructor for `ValidatedProposal`, so a host cannot fabricate one.
Raw model output is **physically un-appliable** — the type system and the runtime both
refuse the bypass.

The page runs four "model proposals" through the same seam:

- ✅ a well-formed proposal that fits the graph → validated → **applied** (the graph
  re-addresses to a new content hash);
- ❌ a proposal cast against a **different** graph (base mismatch) → **refused**;
- ❌ a proposal with an **edge to a node that does not exist** → **refused**;
- ❌ a **hallucinated, off-version** envelope → **refused**.

The load-bearing property: **after every refusal, the graph is byte-identical.** No
hallucinated, off-graph, or off-version output ever reaches the truth.

## Run it

```sh
pnpm --filter @czap/example-ai-patch-refused dev
# or, from this directory:
pnpm dev
```

The whole demo runs at build time in `src/pages/index.astro` — the seam is pure
`@czap/core`, so it needs no server, no boundaries, and no client directives.

## Why this is the keystone

Most "AI UI" tools let the model's raw output mutate state directly. LiteShip's thesis
is the opposite: **suggestions become validated patches, or they become nothing.** This
is the one example to read first if you want to understand what LiteShip is _for_.
