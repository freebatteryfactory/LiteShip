/**
 * The SPINE-RELATION admission table — the LiteShip-local, host-injectable seed the
 * two-axis {@link spineRelationGate} classifies against (Wave 8.5, issue #156).
 *
 * This is DATA, not a published surface (ADR-0012): `@czap/audit`'s
 * `buildSpineRelationFacts` and `@czap/gauntlet`'s gate are reusable and name no
 * LiteShip mirror; WHICH types LiteShip mirrors, their runtime producers, and the
 * FROZEN relation each holds are repo-local contracts, threaded in as a value.
 *
 * SEEDED FROM THE FROZEN PINS (the relocated guarantee — S5.2 / Conflict-1). Every
 * row here was a bidirectional `IsEqual` / assignability pin in
 * `tests/unit/spine-conformance.test.ts`; the relation gate reproduces each pin's
 * catch mechanically over this COMPLETE set, so the pins can be absorbed without an
 * authority gap. The `relation` field is the FROZEN two-axis fidelity the reconciled
 * (post-Wave-8) spine exhibits — a drift moves the OBSERVED relation away from it.
 *
 * Two axes (ADR-0010): `authority` — `runtime` for shapes the runtime owns and the
 * spine hand-mirrors; `spine` for branded scalars the spine OWNS and the runtime
 * re-exports (`brand-reanchored`). `relation` — the structural fidelity the checker
 * observes (`exact` / `public-wider` / …), or `brand-reanchored` for the re-anchored
 * scalars.
 *
 * @module
 */

import type { SpineAuthority, SurfaceRelation } from '@czap/gauntlet';

/** One admitted mirror type (mirrors `SpineTypeAdmission` in @czap/audit — data-only). */
export interface SpineAdmissionRow {
  readonly typeName: string;
  readonly authority: SpineAuthority;
  readonly relation: SurfaceRelation;
  /** Type expression under the `@czap/_spine` namespace. */
  readonly spineExpr: string;
  /** Repo-relative `.ts` source path of the runtime producer. */
  readonly runtimeModule: string;
  /** Type expression under the runtime module's namespace. */
  readonly runtimeExpr: string;
}

/** A runtime-authority mirror (the runtime owns the shape; the spine hand-mirrors it). */
function runtimeMirror(
  typeName: string,
  runtimeModule: string,
  relation: SurfaceRelation = 'exact',
  expr: string = typeName,
): SpineAdmissionRow {
  return { typeName, authority: 'runtime', relation, spineExpr: expr, runtimeModule, runtimeExpr: expr };
}

/** A spine-authority branded scalar (the spine owns the brand; the runtime re-exports it). */
function reanchoredBrand(typeName: string): SpineAdmissionRow {
  return {
    typeName,
    authority: 'spine',
    relation: 'brand-reanchored',
    spineExpr: typeName,
    runtimeModule: 'packages/core/src/brands.ts',
    runtimeExpr: typeName,
  };
}

const CORE = 'packages/core/src';
const EDGE = 'packages/edge/src';

/** The frozen admission table — every currently-pinned spine mirror type. */
export const LITESHIP_SPINE_ADMISSIONS: readonly SpineAdmissionRow[] = [
  // ── @czap/core runtime shapes (the three historical drift fixtures live here) ──
  runtimeMirror('CompositeState', `${CORE}/compositor.ts`), // WGSL-omission drift class
  runtimeMirror('VideoConfig', `${CORE}/video.ts`), // Millis-brand-loss drift class
  runtimeMirror('CaptureResult', `${CORE}/capture.ts`), // Millis-brand-loss drift class
  runtimeMirror('CapSet', `${CORE}/caps.ts`), // Set→array drift class
  // Codec.Shape, decomposed into FIELDS. A whole-shape `public-wider` verdict is a WEAK
  // pin: the `schema` field alone produces (s2r=false, r2s=true), so a SECOND field
  // (encode/decode) widening in the SAME direction is absorbed and never surfaces
  // (adversarial QA Finding 1 — an `encode(): Result | Promise` drift passed the
  // whole-shape pin). Pinning the fields SEPARATELY reproduces the deleted
  // `__codecSpineTypeContract`'s bidirectional encode/decode pins exactly: encode/decode
  // are `exact` (a transport drift reds them), `schema` is the one deliberately wider
  // field (kernel Schema ⊂ SchemaPort). This is the drift that motivated the whole gate.
  runtimeMirror(
    "Codec.Shape['encode']",
    `${CORE}/codec.ts`,
    'exact',
    "Codec.Shape<{ readonly a: 1 }, { readonly a: 1 }>['encode']",
  ),
  runtimeMirror(
    "Codec.Shape['decode']",
    `${CORE}/codec.ts`,
    'exact',
    "Codec.Shape<{ readonly a: 1 }, { readonly a: 1 }>['decode']",
  ),
  runtimeMirror(
    "Codec.Shape['schema']",
    `${CORE}/codec.ts`,
    'public-wider',
    "Codec.Shape<{ readonly a: 1 }, { readonly a: 1 }>['schema']",
  ),
  runtimeMirror('Config.Shape', `${CORE}/config.ts`, 'exact', 'Config.Shape'),

  // ── @czap/design shapes (re-exported as Token/Theme/Style namespaces from core) ──
  runtimeMirror('Token.Shape', `${CORE}/token.ts`, 'exact', 'Token.Shape'),
  runtimeMirror('Theme.Shape', `${CORE}/theme.ts`, 'exact', 'Theme.Shape'),
  runtimeMirror('Style.Shape', `${CORE}/style.ts`, 'exact', 'Style.Shape'),

  // ── @czap/edge KV-cache + manifest shapes (producing modules) ──
  runtimeMirror('KVNamespace', `${EDGE}/kv-cache.ts`),
  runtimeMirror('CompiledOutputs', `${EDGE}/kv-cache.ts`),
  runtimeMirror('CompiledGLSLOutput', `${EDGE}/kv-cache.ts`),
  runtimeMirror('CompiledWGSLOutput', `${EDGE}/kv-cache.ts`),
  runtimeMirror('BoundaryCache', `${EDGE}/kv-cache.ts`),
  runtimeMirror('BoundaryManifest', `${EDGE}/manifest.ts`),
  runtimeMirror('BoundaryManifestEntry', `${EDGE}/manifest.ts`),
  runtimeMirror('BoundaryManifestFile', `${EDGE}/manifest.ts`),
  runtimeMirror('TierKey', `${EDGE}/manifest.ts`),

  // ── @czap/edge public host surface (the @czap/edge index barrel) ──
  runtimeMirror('ClientHintsHeaders', `${EDGE}/index.ts`),
  runtimeMirror('EdgeTierResult', `${EDGE}/index.ts`),
  runtimeMirror('ThemeCompileConfig', `${EDGE}/index.ts`),
  runtimeMirror('ThemeCompileResult', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostContext', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostCompileContext', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostCacheTags', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostBoundaryConfig', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostCacheConfig', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostCacheStatus', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostBoundaryResolution', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostAdapterConfig', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostResolution', `${EDGE}/index.ts`),
  runtimeMirror('EdgeHostAdapter', `${EDGE}/index.ts`),

  // ── @czap/_spine-owned branded scalars (ADR-0010: the spine owns, the runtime re-exports) ──
  reanchoredBrand('Millis'),
  reanchoredBrand('ContentAddress'),
  reanchoredBrand('IntegrityDigest'),
  reanchoredBrand('AddressedDigest'),
  reanchoredBrand('SignalInput'),
  reanchoredBrand('ThresholdValue'),
  reanchoredBrand('StateName'),
  reanchoredBrand('TokenRef'),
];
