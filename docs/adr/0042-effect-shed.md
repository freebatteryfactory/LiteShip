# ADR-0042 — Effect shed (LiteShip-native substrate)

**Status:** Accepted
**Date:** 2026-07-18

## Context

ADR-0005 ("Effect boundary rules") governed where `effect` was used and where
it wasn't: Scope for setup/teardown, `SubscriptionRef`/`Stream` for reactive
state, the typed error channel for expected failures, plain JS on hot loops.
Effect carried real per-frame and per-publish overhead, so that ADR was a set of
rules for keeping it off the hot paths.

Over Waves 1–8 every responsibility Effect carried acquired a LiteShip-native
owner, and the remaining Effect surfaces became residue: phantom error channels
that could never fail, adapters that only unwrapped effects the callee no longer
returned, and type mirrors that named a transport already gone. The GOVERNING
LAW of the shed: *remove Effect only after the behavior, public contract,
downstream boundary, and verification evidence it carried have each moved to an
explicit native owner — a zero-import count is the receipt, not the method.*

## Decision

Shed `effect` from the monorepo entirely. Every behavior moves to a named
native owner; the `effect` package is removed from all manifests, the pnpm
catalog, the root override, and the lockfile. This ADR **supersedes ADR-0005** —
which is retained as the historical bridge that records the boundary rules the
native substrate replaced.

### Migration bridge — where each Effect responsibility went

| Former Effect responsibility | Native owner | Preserved or changed | Evidence |
| ---------------------------- | ------------ | -------------------- | -------- |
| Scope cleanup / resource lifecycle | `Lifetime` — a LIFO, exactly-once disposer stack | Preserved | `frame-budget` rAF teardown; `detect`/`watchCapabilities` `Disposer` |
| Reactive state + streams (`SubscriptionRef`/`Stream.callback`) | `CellKernel` (`replay1`/`fanout`) under Cell / Derived / Store / Zap / crossings | Preserved, with the explicit MEMBERSHIP + REPLAY law correction (Wave 6.5.1) | transition cage; `compositor-zero-alloc` — the live-subscriber publish is now **0 B/op** (was ≈13 B/op via `Queue.offerUnsafe`) |
| Expected errors (`Effect.fail` / typed channel) | `Result<A, E>` + the `@czap/error` tagged algebra | Clarified: phantom (never-fail) channels became sync; real channels became `Result` | `ship-capsule.decode` taxonomy preserved; `error/algebra` errors-as-values |
| Schema validation (`effect/Schema`) | the native schema kernel `S` + the structural `SchemaPort` | Preserved through byte-parity | `json-schema-parity` cage; the Codec spine pin |
| Codec transport (`Codec.encode/decode: Effect.Effect<…>`) | sync `Codec` over `Result<…, ParseError>` | Changed: Effect → sync Result | `spine-conformance` bidirectional Codec pin |
| Async crypto / addressing | sync `sha256Hex` (`@czap/canonical`) | Simplified to sync | `ship-manifest` addressers |
| CLI grounding (`runEffect` adapters) | native sync / `Promise` / `Result` | Simplified — the local `runEffect`/`EffectOk`/`EffectErr` adapters deleted | `ship` / `ship-verify` / `supply-chain` |

## Consequences

- `@czap/core`, `@czap/detect`, `@czap/remotion`, `@czap/_spine` declare **no
  peer dependencies** where they once required `effect`; `@czap/cli` /
  `@czap/command` shed their direct dep. A fresh `pnpm add @czap/core @czap/astro`
  pulls **no third-party runtime peer**.
- The reactive publish path is now genuinely zero-allocation with a live
  subscriber — a strict improvement, not merely a like-for-like port.
- The prerelease-allowlist mechanism in the supply-chain policy survives with an
  **empty** list: `effect` was its one sanctioned prerelease exception, so any
  prerelease runtime dep now reds the policy.
- ADR-0005's six Effect-usage categories no longer describe live code; they are
  preserved as history so the boundary reasoning is not lost.
- Negative: any downstream consumer that relied on `@czap/*` re-exporting Effect
  types must import `effect` themselves. The `@czap/error` records still slot
  into Effect's `catchTag` (they are plain `_tag` values), so error interop is
  unaffected — it is now a compatibility property, not a dependency.

## Evidence

- `scripts/alloc-gate.ts` (bench): `core/compositor publish (live subscriber)` =
  **0.0000 B/op** (budget 16), the CellKernel fanout that replaced the
  `Stream.callback` / `Queue.offerUnsafe` bridge. Asserted portably by
  `tests/property/compositor-zero-alloc.test.ts`.
- `tests/unit/core/invariants.test.ts` Invariant 14 — the permanent tripwire:
  no `packages/*/src/**/*.ts` imports from `effect`.
- Cold install proof: `rm -rf node_modules && pnpm install --frozen-lockfile`
  leaves **zero** `effect` in `node_modules` or the `.pnpm` store.

## Rejected alternatives

- **Keep Effect behind ADR-0005's boundary.** Rejected: the boundary still paid
  Effect's per-publish overhead on the hot reactive path and forced every
  package to carry the prerelease peer; the native owners are strictly cheaper.
- **Shed imports but keep the peer for type interop.** Rejected: a zero-import
  count with a live peer is theatre — the contract residue is the point.

## References

- ADR-0005 (superseded) — the Effect boundary rules this replaces.
- ADR-0010 — spine as canonical type source (the Codec mirror lives here).
- `packages/core/src/cell-kernel.ts`, `packages/core/src/lifetime.ts`,
  `packages/core/src/codec.ts`, `packages/error/src/result.ts` — the owners.
- Issue #153 — the effect-removal tracking issue.
