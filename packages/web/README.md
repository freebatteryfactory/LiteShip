# @czap/web

Applies streamed HTML, state-driven re-renders, and LLM output to a live browser document without losing focus, scroll, or form state.

> You usually don't install this directly — it arrives as a dependency of
> [`@czap/astro`](https://github.com/heyoub/LiteShip/tree/main/packages/astro).
> Install that instead unless you are wiring DOM morphing, SSE streaming, or
> LLM chunk handling into a host that isn't Astro.

## Install

```bash
pnpm add @czap/astro   # brings @czap/web with it
# direct use: pnpm add @czap/web effect@beta
```

For direct use, the main entry needs the Effect 4 beta peer — `pnpm add effect@beta` (a bare `pnpm add effect` installs 3.x and fails the peer check). The `@czap/web/lite` entry used below is Effect-free.

## 30 seconds

```ts
import { morphPure } from '@czap/web/lite';

const card = document.querySelector('#card')!;

// Diff #card's children against the new HTML. Matching nodes are
// kept in place rather than recreated.
morphPure(card, '<h2>Updated</h2><input name="q" />');
```

`#card` shows the new markup, and any element present both before and after the morph — the input, say — keeps its focus, value, and scroll position instead of being torn down and rebuilt.

## Where it sits

The browser runtime layer: `@czap/astro`'s client directives call into this package, and it depends only on [`@czap/core`](https://github.com/heyoub/LiteShip/tree/main/packages/core) (shared state and runtime contracts) plus `mediabunny` for WebCodecs capture. The main entry adds the Effect-scoped surfaces: `Morph` with physical-state restore, `SlotRegistry` for addressing server-rendered slots in streamed HTML, an `SSE` client with reconnect and cross-tab resumption, and `LLMAdapter` for normalizing OpenAI / Anthropic / AI SDK chunk formats. `@czap/web/lite` is the pure subset of all that with no Effect dependency. Off-thread evaluation lives in [`@czap/worker`](https://github.com/heyoub/LiteShip/tree/main/packages/worker), not here. See the
[package surfaces map](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

Morph parses incoming HTML under a sanitized policy: `<script>` tags, `on*` attributes, and `javascript:` URLs in `newHTML` are stripped silently, by design. If markup you expected is missing after a morph, run it through `sanitizeHTML` (same entry) to see what survives.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md)
- [Hosting guide](https://github.com/heyoub/LiteShip/blob/main/docs/HOSTING.md) — CSP rules for SSE and LLM endpoints
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/web/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
