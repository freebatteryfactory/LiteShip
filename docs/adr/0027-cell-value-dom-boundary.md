# ADR-0027 — Reactive primitives are value→wire, never value→DOM

**Status:** Accepted
**Date:** 2026-06-30

## Context

`Cell` / `Store` / `Derived` / `LiveCell` (`packages/core/src/{cell,store,derived,live-cell}.ts`) expose only protocol-side surfaces (`get` / `changes` / `set` / `dispatch` / `emit`); none imports `document` or `*Element`. The only DOM-touching reactive code is INPUT-side (`zap.ts` `fromDOMEvent`, `signal.ts` listeners read DOM/browser events INTO values — the sanctioned ADR-0005 Category-3 seam). DOM materialization lives strictly downstream in `@czap/web` Morph. Today this is an incidental fact; nothing prevents a future `Cell.bindToDOM` from smuggling `document` into `@czap/core` and splitting the client rendering model.

## Decision

Make it a hard, guarded layering law: **reactive value primitives are value→wire (`LiveCell → CellEnvelope`), never value→DOM; DOM application is exclusively `@czap/web` Morph.** Enforced by a two-tier structural guard (`tests/unit/meta/cell-dom-boundary.test.ts`, extending the `a1-seam-integrity` idiom): a STRICT no-DOM ban over `cell/store/derived/live-cell.ts`, and an OUTPUT-SINK-only ban over `signal.ts` / `zap.ts` (forbids value→DOM write/bind sinks while allowing the input-side `addEventListener` + scroll/pointer reads), applied to a comment-stripped copy so doc-comment mentions don't false-fire. The `api-surface` snapshot already catches any DOM-binding export added to the core barrel.

## Consequences

- A future accidental (or deliberate-but-unreviewed) value→DOM binder in `@czap/core` reds the build, naming the file + match.
- Client-side fine-grained value→DOM binding remains a non-feature; a future one is a deliberate new capability with its own ADR, not incidental drift.
- The guard is comment-safe (BITE-proven) and explicitly does NOT ban the sanctioned input-side seam.

## Rejected alternatives

- **Leave the boundary undocumented/unguarded** — invites the regression the repo's other avionics-tier guards exist to prevent.
- **Ship a minimal `bindCell(el, cell)` binder** — a second client rendering path competing with Morph-over-SSE; out of scope for a server-authoritative UI framework.

## Evidence

- `tests/unit/meta/cell-dom-boundary.test.ts` — 10/10, with BITE proofs for both matchers + the comment-stripper.
- `packages/core/src/live-cell.ts` ("bridge to protocol envelope, never persisted/DOM").

## References

- ADR-0005 (Effect boundary, Cat-3 input seam), ADR-0001 (namespace pattern).
- `packages/core/src/{cell,store,derived,live-cell,signal,zap}.ts`.
