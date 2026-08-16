# Web Bootstrap and Grounding

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/00_bootstrap/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the only place raw browser globals exist, and the admission boundary through which narrow browser capabilities become lawful groundings.

## Owns

- Physical capture of `window`, `document`, `navigator`, and platform constructors, strictly beneath the boundary.
- Web grounding slot declarations, pinned to the web realm.
- The web host definition and erased capability catalog.
- The ambient-read boundary: no module above this home reads browser state directly.

## Does not own

- Any capability's semantic meaning. Owners stay upstream.
- Region, event, transport, media, graphics, or execution authority. Those are later homes consuming admitted capabilities.
- Content admission. Grounding admission validates browser authorities at bootstrap; generated UI and stream content use their own core admission paths.

## The boundary rule

Raw browser globals remain beneath bootstrap. The governed web surface exposes narrow admitted capabilities, never a `Window`-shaped optional context. The admitted value is always an authority derived from a global — a fetch entrypoint, a clock, a randomness facility, a region-discovery authority — not the global itself.

Origins follow the umbrella algebra. Intrinsic: a facility already present in the browser before LiteShip plans anything. Invocation: a value carried by one concrete entry or activation. Deployment: public, non-secret browser configuration; secrets never enter this origin. Application: an existing value whose custody the embedding application transfers or retains. The same noun may appear as grounding or offer depending on causation: an injected existing `AudioContext` may be grounded; one LiteShip creates is produced by an offer.

## Laws

- The web realm is exactly the web realm.
- A web grounding slot cannot claim another realm and pins its allowed origin — a facility cannot suddenly claim to be application-supplied.
- A web offer cannot advertise another realm, a server or host-native backend, the worker realm, or a settlement location web does not own — by derivation, not convention.
- The definition and its catalog share one identity and realm.
- Globals are captured beneath the boundary only; narrow authorities cross it.

## Proof obligations

- No module outside this home performs an ambient browser read.
- The declared slot population matches the actual entrypoint and deployment surface.
- Every admitted value genuinely entered through its declared origin.
- Only the bootstrap mints grounding instances.

All four are `system/01_assurance` obligations; TypeScript cannot see an ambient read.

## Implementation boundary

A web bootstrap realization must capture browser globals once, admit exact inputs, and permit no ambient browser reads elsewhere.
