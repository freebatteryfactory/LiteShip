# Web Evidence Producers

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/05_evidence/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical browser producers behind core evidence sources: one-shot probes and live watchers for capability, media-query, pointer, keyboard, touch, scroll, permission, device, and interaction facts.

## Owns

- Producer identity and the probe/watcher split.
- The binding from producer to core-owned evidence source.
- Watcher subscription lifetime.

## Does not own

- Evidence vocabulary, codomains, defaults, precedence, classifiers, or hysteresis. Those are core.
- Tier semantics or a duplicated classifier. Client Hints and request inference belong to edge; generated early-probe source belongs to compiler/build.

## Producers, not meaning

The settled split: pure ladders and classification live in core; `matchMedia`, canvas, WebGL, and capability probes live here as physical producers; the browser and request classifiers keep an explicit declared relationship. A probe reads once and owns nothing; a watcher subscribes and owns its subscription. A fact already settled faithfully in CSS does not gain a JavaScript producer merely because web could observe it — the compiler decides when another egress or a live requirement justifies a browser source. Browser evidence may affect presentation; it can never grant server authorization.

## Laws

- A producer names a core-owned source, never a local name.
- A producer emits its own source: the advertised identity and the emitted update source derive from one parameter — a watcher declared for source A cannot return an update for source B. The parameter has no default, so the plain unparameterized producer form is not a lawful construction; producers reach consumers only through the facility's source-correlated contracts.
- A probe owns nothing; a watcher owns its subscription.
- The probe facility is the intrinsic producer authority: it reads once and stands up live watchers as repeatable per-use resources, both correlated on the exact source they were asked for. A watcher is never a requirement hole — two watchers are two resources, not one deduplicated name.

## Proof obligations

- Every promised browser source has a real producer, and no producer asserts a source core never declared — the population check, both directions.
- The browser classifier's relationship to the request classifier holds as declared.

Both are `system/01_assurance` obligations.

## Implementation boundary

Specified. No matchMedia call, probe, or watcher code exists or is authorized.
