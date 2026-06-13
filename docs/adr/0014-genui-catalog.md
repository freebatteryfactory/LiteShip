# ADR-0014 — Generated UI catalog doctrine

**Status:** Accepted  
**Date:** 2026-06-12  
**Audience:** Contributors wiring `client:llm`, MCP discovery, or host catalogs.

## Context

LiteShip apps using generative UI need a safe alternative to model-emitted HTML. The framework must validate structured render input and render only host-trusted components. LiteShip owns **render safety**; it does **not** own **authority** to act on rendered UI (no built-in action executor, ingress policy, or agent permissions).

## Decision

- Host apps register a **component catalog** (`defineComponentCatalog`) listing allowed component names and prop schemas.
- Model/runtime output references catalog components as `{ name, props, children?, slots? }` trees, discriminated in streams via `{ "_genui": true, ... }`.
- `@czap/genui` validates trees (`validateGeneratedUITree`) and renders via `renderFromCatalog` using `createElement`, `textContent`, and allowlisted attributes only — **no model HTML**.
- Stable `catalogHash` and `renderHash` support cache, replay, and tests.
- Clicks/gestures emit `genui:interaction` CustomEvents with `{ componentName, propKey, value }`; the host decides whether that becomes navigation, a tool call, or nothing.
- MCP exposes `liteship://registry/components` as **discovery** of the demo/default catalog — not authority.
- Reject `actions[]`, `executeAction()`, or MCP tool dispatch inside `@czap/genui`.

## Consequences

- `client:llm` can render catalog trees when a host catalog is configured (`data-czap-genui` uses the demo catalog; apps pass their own via `createLLMSession`).
- Legacy token/text/HTML streaming remains behind the `_genui` discriminator.
- Teaching errors use stable codes: `genui/unknown-component`, `genui/invalid-prop`, `genui/invalid-children`.

## References

- `packages/genui/src/` — catalog, validate, render, identity, parse
- `packages/astro/src/runtime/llm-session.ts` — catalog branch in `ingest`
- ADR-0013 — `@czap/canonical` bytes kernel (`renderHash` / `catalogHash`)
