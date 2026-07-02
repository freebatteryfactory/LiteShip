# liteship-app

Minimal Astro + `@czap/*` starter from `create-liteship`.

The mental model in one line: a continuous **signal** crosses a **boundary** into named
states, those states seal into a **graph**, and **casts** project that graph to outputs
(CSS, ARIA, GPU, video). See [the authoring model](https://github.com/freebatteryfactory/LiteShip/blob/main/AUTHORING-MODEL.md).

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

Register components with `defineComponentCatalog`, pass `genuiCatalog` to `createLLMSession`, or add `data-czap-genui` on a `client:llm` element. See [GETTING-STARTED — Generated UI](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md#generated-ui-with-a-component-catalog).
