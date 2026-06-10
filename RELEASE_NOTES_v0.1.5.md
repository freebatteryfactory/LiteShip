## [0.1.5] — 2026-06-10

Fixes and features upstreamed from a deep dogfood of the published `0.1.4`
artifacts on a zero-React Astro 6 site, plus the new `liteship` umbrella
package. All **19** packages (18 `@czap/*` + `liteship`) ship at `0.1.5`.

### Added

- `liteship` — the umbrella package: one `npm install liteship` brings every
  publishable `@czap/*` package into node_modules. Deliberately re-exports
  nothing (host integrations carry host-specific peer expectations); imports
  stay on the individual `@czap/*` scopes.
- `@czap/astro` — directive boot scanner: `data-czap-directive` markers (and
  legacy literal `client:*` attributes on plain elements) now activate on
  plain HTML and `Satellite.astro` output. Astro only fires custom `client:*`
  directives on framework islands, so every documented plain-element wiring
  was silently inert. `satelliteAttrs()` emits the marker automatically when
  a boundary is present (`directive: false` opts out).
- `@czap/astro` — `scroll.x` / `scroll.y` / `scroll.progress` signals with a
  rAF-throttled passive observer (`attachSignalObserver`; the viewport-only
  `attachViewportObserver` remains as a deprecated alias).
- `@czap/astro` — `workers.coep` integration/middleware option
  (`'require-corp' | 'credentialless'`); COOP/COEP are now set only when
  absent, so consumer middleware can override them in either `sequence()` order.
- `@czap/audit` — consumer mode: `czap audit --consumer` /
  `consumerDevopsProfile(cwd)` audit the `@czap/*` packages installed in a
  downstream repo's node_modules (publish-integrity gate). New
  `DevopsProfile.packageRoots` seam; discovery walks node_modules (pnpm
  virtual store included).
- `@czap/cli` — `czap audit --findings` includes the findings array in the
  JSON receipt and per-finding lines in `--pretty` stderr output.

### Fixed

- `@czap/quantizer` — config/output cache identity now includes `tier`,
  `spring`, and `force()` targets; previously the first config minted for a
  boundary+outputs pair was served for every later variant, so e.g. a
  `tier: 'physics'` quantizer created after a `tier: 'transitions'` one never
  emitted glsl outputs. **Note:** `QuantizerConfig.id` values change.
- Examples/tutorial pages with broken or missing boundary payloads
  (`examples/default`, `examples/cloudflare-astro`, `examples/showcase`
  worker page, tutorial live demo) now serialize real boundaries via
  `satelliteAttrs()`.

### Changed

- `@czap/audit` — `surfacePolicy.astroRuntimeFiles` entries are now
  astro-package-relative (e.g. `'src/runtime/boundary.ts'`); entries starting
  with `packages/` keep resolving repo-root-relative for back-compat. New
  optional `surfacePolicy.vitePackage` / `viteVirtualModulesFile` fields
  replace the hardcoded `packages/vite` path (legacy fallback retained).
- Docs: signal list now distinguishes built-in observers from quantizer-fed
  signals (`network.effectiveType` moved to tier detection); Astro docs show
  `<Satellite boundary={...}>` without `client:satellite`.
