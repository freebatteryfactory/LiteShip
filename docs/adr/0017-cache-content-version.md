# ADR-0017 — Conditional cache: content-version beyond the boundary address

**Status:** Accepted
**Date:** 2026-06-18

## Context

[ADR-0003](./0003-content-addressing.md) established content addressing: a cached output is keyed by the FNV-1a hash of its definition's canonical bytes, and its Consequences asserted an absolute — "there is no stale-cache failure mode where the key survives a semantic change." The edge KV boundary cache and its docs leaned on the unconditional phrasing ("never go stale").

That holds only when the cached VALUE is fully determined by the addressed definition. Two shipped paths violate it: (1) `createEdgeHostAdapter` passes a per-request `theme` (a `ThemeCompileResult`, possibly from a per-request resolver) into the host `compile` callback, which bakes theme tokens into the CSS — so two requests at the same `(boundaryId, tier)` with different themes collided on one key; (2) a consumer's bundled `compile()` can depend on build-time content the boundary id doesn't cover (e.g. a shared `layout-css.ts` grid value), so editing that content changed the served bytes without changing any boundary address. The KV key was `(prefix, boundaryId, tier, name)` — a proxy standing next to the true compile inputs.

## Decision

The cache key folds every per-request input to the cached value. The KV key gains a **resolved-theme fingerprint** (`contentAddressOf(theme)`) alongside id + tier + name — computed per request, so a theme change can't serve another theme's CSS. For build-time inputs the boundary id does not cover, the cache config's **`prefix`** is the per-deploy **content version**: a bundled compile sets it to a hash of its own output (`prefix: "layout-" + fnv1a(compileLayoutCss())`), so a content change busts the keyspace. A diagnostic warns when a `compile` is configured without a `prefix`, so the residual staleness can't ship silently. The guarantee is restated per-level: unconditional for the addressed definition; conditional on theme (folded into the key) and on the content-version `prefix` (consumer-supplied) for everything outside it.

## Consequences

- The cache is honest: an entry serves only a request whose every input matches. The theme-axis collision is closed structurally; the bundled-compile axis is closed by `prefix` + a loud diagnostic.
- Existing KV entries are orphaned by the new key shape — acceptable, since they are regenerable and TTL-reclaimed.
- ADR-0003's absolute is amended (not rewritten): the invariant holds "for a fixed content version."
- `prefix` is still consumer discipline for the bundled-compile case — but the diagnostic makes the wrong way loud, and the manifest path (content-true by construction) remains the recommended default.

## Evidence

- `packages/edge/src/kv-cache.ts` — `buildCacheKey` folds `themeFp`; `prefix` documented as the content version.
- `packages/edge/src/host-adapter.ts` — `themeFingerprint` via `contentAddressOf`; the `compile`-without-`prefix` diagnostic.
- `packages/cloudflare/src/middleware.ts` — the conditional-cache docstrings.
- `tests/unit/edge/kv-cache.test.ts` — the theme-fingerprint segregation guard.

## Rejected alternatives

- **Fold a manifest fingerprint (all boundary ids) into the key.** Still a proxy — it misses build-time content (grid strings) that no boundary id covers; it re-commits the sin one layer out.
- **Auto-derive the content version by hashing `compile()` output at init.** Correct for a pure/arg-less compile but unsafe to call eagerly for a context-dependent one; left as a future ergonomic on top of the explicit `prefix`.
- **Keep "never go stale" and disable caching when a theme resolver is present.** Throws away the cache for the exact tenant/locale/A-B case that most wants it.

## References

- [ADR-0003](./0003-content-addressing.md) — the content-addressing doctrine this conditions (amended there).
- [ADR-0013](./0013-canonical-package.md) — the canonical-bytes kernel the fingerprint builds on.
- `HOSTING.md` §KV trust boundary; `PACKAGE-SURFACES.md` `@czap/edge`.

## Amendment (0.4.0) — active invalidation

The original Consequences accepted PASSIVE purge: a superseded entry is "orphaned by the new key shape … and TTL-reclaimed." That was the one honest gap — until TTL elapses (or forever, when no TTL is set), a stale-but-still-keyed entry survives, and there was no way to evict it on demand. 0.4.0 closes it with an ACTIVE primitive, paired with Astro 7's stabilized `Astro.cache` / `cache.invalidate`:

- `BoundaryCache.invalidateByPath(boundaryId)` — purge by content address: list-scan `{prefix}:boundary:{boundaryId}:` (every tier × theme × qualifier variant shares that prefix) and delete them. The active form of "mint a new address, wait for TTL."
- `BoundaryCache.invalidateByTag(tag)` — purge by external label (Astro.cache tag parity), backed by a `{prefix}:tag:{tag}` index that `putCompiledOutputs` maintains when given `tags`.

`KVNamespace.delete`/`list` are OPTIONAL: a provider without them still caches correctly and invalidation degrades to a one-time diagnostic + the original passive TTL behavior — never a silent no-op. The content-addressed key model is unchanged; this adds an eviction verb, it does not alter identity.

- `packages/edge/src/kv-cache.ts` — `invalidateByPath` / `invalidateByTag`, the tag index, the degradation diagnostic.
- `tests/unit/edge/kv-invalidation.test.ts` — purge-all-variants, list pagination, tag purge + index cleanup, graceful degradation.
