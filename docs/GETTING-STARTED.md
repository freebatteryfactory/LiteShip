# Getting started with LiteShip

From `pnpm add` in your Astro project to a boundary changing state as you drag the window edge, in about five minutes. Two concepts get you there: `Boundary.make` and `satelliteAttrs`. Everything else (tokens, styles, casting to CSS) is layered behind links.

LiteShip / CZAP / `@czap/*` naming: [GLOSSARY.md](./GLOSSARY.md). For Cloudflare Workers hosting, see [hosting/cloudflare.md](./hosting/cloudflare.md) and [examples/cloudflare-astro/](../examples/cloudflare-astro/). Contributing to LiteShip itself (cloning the monorepo, building, running the gauntlet) is a different path: [CONTRIBUTING.md](../CONTRIBUTING.md).

## Prerequisites

- Node.js 22+
- pnpm 10+
- An Astro 6 project (`pnpm create astro@latest` if you don't have one)

## 1. Install

In your Astro project:

```bash
pnpm add @czap/core @czap/astro effect@beta
```

`effect` is `@czap/core`'s one peer dependency, and it must be the Effect **4 beta** (`effect@beta`) — a bare `pnpm add effect` installs the 3.x `latest` tag and fails the peer check. The [support matrix](../README.md#support-matrix) covers the pin and the stabilization plan.

## 2. Your first boundary

A boundary is a continuous-to-discrete signal mapping: here, viewport width → `{mobile, tablet, desktop}`. Put it in a module the rest of your project can import:

```ts
// src/boundaries.ts
import { Boundary } from '@czap/core';

export const viewport = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ],
  hysteresis: 20, // optional — default 0 (no dead-zone); see Troubleshooting
});
```

Thresholds are inclusive lower bounds sorted lowest-first, each with a unique state name. The returned definition is content-addressed: change the definition and its `id` changes with it.

## 3. Put it on the page and resize

Register the integration (it injects the client boot scanner that activates boundaries):

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import czap from '@czap/astro';

export default defineConfig({
  integrations: [czap()],
});
```

Then spread `satelliteAttrs` onto any element in a `.astro` page:

```astro
---
import { satelliteAttrs } from '@czap/astro';
import { viewport } from '../boundaries.js';
---

<div {...satelliteAttrs({ boundary: viewport })} class="card">
  Resize the window to see the boundary state change.
</div>
```

Run `pnpm dev`, open the page, and drag the window edge: the element's `data-czap-state` attribute flips `mobile` → `tablet` → `desktop`. Your CSS can key off it directly:

```css
.card[data-czap-state='mobile'] {
  padding: 0.5rem;
}
.card[data-czap-state='desktop'] {
  padding: 2rem;
}
```

`satelliteAttrs` serializes the boundary plus a `data-czap-directive="satellite"` marker; the integration's injected boot scanner activates the boundary evaluator on the client (only the evaluator — not a whole framework tree). The `Satellite` component (`import Satellite from '@czap/astro/Satellite'`) wraps the same attributes around a div for you, and you can also write the `data-czap-boundary` / `data-czap-directive` attributes yourself.

That's the whole layer-1 loop: define states, attach them to an element, let CSS respond.

## Generated UI with a component catalog

For `client:llm` streaming, LiteShip can render **structured UI trees** instead of model-emitted HTML. You define which components exist; the model references them by name. LiteShip validates props and renders through a trusted catalog — interactions surface as DOM events for your app to handle.

```bash
pnpm add @czap/genui
```

Register a catalog (component names, prop schemas, allowed children):

```ts
// src/genui-catalog.ts
import { defineComponentCatalog } from '@czap/genui';

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

Wire the catalog into an LLM session (or add `data-czap-genui` on the directive root to use the built-in demo catalog). Stream chunks use the discriminator `{ "_genui": true, "name": "...", "props": { ... } }` — legacy token/text paths stay unchanged when the marker is absent.

```ts
import { createLLMSession } from '@czap/astro/runtime';
import { appCatalog } from './genui-catalog.js';

const session = createLLMSession({
  element,
  target,
  mode: 'replace',
  getDeviceTier: () => 'animations',
  genuiCatalog: appCatalog,
});
```

Rendered output carries `data-czap-genui-render-hash` for cache/replay; click handlers emit `genui:interaction` on the directive root — your app decides what they mean (navigation, tool call, or nothing). LiteShip owns render **safety**; it does not own render **authority**.

## Dev inspector (astro dev only)

While running `pnpm dev`, press **Alt+Shift+C** to open the czap boundary inspector — a floating panel that lists every `[data-czap-boundary]` element, live signal values, draggable threshold notches, and a **Copy Boundary.make** button for paste-back into source. DOM edits are session-only (source files are untouched). Opt out with `czap({ inspector: false })` in `astro.config.mjs`.

<!-- gif: inspector overlay tuning thresholds and copying snippet -->

## 4. Cast to CSS (the compiler path)

Hand-written `[data-czap-state]` selectors work, but the same boundary can also emit its CSS. Add the compiler:

```bash
pnpm add @czap/compiler
```

`compile()` takes the boundary, a per-state property map, and an optional selector:

```ts
import { CSSCompiler } from '@czap/compiler';
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

The compile step and the page must share one definition (that's why step 2 put the boundary in `src/boundaries.ts`): the boundary's content address changes whenever the definition does, and CSS emitted against a stale definition stops matching.

## 5. Where to go from here

- [AUTHORING-MODEL.md](./AUTHORING-MODEL.md): tokens, styles, and themes — the layer above boundaries (axis-varying values, per-state property sets, multi-variant theming), opening with a one-paragraph "what it feels like to author"
- [ASTRO-STATIC-MENTAL-MODEL.md](./ASTRO-STATIC-MENTAL-MODEL.md): signals → boundaries → named states → outputs, the theory-first frame
- [ASTRO-RUNTIME-MODEL.md](./ASTRO-RUNTIME-MODEL.md): how Astro hosts the runtime, directives, and the escalation path
- [HOSTING.md](./HOSTING.md): host-application first-hour checklist (CSP, Trusted Types, common failure modes)
- [docs/api/](./api): generated API reference for every package (e.g. `Boundary.evaluate` for evaluating a boundary against sample values outside the DOM)
- [DOCS.md](./DOCS.md): full documentation map

## Working on LiteShip itself

The contributor path (cloning the monorepo, workspace install, Playwright browsers, `pnpm run build` with composite project references, the test loop and the full gauntlet) lives in [CONTRIBUTING.md](../CONTRIBUTING.md). The short version:

```bash
git clone https://github.com/heyoub/LiteShip.git
cd LiteShip
pnpm install
pnpm shakedown   # first-run aggregate: doctor → build → test
```

`pnpm scripts` prints the categorized index of all dev scripts; `pnpm run doctor` is the on-demand preflight rig-check.

## Troubleshooting

### First-boundary authoring

**The same value evaluates to different states each call.** You probably reused a state name across the threshold list. `Boundary.make` requires unique state names; passing `[[0, 'small'], [768, 'small']]` throws at construction with a `CzapValidationError`. If the error fires at runtime in a hot path, the boundary was constructed lazily inside a render function — hoist it out.

**The CSS doesn't update when the window resizes.** Two usual suspects: the element never got a directive marker (the boot scanner activates `data-czap-directive="satellite"` — emitted automatically by `Satellite` / `satelliteAttrs()` when a boundary is present; Astro's own `client:visible` / `client:idle` won't wire the boundary evaluator), or the CSS was generated against a stale boundary id (rebuild after editing the boundary; content addresses change with the definition, so old emitted CSS keys won't match the new id).

**The boundary state flickers when dragging the window edge near a threshold.** Add or increase `hysteresis`. The field is optional and the default is zero (no dead-zone). A value of 16–24 px is enough to absorb display jitter on most setups; the algorithm is a half-width dead-zone, so `hysteresis: 20` requires the signal to move 10px past the threshold before committing the transition.

**`Boundary.evaluate` returns the wrong state for a value at exactly a threshold.** That's by design: thresholds are inclusive lower bounds. A boundary with `[[0, 'mobile'], [768, 'tablet']]` returns `'tablet'` for `768`, not `'mobile'`. If you need exclusive bounds, offset the threshold by 1.

### Repo development

**PowerShell shows `Γåô` / `Γ£ô` mojibake in logs.** Your terminal is decoding the repo tooling's UTF-8 output as cp437. Use `Out-File -Encoding utf8` or run `chcp 65001` first.

**Tests hang in browser mode.** Make sure Playwright browsers are installed: `pnpm exec playwright install`.

Found a different issue? Open one at [github.com/heyoub/LiteShip/issues](https://github.com/heyoub/LiteShip/issues).
