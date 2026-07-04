# ADR-0032 — Morph-opaque subtrees are diff-isolated, not trust-exempt

**Status:** Accepted
**Date:** 2026-07-04

## Context

The morph engine reconciles server HTML into a live DOM while preserving physical state where it knows how. Some subtrees are not owned by the server after first paint: CodeMirror editors, canvas views, charts, media timelines, and other self-owned islands may mutate their own attributes and children continuously. A normal morph can overwrite those edits or remove the island when the server no longer emits matching HTML.

At the same time, opacity cannot weaken the HTML trust boundary. New HTML entering through morph still has to be parsed by the configured `HtmlPolicy`; opacity only decides whether an already-live subtree participates in diffing.

The public `MorphCallbacks` type also claimed `beforeRemove` and `afterAdd`, but those callbacks were not actually threaded through the recursive pure diff. That was a claim-vs-reality defect in the same ownership seam.

## Decision

Ship `MorphOpaque` in `@czap/web` with the presence marker `data-czap-morph-opaque`. The morph laws are:

- **L1:** A matched old/new pair where either side is opaque keeps the old element verbatim: no attribute sync, no child sync, no input/checked/value sync.
- **L2:** An unmatched old opaque element is never removed — and neither is an unmatched ancestor whose subtree contains one, because a cascade removal would destroy the island (`MorphOpaque.containsOpaque` guards both the removal loop and the outerHTML root-replacement path).
- **L3:** A new opaque element with no old match inserts wholesale after sanitize-time parsing.
- **L4:** An opaque morph root is a total no-op for every public morph entry point.
- **L5:** Non-opaque siblings and ancestors morph as before.

Opacity is structural isolation, not a trust exemption. `createHtmlFragment` and the active `HtmlPolicy` still run before the diff sees new nodes. If a policy strips a dangerous element, opacity does not bring it back. In particular, forms remain stripped under the `sanitized-html` policy; `bindGraphForm` binds page-authored forms, not server-morphed form HTML.

Wire `MorphCallbacks` through the pure recursion at the same time. `beforeRemove` may veto non-opaque element removal; opaque removals never reach it because L2 wins first. `afterAdd` fires immediately after inserted elements and text nodes are placed, including nested insertions.

## Consequences

- Self-owned islands can survive server refreshes without losing local DOM state.
- Server-announced opaque islands still enter through the sanitizer before insertion.
- Opaque roots become a predictable no-op across `morph`, `morphPure`, and `morphWithState`.
- Callback behavior now matches the public type claim, including nested recursion.
- The marker is presence-based and deliberately small: no ownership registry, no component lifecycle, no sanitizer bypass.
- A matched opaque island may still be MOVED when the server reorders its siblings: identity and content are preserved, but a DOM move re-runs `connectedCallback` and reloads `<iframe>`s. Hosts with move-sensitive islands should keep the island's position stable in server HTML.
- A container preserved by the extended L2 keeps its non-opaque content too — the morph deliberately deviates from server truth for the whole preserved subtree rather than reparent a client-owned island.

## Evidence

- `packages/web/src/morph/opaque.ts` — `MorphOpaque.ATTR`, `MorphOpaque.isOpaque`, and `MorphOpaque.containsOpaque`.
- `packages/web/src/morph/diff-pure.ts` — L1-L5, recursive callback threading, and the single reconcile body every entry point routes through.
- `packages/web/src/morph/diff.ts` — the Effect entry point delegates to `morphPure` (one body, no drift).
- `packages/web/src/types.ts` — callback JSDoc for veto/add semantics.
- `tests/component/morph-diff.test.ts` — opaque laws and callback behavior.
- `tests/unit/web/morph.test.ts` — namespace pins.
- `tests/browser/morph-browser.test.ts` — real-DOM opaque preservation.

## Rejected alternatives

- **Only preserve children of known widgets.** That makes LiteShip domain-aware and misses host-owned islands it cannot know.
- **Make opacity skip sanitization.** That would turn a diffing marker into a trust bypass. Sanitization is always before diff.
- **A callback-only escape hatch.** It still requires every host to reimplement the same remove/sync veto rules and cannot guard opaque roots consistently.
- **Delete the callback type claims.** The public type already promised useful hooks; the root fix is to make the implementation match it.

## References

- [ADR-0027](./0027-cell-value-dom-boundary.md) — value primitives do not become DOM component kits.
- `packages/web/src/html-trust.ts` — sanitize-before-diff trust boundary.
- `packages/web/src/morph/diff-pure.ts`, `packages/web/src/morph/diff.ts` — morph implementation.
