# liteship-app

Minimal Astro + `@czap/*` starter from `create-liteship`.

## Run

```sh
pnpm install
pnpm dev
```

## Optional: generated UI catalog

This scaffold ships `@czap/core` and `@czap/astro` only. For structured LLM UI (closed catalog rendering instead of model HTML):

```sh
pnpm add @czap/genui
```

Register components with `defineComponentCatalog`, pass `genuiCatalog` to `createLLMSession`, or add `data-czap-genui` on a `client:llm` element. See [GETTING-STARTED — Generated UI](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md#generated-ui-with-a-component-catalog).
