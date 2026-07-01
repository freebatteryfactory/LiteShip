# ADR-0028 — DIRECTIVE_ATTRIBUTE_REGISTRY: directives boot on plain elements, not just islands

**Status:** Accepted
**Date:** 2026-07-01

## Context

Astro runs a `client:*` directive's hydration only on framework-component islands. A
plain element that carries the compiled runtime attribute — `<div data-czap-stream-url=…>`,
authored as `<div client:stream>` — is passed through to the DOM with the attribute intact
but is never booted. No island, no hydration, no error: the directive is a silent dead
attribute. Dogfooding hit exactly this. It is the silent-no-op degradation class the
make-it-loud program exists to kill, and the directive→attribute mapping the boot path
needs was implicit, re-stated per call site.

## Decision

`DIRECTIVE_ATTRIBUTE_REGISTRY` (`packages/astro/src/runtime/slots.ts`) is the single source
mapping each client directive to the runtime attribute it owns. Both the island reinit
selector and the plain-element boot scanner are GENERATED from it — so a directive added to
the registry becomes scannable on a plain element by construction, and the set the scanner
boots cannot disagree with the set the island path reinits.

The integration injects one scanner (`packages/astro/src/runtime/directive-boot.ts`) that
boots any plain element carrying a registry attribute, and every published client-directive
entrypoint marks its host `data-czap-directive-bound` on hydrate — so the scanner skips
islands Astro already ran (idempotent, no double-boot).

Attributes that are ALSO payloads for other surfaces — `data-czap-boundary`, which feeds
worker/GPU surfaces — are not auto-booted; they stay explicit (`data-czap-directive` /
`Satellite` / `satelliteAttrs`). When the scanner finds one bare, it emits a
`Diagnostics.warnOnce` naming the fix, so the deliberate skip is loud instead of another
silent no-op.

## Consequences

- Plain-element `client:*` directives boot; the silent dead-attribute no-op is gone.
- "Scannable on a plain element" and "reinit on an island" are the same set by construction;
  a new directive cannot be silently unscanned — a drift gate pins the scanner's selector set
  to the registry, `expected` computed from the registry, not restated.
- **make-it-loud:** a bare `data-czap-boundary` no longer does nothing silently — it warns
  once, naming the explicit opt-in.
- Idempotent: `data-czap-directive-bound` guards double-boot across the island and scanner paths.
- Behavior change (additive): a plain element that carried a directive attribute and was
  previously inert now executes; a page that did not want it must drop the attribute.

## Evidence

- `packages/astro/src/runtime/slots.ts` — `DIRECTIVE_ATTRIBUTE_REGISTRY`; reinit selector generated from it.
- `packages/astro/src/runtime/directive-boot.ts` — scanner derives boot selectors from the registry; bare-explicit-only `warnOnce`.
- client-directive entrypoints — `data-czap-directive-bound` on hydrate.
- `tests/unit/astro/directive-boot-scanner.test.ts` — registry-derived drift gate + bare-boundary warning gate, 3/3; both non-vacuous (drop the registry-derived selector → drift gate reds; drop the warn → warning gate reds).

## Rejected alternatives

- **Docs-only correction ("directives only work on islands").** Documents the footgun instead of removing it; leaves the silent no-op — fails the make-it-loud bar.
- **Auto-boot every `data-czap-*`, including `data-czap-boundary`.** Boots a worker/GPU payload as if it were a directive — wrong intent, and unbounded.
- **Require `data-czap-directive` on every plain element.** Kills the ergonomic win (`client:stream` on a `<div>` should just work); keep explicit only where the attribute is genuinely multi-surface.
- **Re-list the directive attributes inline in the scanner and this ADR.** A hand-maintained mirror that drifts when a directive is added — the registry-derived selector removes the second copy.

## References

- [ADR-0018](./0018-cap-axes-attribute-contract.md) — the sibling single-source-registry-projected-to-attributes decision (CAP_AXES).
- [ADR-0001](./0001-namespace-pattern.md) — namespace pattern.
