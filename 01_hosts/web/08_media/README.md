# Web Media

Status: specified with physical profiles deferred; capture roster provisional; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/08_media/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical browser audio and media resources: `AudioContext` and worklets, media devices, capture streams, codec instances, playback state, and the sample-clock transport.

## Owns

- Media resource identity, kind, and owned lifetime.
- The browser-side sample-clock transport, speaking core time.
- The reserved capture authority.

## Does not own

- Media assets, sample and frame coordinates, analysis products, A/V semantics, encoder and decoder requirement contracts, or the shared realtime/offline program. Core owns all of it; WebCodecs and `AudioContext` never define the semantic media model.
- Native media tools. Those are server realm.

## Grounding versus offer, in types

Both custody stories are declared, not narrated. Only an injected clock-bearing audio runtime is a grounding: an already-created `AudioContext` genuinely carrying its clock enters through `InjectedAudioRuntimeGrounding` with retained custody. Generic injected media values — a `MediaStream`, a codec — enter through the media provider's `adopt` operation, never a global injected-resource hole. Constructed resources come through `AudioRuntimeOffer` (audio kinds, each arriving as a clock-bearing `AudioRuntimeInstance` whose clock is bound to that exact runtime) or `MediaAuthorityOffer` (everything else, clockless by design), each materializing an owned lifetime disposed exactly once. The capture source roster is deliberately reserved: the ledger preserves capture as a web capability without enumerating its old sources, so the concrete roster arrives with old-source mining, not architectural speculation.

## The sample clock

The clock speaks the core sample coordinate — `SampleIndex` at a `SampleRate` — because that is the semantic media axis realtime and offline execution share. Monotonic time rides beside it as a separate scheduling coordinate and never replaces sample position. And the clock has exactly one origin: it lives inside its clock-bearing audio runtime instance and carries no runtime name of its own — there is no second place to write a runtime identity, so a clock inside runtime A structurally cannot name, read, or claim runtime B.

## Laws

- The sample clock speaks the sample coordinate, never monotonic time.
- Retained custody is representable; a constructed resource is owned.
- Providers split by clock: the audio runtime provider constructs clock-bearing instances — the clock lives inside the instance and carries no runtime identity of its own — while the generic media provider carries no clock by design. Both construct repeatable resources; an injected existing audio runtime enters as an application grounding, and generic injected values enter as admitted provider inputs, never a global injected-resource hole or a standalone clock hole.

## Proof obligations

- Media availability and permission denial surface as evidence inside bound contracts, never as missing bindings.
- The eventual capture roster is reconciled against old-source evidence before any capture implementation.

Both are assurance obligations at their respective phases.

## Implementation boundary

Specified with physical profiles deferred: codec support, worklet scheduling, and capture availability are empirical. No AudioContext creation, device access, or codec code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/08_media
  title: "Web Media"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - browser-apis-never-define-the-semantic-media-model
  - injected-media-may-ground-created-media-is-offered
  - capture-roster-reserved-for-old-source-evidence
  - media-resources-owned-and-disposed-once
  empirical_contracts:
  - codec-support
  - capture-availability
  production_authority: false
```
