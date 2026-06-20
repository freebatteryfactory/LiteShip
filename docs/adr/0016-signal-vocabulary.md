# ADR-0016 — Unified signal vocabulary (SignalSource as source of truth)

**Status:** Accepted
**Date:** 2026-06-18

## Context

A boundary is driven by a *signal* identified by a dot-string input (`viewport.width`, `scroll.progress`, `audio.amplitude`). `@czap/core`'s `signal.ts` defined a typed `SignalSource` discriminated union (viewport / scroll / pointer / time / media / custom / audio, with per-type axes and modes) plus per-type browser listeners — but the runtime hot path never imported it. Instead `@czap/astro`'s `boundary.ts` re-parsed the input string by hand (`input.startsWith('viewport.')`, `input.slice('scroll.'.length)`), and `@czap/vite`'s css-quantize and the inspector forked the same parse again. The branded `SignalInput` (a dot-string) was structurally unrelated to `SignalSource`, and no function mapped between them.

The cost was the drift family this release is named after: one axis encoded four ways, none deriving from the blessed union. It had already bitten — `scroll.progress` meant `0..1` in `core/signal.ts` but `0..100` in the Astro runtime reader, so a boundary authored against `0.5` evaluated wrong at runtime — and the audio axis was a stub on the boundary side (`audio.* has no built-in reader`) while live beat/amplitude analysis lived only as a separate offline ECS subsystem.

## Decision

`SignalSource` is the single source of truth for the signal vocabulary. One sanctioned bidirectional mapper in `@czap/core` — `sourceToInput` / `inputToSource` (+ `inputSourceType`) — round-trips between a `SignalSource` and its `SignalInput` dot-string. Every domain (the Astro runtime reader/observer, the CSS-axis compiler, the inspector track-range, the DocumentGraph `signal` node) reads the axis *through* the mapper rather than re-parsing the string. A `check-invariants` rule (`NO_SIGNAL_INPUT_REPARSE`) forbids new hand-parses on the hot path.

A signal axis now has exactly one numeric contract: `scroll.progress` is `0..1` everywhere. Audio joins the union as first-class — `audio.amplitude` / `audio.beat` are real `SignalSource` modes with a live main-thread `AnalyserNode` producer (`driveAudioFromAnalyser`), so `Boundary.make({ input: 'audio.amplitude', at: [...] })` carves named states through the same evaluator as `viewport.width`.

## Consequences

- A new signal axis is added in exactly one place (the union + the mapper); every reader picks it up. Disagreement between encodings becomes unrepresentable.
- **Breaking:** the `scroll.progress` runtime scale changed `0..100` → `0..1`, and the capability triple renamed (see ADR-0018) — both pre-1.0 minor breaks.
- Audio is authorable like any other signal, with the offline `@czap/assets` onset DSP as the algorithm reference and a causal real-time analog at the producer (pinned by a drift guard).
- The mapper is one more step on the parse path, but it is O(1) and shared; the property test pins the round-trip.

## Evidence

- `packages/core/src/signal-input.ts` — `sourceToInput` / `inputToSource` / `inputSourceType`.
- `packages/core/src/signal.ts` — the `SignalSource` union + audio modes.
- `packages/astro/src/runtime/boundary.ts` — `readSignalValue` / `attachSignalObserver` route through `inputToSource`.
- `packages/command/src/commands/check-invariants-registry.ts` — the `NO_SIGNAL_INPUT_REPARSE` rule (the `check-invariants` command's rule set).
- `tests/property/signal-input-roundtrip.prop.test.ts`, `tests/unit/astro/scroll-progress-scale.test.ts`, `tests/unit/astro/audio-signal-drift.test.ts`.

## Rejected alternatives

- **Keep the per-domain string parsers, pin them with tests.** Pins the symptom, not the cause; a new axis still means N edits and N chances to drift.
- **Make `SignalInput` the source of truth (parse on demand).** A branded string can't carry the typed axis/mode discriminants the readers need; the union is the honest shape.
- **Defer audio to a later release.** The carve-path was already source-agnostic; audio fell out of the unification with a live producer (no editor needed), so deferring would have been scope-fear, not necessity.

## References

- [ADR-0003](./0003-content-addressing.md) — what gets content-addressed; signal-bearing definitions read through this vocabulary.
- [ADR-0010](./0010-spine-canonical-type-source.md) — where the branded types live.
- [ADR-0015](./0015-document-graph-ir.md) — the `signal` node family.
- [ADR-0018](./0018-cap-axes-attribute-contract.md) — the sibling source-of-truth-vocabulary decision (capability attributes).
