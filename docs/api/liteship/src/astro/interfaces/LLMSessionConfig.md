[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / LLMSessionConfig

# Interface: LLMSessionConfig

Defined in: astro/dist/runtime/llm-session.d.ts:12

Config accepted by [createLLMSession](../functions/createLLMSession.md). Drives a DOM-bound LLM
session: `element` is the root the `client:llm` directive attaches
to, `target` is where text is appended, and `mode` selects render
strategy.

## Properties

### allowTrustedHtml?

> `readonly` `optional` **allowTrustedHtml?**: `boolean`

Defined in: astro/dist/runtime/llm-session.d.ts:24

Opt-in to `trusted-html` (pairs with `htmlPolicy`).

***

### element

> `readonly` **element**: `HTMLElement`

Defined in: astro/dist/runtime/llm-session.d.ts:14

Host element (directive root). Receives `liteship:llm-*` events.

***

### genuiCatalog?

> `readonly` `optional` **genuiCatalog?**: [`ComponentCatalog`](../../../../spine/interfaces/ComponentCatalog.md)

Defined in: astro/dist/runtime/llm-session.d.ts:26

Host-owned generated UI catalog. When set, `{ "_genui": true, ... }` chunks render via catalog.

***

### getDeviceTier

> `readonly` **getDeviceTier**: () => `DeviceTier`

Defined in: astro/dist/runtime/llm-session.d.ts:20

Device-tier getter used by the quality controller.

#### Returns

`DeviceTier`

***

### htmlPolicy?

> `readonly` `optional` **htmlPolicy?**: [`HtmlPolicy`](../../runtime/type-aliases/HtmlPolicy.md)

Defined in: astro/dist/runtime/llm-session.d.ts:22

HTML trust policy governing text-sink writes. Defaults to `text`.

***

### mode

> `readonly` **mode**: `string`

Defined in: astro/dist/runtime/llm-session.d.ts:18

Render mode label forwarded to the pipeline.

***

### target

> `readonly` **target**: `HTMLElement`

Defined in: astro/dist/runtime/llm-session.d.ts:16

Text-sink element (typically a child of `element`).
