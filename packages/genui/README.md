# @czap/genui

Host-owned generated UI: validate the structured UI trees a model proposes against a catalog you control, then render trusted components only — never model HTML.

> You usually don't install this directly — it's host-wired through [@czap/astro](https://www.npmjs.com/package/@czap/astro), [@czap/web](https://www.npmjs.com/package/@czap/web), and [@czap/mcp-server](https://www.npmjs.com/package/@czap/mcp-server), which own the catalog and interaction authority for you. Install one of those unless you need the validator standalone.

## Install

```bash
pnpm add @czap/genui
```

## 30 seconds

```ts
import {
  DEMO_COMPONENT_CATALOG,
  tryParseGeneratedUIChunk,
  validateGeneratedUITree,
  renderHash,
} from '@czap/genui';

// A model emits one structured chunk: { "_genui": true, "name": ..., "props": ... }
const node = tryParseGeneratedUIChunk(
  '{"_genui":true,"name":"Card","props":{"title":"Hello"},"children":[{"name":"Text","props":{"text":"From the model"}}]}',
);

if (node) {
  const result = validateGeneratedUITree(node, DEMO_COMPONENT_CATALOG);
  if (result.ok) {
    console.log(renderHash(node, DEMO_COMPONENT_CATALOG)); // stable content address
  } else {
    console.error(result.error.code, result.error.path); // e.g. 'genui/unknown-component'
  }
}
```

`tryParseGeneratedUIChunk` returns `null` for ordinary token/text/HTML output, so this is safe to run over every streamed chunk. `validateGeneratedUITree` rejects unknown component names, bad props, and malformed children/slots before anything reaches the DOM. In the browser, `renderFromCatalog(node, { catalog, target })` validates then builds elements from your trusted catalog, wiring interaction props to `genui:interaction` CustomEvents the host interprets — model strings are opaque action ids, never markup.

## Where it sits

Define a catalog with `defineComponentCatalog` — the only components that can ever render. Its only `@czap` dependencies are `@czap/_spine` (the shared genui type vocabulary), `@czap/canonical` (catalog/render bytes), and `@czap/error`. The model proposes a tree; this package validates it against the catalog and renders allowlisted attributes only. `catalogHash` and `renderHash` mint stable [content addresses](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for cache, replay, and tests. What to *generate* is decided elsewhere — `@czap/mcp-server` projects the catalog to a model, hosts own admission and interaction authority.

## Trust boundary

This package never renders model HTML and never trusts model-controlled keys — component and prop names are looked up as own-properties only, so `constructor`/`__proto__`-style names are unknown components, full stop. A tree that fails validation is not rendered. The catalog, and what each interaction does, are always the host's.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Generated UI catalog (ADR-0014)](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/adr/0014-genui-catalog.md) — the trust model above
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/genui/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
