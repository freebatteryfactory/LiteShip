# ADR-0018 — CAP_AXES: the capability-attribute contract

**Status:** Accepted
**Date:** 2026-06-18

## Context

The device-capability triple — capability tier, motion tier, design tier — crosses three surfaces: the edge emits it onto `<html>` as `data-czap-*` attributes, the client probe refines those attributes, and `Astro.locals.czap` exposes the values to host code. The names had drifted: the edge emitted `data-czap-cap` while every runtime reader, the probe, and all examples used `data-czap-tier`; the locals field was `czap.tier.cap`. A consumer who applied the edge attributes got a different attribute name than the runtime read — an undocumented, dual-name footgun, the same drift family as the rest of this release. Two further attributes (`data-czap-gpu-tier`, `data-czap-webgpu`) were written to `<html>` with no reader anywhere — engine state leaking onto the DOM.

## Decision

One registry, `CAP_AXES` in `@czap/detect`, is the single source for the capability vocabulary: the axes `tier` / `motion` / `design`, projected to attribute names by `capAxisAttr(axis)` = `` `data-czap-${axis}` ``. The edge emitter iterates it, the locals field names ARE its keys (`Astro.locals.czap.tiers.{tier,motion,design}`), and the runtime readers read through it. Because the attribute suffix is the axis key by construction (a template literal), an attribute name that disagrees with its locals field cannot be written.

`data-czap-cap` is renamed to `data-czap-tier` (no deprecation window — it had zero readers). The locals triple `czap.tier.{cap,...}` becomes `czap.tiers.{tier,motion,design}`, typed onto `App.Locals` so a stale `czap.tier.cap` is a compile error, not a silent `undefined`. The non-author-facing `data-czap-gpu-tier` / `data-czap-webgpu` are removed from the DOM — `gpuTier` / `webgpu` ride the `czap:detect-ready` event detail + `window.__CZAP_DETECT__` only (engine state stays off the DOM; only author-CSS-keying attributes live there).

## Consequences

- The DOM attribute and the JS field are the same name by construction; the cap-vs-tier disagreement is unrepresentable.
- **Breaking:** `data-czap-cap` → `data-czap-tier`; `czap.tier.cap` → `czap.tiers.tier`. Pre-1.0 minor; the typed locals make the migration a compile-time error that names the fix.
- The capability triple is now a deliberate, drift-guarded author-facing CSS-keying seam; engine state (numeric GPU tier, WebGPU bool) is not.
- The head-inline probe still hand-mirrors the attribute names (it is a stringified script that cannot import) — pinned to `CAP_AXES` by a drift test.

## Evidence

- `packages/detect/src/cap-axes.ts` — `CAP_AXES`, `capAxisAttr`, `CapAxis`.
- `packages/edge/src/edge-tier.ts` — `tierDataAttributes` iterates the registry.
- `packages/astro/src/middleware.ts` — `czap.tiers` + the `App.Locals` augmentation.
- `tests/unit/edge/cap-axes-registry.test.ts` — the projection + emit drift guard.

## Rejected alternatives

- **Rename the edge attribute only, keep `czap.tier.cap`.** Relocates the drift from the DOM to the JS API — the field and the attribute still disagree.
- **Keep `cap` as the field, document `data-czap-tier` as its projection.** A documented disagreement is still a disagreement; the registry makes it impossible instead.
- **`czap.tier.tier`.** Eliminates the disagreement but reads as a typo; renaming the container to `tiers` is cleaner.

## References

- [ADR-0012](./0012-devops-profile-boundary.md) — capability contracts vs DevopsProfile fields (CAP_AXES is a capability contract, not a profile field).
- [ADR-0016](./0016-signal-vocabulary.md) — the sibling source-of-truth-vocabulary decision (signals).
