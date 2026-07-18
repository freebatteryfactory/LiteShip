/**
 * HTML trust helpers -- parse an untrusted HTML string under a
 * configurable {@link HtmlPolicy} (text escape, sanitise, or pass
 * through after an opt-in). Backs `@czap/web`'s DOM morph and slot
 * injection so callers never touch `innerHTML` directly.
 *
 * When the host installs a Trusted Types policy named `czap` (see
 * `SECURITY.md` for the recipe), all `innerHTML` assignments below
 * route through `policy.createHTML(html)` so the runtime is
 * compatible with `require-trusted-types-for 'script'`. If no
 * policy is installed (or Trusted Types isn't supported), the
 * assignments fall through to direct string assignment, which is
 * the standard non-TT behavior.
 *
 * @module
 */
import { Diagnostics } from '@czap/core';
import type { HtmlPolicy } from '../types.js';

/**
 * Options controlling how {@link createHtmlFragment} /
 * {@link resolveHtmlString} interpret a string.
 *
 * `allowTrustedHtml` must be explicitly set to `true` before the
 * `'trusted-html'` policy is honoured -- otherwise the helper
 * downgrades to `'sanitized-html'` so callers cannot accidentally
 * widen the trust boundary.
 */
export interface HtmlTrustOptions {
  /** Requested trust level. Defaults to `sanitized-html`. */
  readonly policy?: HtmlPolicy;
  /** Pass-through allowlist for the `trusted-html` policy. */
  readonly allowTrustedHtml?: boolean;
}

/**
 * Tags that are stripped wholesale under `sanitized-html`. The list covers:
 * - direct script execution (`SCRIPT`)
 * - inline style injection (`STYLE`)
 * - sub-document embeds (`IFRAME`, `OBJECT`, `EMBED`)
 * - foreign-content namespaces that change parser semantics (`SVG`, `MATH`)
 * - origin and resource hijack vectors (`BASE` for href rebasing,
 *   `META` for `http-equiv` refresh / CSP overrides)
 * - executable preload / fallback paths (`LINK` for `rel=stylesheet`/`prefetch`,
 *   `NOSCRIPT` for re-serialization mXSS, `FORM` for `formaction`/`action` sinks)
 */
const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'BASE',
  'META',
  'LINK',
  'NOSCRIPT',
  'FORM',
  // Payload lives in .content, not .children — strip wholesale so nested sinks
  // cannot survive unsanitized inside an inert template shell.
  'TEMPLATE',
]);

/** Attribute names that can route a navigation/load to a `javascript:` or `data:` scheme. */
const URL_SINK_ATTRIBUTES = new Set([
  'href',
  'src',
  'xlink:href',
  'action',
  'formaction',
  'ping',
  'background',
  'cite',
  'data',
  'poster',
]);

let trustedTypesPolicy: { createHTML(input: string): string } | null | undefined;

/**
 * Look up (or create) the `czap` Trusted Types policy. Returns `null`
 * when Trusted Types is unavailable or unsupported. The lookup is
 * cached after the first call.
 *
 * Hosts that install their own `czap` policy (see SECURITY.md) get
 * picked up via `trustedTypes.getPolicy?.('czap')`. If the host hasn't
 * installed one but Trusted Types is enforced via CSP, this helper
 * creates a passthrough policy so the runtime's HTML sinks don't
 * throw at first projection.
 */
function getTrustedTypesPolicy(): { createHTML(input: string): string } | null {
  if (trustedTypesPolicy !== undefined) return trustedTypesPolicy;

  const tt = (globalThis as { trustedTypes?: TrustedTypePolicyFactoryLike }).trustedTypes;
  if (!tt || typeof tt.createPolicy !== 'function') {
    trustedTypesPolicy = null;
    return null;
  }

  const existing = tt.getPolicy?.('czap');
  if (existing) {
    trustedTypesPolicy = existing;
    return existing;
  }

  try {
    trustedTypesPolicy = tt.createPolicy('czap', {
      createHTML: (input: string) => input,
    });
    return trustedTypesPolicy;
  } catch {
    // Policy creation can fail under restrictive CSP (e.g. policy already
    // exists with a different definition, or `trusted-types` directive
    // disallows the name). Fall back to null so the assignment proceeds
    // with the raw string — which will throw under enforcement, signalling
    // the host to install a `czap` policy.
    trustedTypesPolicy = null;
    return null;
  }
}

interface TrustedTypePolicyFactoryLike {
  createPolicy?(name: string, rules: { createHTML: (input: string) => string }): { createHTML(input: string): string };
  getPolicy?(name: string): { createHTML(input: string): string } | null;
}

function assignInnerHTML(target: { innerHTML: string }, html: string): void {
  const policy = getTrustedTypesPolicy();
  // The policy's createHTML returns a TrustedHTML on real implementations.
  // Cast to string for the assignment; the DOM accepts TrustedHTML where
  // string is typed.
  target.innerHTML = policy ? (policy.createHTML(html) as unknown as string) : html;
}

/**
 * Escape the five HTML metacharacters (`&`, `<`, `>`, `"`, `'`) so a raw
 * string is safe to interpolate into element text or a double/single-quoted
 * attribute value. `&` is replaced first so the ampersands introduced by the
 * later replacements are not double-escaped.
 *
 * This is the text-escape primitive behind the `'text'` HTML policy; it is
 * also the single owner that emitters (`@czap/mcp-server`, stage) import
 * instead of re-hand-rolling the same five `replaceAll` chain.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function effectiveHtmlPolicy(options?: HtmlTrustOptions): HtmlPolicy {
  const requested = options?.policy ?? 'sanitized-html';
  if (requested === 'trusted-html' && options?.allowTrustedHtml !== true) {
    // The downgrade keeps the trust boundary narrow by design; it just must
    // not be silent. warnOnce dedupes per session.
    Diagnostics.warnOnce({
      source: 'czap/web.htmlTrust',
      code: 'trusted-html-downgraded',
      message:
        'policy "trusted-html" was downgraded to "sanitized-html" because allowTrustedHtml is not true. If this HTML is genuinely trusted, pass { policy: "trusted-html", allowTrustedHtml: true }.',
    });
    return 'sanitized-html';
  }

  return requested;
}

function normalizeAttributeValue(value: string): string {
  // Mirror the WHATWG URL parser's pre-processing so a naive scheme check is not
  // bypassable: strip leading/trailing C0 controls AND space, then remove every
  // embedded tab/newline/carriage-return (`java\tscript:` parses as javascript:).
  return value
    .replace(/^[\u0000-\u0020]+/, '')
    .replace(/[\u0000-\u0020]+$/, '')
    .toLowerCase()
    .replace(/[\t\n\r]/g, '');
}

/**
 * Scheme ALLOWLIST for url-sink attributes — a blocklist of known-bad schemes
 * (javascript:, three data: media types) is inherently bypassable (vbscript:,
 * data:text/xml, future schemes). Anything not listed here is stripped.
 * `data:` is allowed only for raster `data:image/(png|jpeg|jpg|gif|webp|avif|bmp)` —
 * `data:image/svg+xml` is scriptable and must not survive on URL sinks (href/action/…).
 */
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'blob:']);

const URL_SCHEME_RE = /^([a-z][a-z0-9+.-]*:)/;

/** Raster-only data:image allowlist — SVG (and unknown subtypes) are stripped. */
const SAFE_DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|gif|webp|avif|bmp)[;,]/;

function isDangerousUrlValue(normalizedValue: string): boolean {
  const scheme = URL_SCHEME_RE.exec(normalizedValue)?.[1];
  if (scheme === undefined) {
    // No scheme — relative / scheme-relative / fragment / query URL. Safe:
    // it resolves against the document origin.
    return false;
  }
  if (SAFE_URL_SCHEMES.has(scheme)) {
    return false;
  }
  if (scheme === 'data:') {
    return !SAFE_DATA_IMAGE_RE.test(normalizedValue);
  }
  return true;
}

/** `srcset` / `imagesrcset` are comma-separated URL lists with optional width descriptors. */
function isDangerousSrcsetValue(value: string): boolean {
  for (const candidate of value.split(',')) {
    const url = candidate.trim().split(/\s+/)[0] ?? '';
    if (url.length > 0 && isDangerousUrlValue(normalizeAttributeValue(url))) {
      return true;
    }
  }
  return false;
}

function isDangerousAttribute(name: string, value: string): boolean {
  const lowerName = name.toLowerCase();

  if (lowerName.startsWith('on')) {
    return true;
  }

  if (lowerName === 'srcdoc' || lowerName === 'style') {
    return true;
  }

  if (lowerName === 'srcset' || lowerName === 'imagesrcset') {
    return isDangerousSrcsetValue(value);
  }

  if (URL_SINK_ATTRIBUTES.has(lowerName)) {
    return isDangerousUrlValue(normalizeAttributeValue(value));
  }

  return false;
}

function sanitizeElementTree(root: ParentNode): void {
  const queue: Element[] = [];

  for (const child of Array.from(root.childNodes)) {
    if (child instanceof Element) {
      queue.push(child);
    }
  }

  while (queue.length > 0) {
    const element = queue.shift()!;
    if (DANGEROUS_TAGS.has(element.tagName.toUpperCase())) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      if (isDangerousAttribute(attribute.name, attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }

    for (const child of Array.from(element.children)) {
      queue.push(child);
    }
  }
}

function createTemplate(html: string, options?: HtmlTrustOptions): HTMLTemplateElement {
  const template = document.createElement('template');
  const policy = effectiveHtmlPolicy(options);

  switch (policy) {
    case 'text':
      assignInnerHTML(template, escapeHtml(html));
      break;
    case 'trusted-html':
      assignInnerHTML(template, html);
      break;
    case 'sanitized-html':
      assignInnerHTML(template, html);
      sanitizeElementTree(template.content);
      break;
  }

  return template;
}

/**
 * Parse `html` under `options.policy` and return a `DocumentFragment`
 * ready to be appended to the live DOM. Dangerous elements
 * (`<script>`, `<iframe>`, `<base>`, `<meta>`, `<link>`, `<form>`,
 * `<noscript>`, `<svg>`, `<math>`, `<style>`, `<object>`, `<embed>`,
 * `<template>`)
 * and attributes (`on*`, `srcdoc`, `style`) are stripped when the
 * effective policy is `sanitized-html`. Url-sink attributes (`href`,
 * `src`, `action`, `formaction`, `ping`, `background`, `cite`, `data`,
 * `poster`, …) are held to a scheme ALLOWLIST: relative URLs,
 * `http(s):`, `mailto:`, `tel:`, `blob:`, and raster `data:image/(png|jpeg|…)` pass;
 * every other scheme (`javascript:`, `vbscript:`, `data:image/svg+xml`, non-image `data:`, …)
 * is stripped.
 */
export function createHtmlFragment(html: string, options?: HtmlTrustOptions): DocumentFragment {
  return createTemplate(html, options).content;
}

/**
 * Serialise `html` back to string form after applying the effective
 * policy. Useful for host code that must hand cleaned markup to another
 * subsystem (e.g. a worker) rather than append it directly.
 *
 * **Caveat:** the returned string was sanitized inside a `<template>`
 * element (the parse-then-sanitize ordering that eliminates classic
 * mXSS). If you then assign the string to a *live* `innerHTML` sink
 * (a non-`<template>` element under a different parsing context — e.g.
 * a table cell, `<noscript>` body, or foreign-content namespace), the
 * browser may re-parse it under different rules and surface mutation-XSS
 * vectors. Prefer {@link createHtmlFragment} (which returns a parsed
 * `DocumentFragment` you can append directly) when the destination is
 * live DOM. Use `resolveHtmlString` only when you genuinely need a
 * string (e.g. handing markup to a worker, persisting to storage).
 */
export function resolveHtmlString(html: string, options?: HtmlTrustOptions): string {
  return createTemplate(html, options).innerHTML;
}

/**
 * Convenience wrapper that always applies the `sanitized-html` policy.
 * Use when a caller just wants the "clean the markup" behaviour without
 * threading options.
 */
export function sanitizeHTML(html: string): string {
  return resolveHtmlString(html, { policy: 'sanitized-html' });
}

/**
 * Reset the cached Trusted Types policy lookup. Test-only helper.
 * Production code never calls this; the cache is set on first read
 * and held for the lifetime of the runtime.
 *
 * @internal
 */
export function _resetTrustedTypesPolicyCacheForTests(): void {
  trustedTypesPolicy = undefined;
}
