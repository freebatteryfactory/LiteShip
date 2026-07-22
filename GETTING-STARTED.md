# Getting started with LiteShip

From `pnpm add` to a visible adaptive result in about five minutes. The paved road has three moves: **define** with `defineAdaptive`, **apply** with `attrs()` and `plan()`, and **inspect** with `explain()`. Boundaries, host helpers, and target compilers remain available later as explicit escape hatches.

LiteShip / `@liteship/*` naming: [GLOSSARY.md](./GLOSSARY.md). For Cloudflare Workers hosting, see [HOSTING.md](./HOSTING.md#cloudflare-workers) and [examples/cloudflare-astro/](./examples/cloudflare-astro/). Contributing to LiteShip itself (cloning the monorepo, building, running the gauntlet) is a different path: [CONTRIBUTING.md](./CONTRIBUTING.md).

## Prerequisites

- Node.js 22.13+
- pnpm 10+
- An Astro 7 project (`pnpm create astro@latest` if you don't have one)

## 1. Install

In your Astro project:

```bash
pnpm add liteship
```

`liteship` is the one-dependency facade over the whole stack: authoring verbs import from the `liteship` root, and host surfaces ride domain subpaths like `liteship/astro`. One package, one import path — the same wiring `pnpm create liteship` scaffolds.

## 2. Define the adaptive behavior

One definition owns the input, named states, and style differences. Put it in a module the page can import:

```ts
// src/adaptive.ts
import { defineAdaptive } from 'liteship';

export const layout = defineAdaptive({
  boundary: {
    input: 'viewport.width',
    at: [[0, 'mobile'], [768, 'tablet'], [1280, 'desktop']],
  },
  style: {
    base: { properties: { display: 'grid', gap: '1rem', 'grid-template-columns': '1fr' } },
    states: {
      tablet: { properties: { 'grid-template-columns': 'repeat(2, 1fr)' } },
      desktop: { properties: { 'grid-template-columns': 'repeat(3, 1fr)' } },
    },
  },
});
```

`layout.boundary`, `layout.style`, and their content labels are the same objects the lower-level constructors produce. `defineAdaptive` is composition over those owners, not a second implementation.

## 3. Apply it, then inspect it

The official scaffold already registers the Astro integration. In an existing Astro project, add it once:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import { integration } from 'liteship/astro';

export default defineConfig({
  integrations: [integration()],
});
```

The page uses the definition directly. `attrs()` applies the runtime identity, `plan()` returns matching compiled CSS, and `explain()` makes the decision inspectable:

```astro
---
import { layout } from '../adaptive.js';

const plan = layout.plan();
const preview = layout.explain(940);
---

<main {...layout.attrs()}>
  At 940px the selected state is <strong>{preview.boundary.state}</strong>.
</main>
<style is:inline set:html={plan.css}></style>
```

Run `pnpm dev` and drag the window edge. The state marker changes `mobile` → `tablet` → `desktop`, while the emitted CSS comes from the same definition. Use `layout.explain(currentWidth)` when you need the selected state, satisfied thresholds, style source, admitted targets, and aggregate identity. Do not hand-author `data-liteship-*`; `attrs()` owns that serialization contract.

## Generated UI with a component catalog

For `client:llm` streaming, LiteShip can render **structured UI trees** instead of model-emitted HTML. You define which components exist; the model references them by name. LiteShip validates props and renders through a trusted catalog — interactions surface as DOM events for your app to handle.

The generated-UI surface ships in `@liteship/genui` (already installed with `liteship`; it doesn't yet ride a `liteship/*` subpath, so import it directly). Register a catalog (component names, prop schemas, allowed children):

```ts
// src/genui-catalog.ts
import { defineComponentCatalog } from '@liteship/genui';

export const appCatalog = defineComponentCatalog({
  version: 'app-1',
  components: {
    Card: {
      tag: 'section',
      props: { title: { type: 'string', required: true } },
      children: 'optional',
      allowedChildNames: ['Text'],
    },
    Text: {
      tag: 'p',
      props: { text: { type: 'string', required: true } },
      children: 'none',
    },
  },
});
```

Wire the catalog into an LLM session (or add `data-liteship-genui` on the directive root to use the built-in demo catalog). Stream chunks use the discriminator `{ "_genui": true, "name": "...", "props": { ... } }` — legacy token/text paths stay unchanged when the marker is absent.

```ts
import { createLLMSession } from '@liteship/astro/runtime';
import { appCatalog } from './genui-catalog.js';

const session = createLLMSession({
  element,
  target,
  mode: 'replace',
  getDeviceTier: () => 'animations',
  genuiCatalog: appCatalog,
});
```

Rendered output carries `data-liteship-genui-render-hash` for cache/replay; click handlers emit `genui:interaction` on the directive root — your app decides what they mean (navigation, tool call, or nothing). LiteShip owns render **safety**; it does not own render **authority**.

## Dev inspector (astro dev only)

While running `pnpm dev`, open the liteship boundary inspector from the Astro dev-toolbar (click the liteship toolbar icon) — a panel that lists every `[data-liteship-boundary]` element, live signal values, draggable threshold notches, and a **Copy defineBoundary** button for paste-back into source. DOM edits are session-only (source files are untouched). Opt out with `integration({ inspector: false })` in `astro.config.mjs`.

<!-- gif: inspector dev-toolbar app tuning thresholds and copying snippet -->

## Lower-level boundary and host escape hatches

Use the lower-level route when a host integration needs to own assembly or when you are extending LiteShip itself:

```ts
import { defineBoundary } from 'liteship';
import { adaptiveAttrs } from 'liteship/astro';

const viewport = defineBoundary({
  input: 'viewport.width',
  at: [[0, 'mobile'], [768, 'tablet'], [1280, 'desktop']],
});

const attrs = adaptiveAttrs({ boundary: viewport });
```

`defineBoundary` exposes the continuous-to-named-state contract directly. `adaptiveAttrs` adds Astro-specific serialization and options. They are supported public APIs, but they require the author to assemble style compilation and inspection explicitly; start with `defineAdaptive` unless that control is the reason you are here. The package-owned `Adaptive` component (`import Adaptive from '@liteship/astro/Adaptive'`) wraps the same host attributes.

## 4. Use a target compiler directly

`defineAdaptive(...).plan()` is the default CSS route. Target and integration authors can compile a lower-level boundary directly. The compilers ride the `liteship/compiler` subpath — already installed with `liteship`, nothing new to add.

`compile()` takes the boundary, a per-state property map, and an optional selector:

```ts
import { CSSCompiler } from 'liteship/compiler';
import { viewport } from './boundaries.js';

const result = CSSCompiler.compile(
  viewport,
  {
    mobile: { 'font-size': '14px', padding: '0.5rem' },
    tablet: { 'font-size': '16px', padding: '1rem' },
    desktop: { 'font-size': '18px', padding: '2rem' },
  },
  '.card',
);

// `.raw` is the serialized CSS string; `.containerRules` is the
// structured form (rule per state) you'd feed into a build pipeline.
console.log(result.raw);
// @container viewport-width (...) { .card { font-size: 14px; padding: 0.5rem } }
// @container viewport-width (...) { .card { font-size: 16px; padding: 1rem } }
// @container viewport-width (...) { .card { font-size: 18px; padding: 2rem } }

// You can also call CSSCompiler.serialize(result) to produce the same
// string from the structured form. Handy when you want to inspect
// individual rules first.
```

Give `result.raw` a home in the page — paste it into a `<style is:global>` block (Astro scopes plain `<style>` blocks, which would rename the `.card` selector out from under the compiled rules), or write it to a CSS file your build imports:

```astro
<style is:global>
  /* `result.raw` goes here: the rules keyed on `.card`.
     Re-run the compile after editing the boundary so the CSS and the
     serialized boundary stay in agreement. */
</style>
```

The compile step and the page must share one definition: the boundary's content address changes whenever the definition does, and CSS emitted against a stale definition stops matching. The paved-road `plan()` method keeps that ownership together automatically.

## 5. The return leg (accept edits from the client)

Everything so far flows server → client. The mutation channel is the other
direction: a client proposes a `GraphPatch`, and the server validates it
against its own current truth before anything mutates — the same refuse-seam an
AI proposal passes through ([`examples/05-ai-patch-refused`](./examples/05-ai-patch-refused)).

Server side is one route; you own the endpoint and the store:

```ts
// src/pages/api/graph.ts
import type { APIRoute } from 'astro';
import { graphMutationRoute } from 'liteship/astro';
import { store } from '../../server/graph-store'; // your GraphStore: loadGraph + compare-and-swap saveGraph

export const prerender = false;
export const POST: APIRoute = ({ request }) => graphMutationRoute(store)(request);
```

Client side, `createGraphMutationClient` tracks the current base and serializes
submits, and `bindGraphForm` (from `liteship/runtime`) turns a form submit into a
validated patch:

```ts
import { createGraphMutationClient } from 'liteship/graph';
import { bindGraphForm } from 'liteship/runtime';

const client = createGraphMutationClient({ url: '/api/graph', base, refreshBase });
bindGraphForm(form, { client, toOps: (data, base) => [/* your sealed ops */] });
```

Three outcomes, one shape: `applied` (the new sealed graph — the client adopts
it), `refused` (invalid proposal — the server graph is byte-identical), and
`error`. A refusal carrying `staleBase: true` (HTTP 409) means the server's
truth moved past your base; with `refreshBase` wired, the client reloads and
re-proposes automatically, within a bound. Two users editing the same dashboard
stop clobbering each other for free.

The worked, runnable version is [`examples/06-mutation-roundtrip`](./examples/06-mutation-roundtrip);
the design is [ADR-0031](./docs/adr/0031-form-mutation-binding-primitive.md).

## 6. Where to go from here

- [`examples/README.md`](./examples/README.md): the examples ladder — start with [`examples/tutorial`](./examples/tutorial) (five guided pages from boundaries to streaming/LLM), climb to the AI-refusal keystone, finish at [`examples/06-mutation-roundtrip`](./examples/06-mutation-roundtrip) (client→server return leg), and see [`examples/07-stagger-reveal`](./examples/07-stagger-reveal) for a committed stagger preset (#124)
- [AUTHORING-MODEL.md](./AUTHORING-MODEL.md): tokens, styles, and themes — the layer above boundaries (axis-varying values, per-state property sets, multi-variant theming), opening with a one-paragraph "what it feels like to author"
- [ASTRO-STATIC-MENTAL-MODEL.md](./ASTRO-STATIC-MENTAL-MODEL.md): signals → boundaries → named states → outputs, the theory-first frame
- [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md): how Astro hosts the runtime, directives, and the escalation path
- [HOSTING.md](./HOSTING.md): host-application first-hour checklist (CSP, Trusted Types, common failure modes)
- [docs/api/](./docs/api): generated API reference for every package (e.g. `Boundary.evaluate` for evaluating a boundary against sample values outside the DOM)
- [DOCS.md](./DOCS.md): full documentation map

## Migrating existing sources

The `liteship/migrate` subpath provides `fromMediaQueries`, `fromContainerQueries`, `fromDesignTokens`, `fromTailwindTheme`, and `fromCSSCustomProperties`. DTCG input is pinned to the 2025.10 format contract.

Adapters return ordinary LiteShip definitions plus diagnostics. Unsupported or lossy input is reported or refused; it is never silently widened. Migration is a conversion step, not a compatibility runtime, so resolve the diagnostics and commit the resulting LiteShip definitions as application source.

## Working on LiteShip itself

The contributor path (cloning the monorepo, workspace install, Playwright browsers, `pnpm run build` with composite project references, the test loop and the full gauntlet) lives in [CONTRIBUTING.md](./CONTRIBUTING.md). The short version:

```bash
git clone https://github.com/freebatteryfactory/LiteShip.git
cd LiteShip
pnpm install
pnpm verify   # first-run aggregate ending in the quick check profile
```

`pnpm scripts` prints the categorized index of all dev scripts; `pnpm run doctor` is the on-demand preflight environment check.

## Troubleshooting

### Adaptive authoring

**The same value evaluates to different states each call.** You probably reused a state name across the threshold list. `defineBoundary` requires unique state names; passing `[[0, 'small'], [768, 'small']]` throws at construction with a `LiteshipValidationError`. If the error fires at runtime in a hot path, the boundary was constructed lazily inside a render function — hoist it out.

**The CSS doesn't update when the window resizes.** Confirm the Astro integration is registered, spread `layout.attrs()` without overwriting its `class`, and emit `layout.plan().css`. On the lower-level route, confirm `adaptiveAttrs()` supplied the directive marker and rebuild after changing the boundary.

**A GPU shader (or other directive) never starts on an element that also carries `adaptiveAttrs`.** Two liteship directives on one element collide — each takes over the node, so `adaptiveAttrs()` (which stamps `data-liteship-directive="adaptive"`) and a `client:gpu` on the same canvas silently fight, and one loses (usually the shader). The console warns once (`directive-collision:…`) naming both. Put each directive on its own element.

**The boundary state flickers when dragging the window edge near a threshold.** Add or increase `hysteresis`. The field is optional and the default is zero (no dead-zone). A value of 16–24 px is enough to absorb display jitter on most setups; the algorithm is a half-width dead-zone, so `hysteresis: 20` requires the signal to move 10px past the threshold before committing the transition.

**`Boundary.evaluate` returns the wrong state for a value at exactly a threshold.** That's by design: thresholds are inclusive lower bounds. A boundary with `[[0, 'mobile'], [768, 'tablet']]` returns `'tablet'` for `768`, not `'mobile'`. If you need exclusive bounds, offset the threshold by 1.

### Repo development

**PowerShell shows `Γåô` / `Γ£ô` mojibake in logs.** Your terminal is decoding the repo tooling's UTF-8 output as cp437. Use `Out-File -Encoding utf8` or run `chcp 65001` first.

**Tests hang in browser mode.** Make sure Playwright browsers are installed: `pnpm exec playwright install`.

Found a different issue? Open one at [github.com/freebatteryfactory/LiteShip/issues](https://github.com/freebatteryfactory/LiteShip/issues).
