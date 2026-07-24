# liteship tutorial

Five guided pages, one idea each. Every page is step-numbered prose with a live
demo at the bottom and a "Next →" link to the following page — read the source
beside the running page; the comments carry the story.

When installing from npm (outside the monorepo), pin `@liteship/*` packages at `^0.19.0`.

## Run it

```bash
pnpm install
pnpm dev
```

Open the printed URL and start at `/01-boundary`.

## The five pages

| Page | What it teaches |
|---|---|
| `01-boundary` | `defineBoundary` — quantize a continuous signal (viewport width) into named states; resize across 768px and watch `data-liteship-state` flip |
| `02-tokens` | `defineToken` + `@token` blocks — axis-varying values compiled to `--liteship-*` custom properties |
| `03-themes` | `defineTheme` / `Theme.tap` — multi-variant theming over the same tokens |
| `04-streaming` | `client:stream` — server-sent patches morphed into the live DOM with focus and scroll preserved, and how to opt a client-owned subtree out entirely |
| `05-llm` | `client:llm` — LLM token streaming, the CapTier ABR ladder, and the optional generated-UI catalog path |

Then climb the rest of the [examples ladder](../README.md): the AI-refusal
keystone (`05-ai-patch-refused/`) and the client→server return leg
(`06-mutation-roundtrip/`).
