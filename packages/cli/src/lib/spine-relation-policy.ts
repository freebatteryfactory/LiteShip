/**
 * The SPINE-RELATION admission table — the LiteShip-LOCAL, host-owned seed the two-axis
 * `spineRelationGate` classifies against (Wave 8.5, issue #156). Relocated from the test
 * fixture tree into the CLI host, alongside the sibling injected policies
 * (`taint-policy.ts`, `capability-policy.ts`, `active-surface-policy.ts`): WHICH types
 * LiteShip mirrors in `@liteship/_spine`, their runtime producers, and the FROZEN relation
 * each holds are repo-local CONTRACTS a reviewer owns — not a published surface.
 *
 * This is DATA, not policy logic (ADR-0012): `@liteship/audit`'s `buildSpineRelationFacts` and
 * `@liteship/gauntlet`'s gate are reusable and name no LiteShip mirror; the CLI host threads
 * this table in as a value (the same boundary the taint registry / capability modules ride).
 *
 * SEEDED FROM THE FROZEN PINS (the relocated guarantee — S5.2 / Conflict-1). Every row here
 * was a bidirectional `IsEqual` / assignability pin in `tests/unit/spine-conformance.test.ts`;
 * the relation gate reproduces each pin's catch mechanically over this COMPLETE set, so the
 * pins can be absorbed without an authority gap. The `admittedRelation` field is the FROZEN
 * two-axis fidelity the reconciled (post-Wave-8) spine exhibits — a drift moves the OBSERVED
 * relation away from it.
 *
 * Two axes (ADR-0010): `authority` — `runtime` for shapes the runtime owns and the spine
 * hand-mirrors; `spine` for branded scalars the spine OWNS and the runtime re-exports
 * (`brand-reanchored`). `admittedRelation` — the structural fidelity the checker observes
 * (`exact` / `public-wider` / …), or `brand-reanchored` for the re-anchored scalars.
 *
 * @module
 */

import type { SpineTypeAdmission } from '@liteship/audit';

/** A runtime-authority mirror (the runtime owns the shape; the spine hand-mirrors it). */
function runtimeMirror(
  typeName: string,
  runtimeModule: string,
  admittedRelation: SpineTypeAdmission['admittedRelation'] = 'exact',
  expr: string = typeName,
): SpineTypeAdmission {
  return { typeName, authority: 'runtime', admittedRelation, spineExpr: expr, runtimeModule, runtimeExpr: expr };
}

/** A spine-authority branded scalar (the spine owns the brand; the runtime re-exports it). */
function reanchoredBrand(typeName: string): SpineTypeAdmission {
  return {
    typeName,
    authority: 'spine',
    admittedRelation: 'brand-reanchored',
    spineExpr: typeName,
    runtimeModule: 'packages/core/src/schema/brands.ts',
    runtimeExpr: typeName,
  };
}

const CORE = 'packages/core/src';
const EDGE = 'packages/edge/src';

/** The frozen admission table — every currently-pinned spine mirror type. */
export const LITESHIP_SPINE_ADMISSIONS: readonly SpineTypeAdmission[] = [
  // ── @liteship/core runtime shapes (the three historical drift fixtures live here) ──
  runtimeMirror('CompositeState', `${CORE}/media/compositor.ts`), // WGSL-omission drift class
  runtimeMirror('VideoConfig', `${CORE}/media/video.ts`), // Millis-brand-loss drift class
  runtimeMirror('CaptureResult', `${CORE}/evidence/capture.ts`), // Millis-brand-loss drift class
  runtimeMirror('CapSet', `${CORE}/evidence/caps.ts`), // Set→array drift class
  // Codec, decomposed into FIELDS. A whole-shape `public-wider` verdict is a WEAK
  // pin: the `schema` field alone produces (s2r=false, r2s=true), so a SECOND field
  // (encode/decode) widening in the SAME direction is absorbed and never surfaces
  // (adversarial QA Finding 1 — an `encode(): Result | Promise` drift passed the
  // whole-shape pin). Pinning the fields SEPARATELY reproduces the deleted
  // `__codecSpineTypeContract`'s bidirectional encode/decode pins exactly: encode/decode
  // are `exact` (a transport drift reds them), `schema` is the one deliberately wider
  // field (kernel Schema ⊂ SchemaPort). This is the drift that motivated the whole gate.
  runtimeMirror(
    "Codec['encode']",
    `${CORE}/schema/codec.ts`,
    'exact',
    "Codec<{ readonly a: 1 }, { readonly a: 1 }>['encode']",
  ),
  runtimeMirror(
    "Codec['decode']",
    `${CORE}/schema/codec.ts`,
    'exact',
    "Codec<{ readonly a: 1 }, { readonly a: 1 }>['decode']",
  ),
  runtimeMirror(
    "Codec['schema']",
    `${CORE}/schema/codec.ts`,
    'public-wider',
    "Codec<{ readonly a: 1 }, { readonly a: 1 }>['schema']",
  ),
  runtimeMirror('Config', `${CORE}/authoring/config.ts`, 'exact', 'Config'),

  // ── @liteship/design shapes (re-exported as Token/Theme/Style namespaces from core) ──
  runtimeMirror('Token', `${CORE}/authoring/token.ts`, 'exact', 'Token'),
  runtimeMirror('Theme', `${CORE}/authoring/theme.ts`, 'exact', 'Theme'),
  runtimeMirror('Style', `${CORE}/authoring/style.ts`, 'exact', 'Style'),

  // ── @liteship/edge KV-cache + manifest shapes (producing modules) ──
  runtimeMirror('KVNamespace', `${EDGE}/kv-cache.ts`),
  runtimeMirror('CompiledOutputs', `${EDGE}/kv-cache.ts`),
  runtimeMirror('CompiledGLSLOutput', `${EDGE}/kv-cache.ts`),
  runtimeMirror('CompiledWGSLOutput', `${EDGE}/kv-cache.ts`),
  runtimeMirror('BoundaryCache', `${EDGE}/kv-cache.ts`),
  runtimeMirror('BoundaryManifest', `${EDGE}/manifest.ts`),
  runtimeMirror('BoundaryManifestEntry', `${EDGE}/manifest.ts`),
  runtimeMirror('BoundaryManifestFile', `${EDGE}/manifest.ts`),
  runtimeMirror('TierKey', `${EDGE}/manifest.ts`),

  // ── @liteship/edge public host surface (the @liteship/edge index barrel) ──
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

  // ── @liteship/_spine-owned branded scalars (ADR-0010: the spine owns, the runtime re-exports) ──
  reanchoredBrand('Millis'),
  reanchoredBrand('ContentAddress'),
  reanchoredBrand('IntegrityDigest'),
  reanchoredBrand('AddressedDigest'),
  reanchoredBrand('SignalInput'),
  reanchoredBrand('ThresholdValue'),
  reanchoredBrand('StateName'),
  reanchoredBrand('TokenRef'),
];
