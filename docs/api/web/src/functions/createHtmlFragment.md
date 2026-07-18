[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / createHtmlFragment

# Function: createHtmlFragment()

> **createHtmlFragment**(`html`, `options?`): `DocumentFragment`

Defined in: [web/src/security/html-trust.ts:308](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/security/html-trust.ts#L308)

Parse `html` under `options.policy` and return a `DocumentFragment`
ready to be appended to the live DOM. Dangerous elements
(`<script>`, `<iframe>`, `<base>`, `<meta>`, `<link>`, `<form>`,
`<noscript>`, `<svg>`, `<math>`, `<style>`, `<object>`, `<embed>`,
`<template>`)
and attributes (`on*`, `srcdoc`, `style`) are stripped when the
effective policy is `sanitized-html`. Url-sink attributes (`href`,
`src`, `action`, `formaction`, `ping`, `background`, `cite`, `data`,
`poster`, …) are held to a scheme ALLOWLIST: relative URLs,
`http(s):`, `mailto:`, `tel:`, `blob:`, and raster `data:image/(png|jpeg|…)` pass;
every other scheme (`javascript:`, `vbscript:`, `data:image/svg+xml`, non-image `data:`, …)
is stripped.

## Parameters

### html

`string`

### options?

`HtmlTrustOptions`

## Returns

`DocumentFragment`
