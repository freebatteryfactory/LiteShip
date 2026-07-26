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
  spineExpr: string = typeName,
  runtimeExpr: string = spineExpr,
): SpineTypeAdmission {
  return { typeName, authority: 'runtime', admittedRelation, spineExpr, runtimeModule, runtimeExpr };
}

/** One public-runtime barrel whose required exact mirrors are generated as admissions. */
export interface SpineExactRelationCatalogEntry {
  readonly runtimeModule: string;
  readonly relations: readonly (
    | string
    | {
        readonly typeName: string;
        readonly spineExpr: string;
        readonly runtimeExpr?: string;
      }
  )[];
}

/**
 * Project an exact-relation catalog row into the existing relation probe input.
 *
 * The catalog is the census authority: adding a required shared declaration is one
 * reviewed row here, and every consumer (the CLI host, focused gate, and mutation
 * tests) receives the same flattened admissions.  Non-exact exceptions remain
 * explicit below so a deliberately wider surface cannot hide a second drift.
 */
function exactRelations(entry: SpineExactRelationCatalogEntry): readonly SpineTypeAdmission[] {
  return entry.relations.map((relation) => {
    if (typeof relation === 'string') return runtimeMirror(relation, entry.runtimeModule);
    return runtimeMirror(
      relation.typeName,
      entry.runtimeModule,
      'exact',
      relation.spineExpr,
      relation.runtimeExpr ?? relation.spineExpr,
    );
  });
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

/**
 * Required exact shared-declaration relations, grouped by their real PUBLIC source
 * barrel. This replaces sampled one-off admissions with one reviewable census.
 * Generic declarations use one representative structural instantiation; namespace
 * value members use `typeof`, both through the existing TypeScript relation probe.
 */
export const LITESHIP_SPINE_EXACT_RELATION_CATALOG: readonly SpineExactRelationCatalogEntry[] = [
  {
    runtimeModule: `${CORE}/index.ts`,
    relations: [
      'CompositeState',
      'VideoConfig',
      'CaptureResult',
      'CapSet',
      'Config',
      { typeName: 'Plan.topoSort', spineExpr: 'typeof Plan.topoSort' },
      'MotionTier',
      'SignalSourceType',
      'SignalSource',
      { typeName: 'Signal', spineExpr: 'Signal<number>' },
      'CapTier',
      'TransformPart',
      'ColorSpace',
      'TypedValue',
      'RuntimeEasing',
      'RuntimeWriteProperty',
      'RuntimeWriteWindow',
      'RuntimeWritePlan',
      'ProgramUniforms',
      'RuntimeCoordinator',
      'RuntimeCoordinatorConfig',
      'RuntimePhase',
      'Token',
      'Theme',
      'Style',
    ],
  },
  {
    runtimeModule: `${CORE}/authoring/plan.ts`,
    relations: ['TopoSortResult'],
  },
  {
    runtimeModule: `${CORE}/reactive/signal.ts`,
    relations: [
      { typeName: 'Signal.Controllable', spineExpr: 'Signal.Controllable<number>' },
      { typeName: 'Signal.Audio', spineExpr: 'Signal.Audio' },
    ],
  },
  {
    runtimeModule: 'packages/quantizer/src/index.ts',
    relations: [
      'OutputTarget',
      'SpringConfig',
      { typeName: 'DefineQuantizerOptions', spineExpr: 'DefineQuantizerOptions<any, any>' },
      'QuantizerRuntime',
      { typeName: 'QuantizerOutputs', spineExpr: 'QuantizerOutputs<any>' },
      { typeName: 'QuantizerConfig', spineExpr: 'QuantizerConfig<any, any>' },
      { typeName: 'LiveQuantizer', spineExpr: 'LiveQuantizer<any, any>' },
      { typeName: 'OwnedQuantizer', spineExpr: 'OwnedQuantizer<any, any>' },
      'EvaluateResult',
      'TransitionConfig',
      { typeName: 'TransitionMap', spineExpr: 'TransitionMap<string>' },
      { typeName: 'Transition', spineExpr: 'Transition<any>', runtimeExpr: 'TransitionType<any>' },
      { typeName: 'InterpolatedFrame', spineExpr: 'InterpolatedFrame<any>' },
      { typeName: 'AnimatedQuantizerShape', spineExpr: 'AnimatedQuantizerShape<any>' },
      { typeName: 'OwnedAnimatedQuantizer', spineExpr: 'OwnedAnimatedQuantizer<any>' },
    ],
  },
  {
    runtimeModule: 'packages/worker/src/index.ts',
    relations: [
      'WorkerConfig',
      'ToWorkerMessage',
      'FromWorkerMessage',
      'WorkerMetrics',
      'WorkerLike',
      'SPSCRingBufferShape',
      'SPSCRingPair',
      'CompositorWorkerState',
      'ResolvedStateAckPayload',
      'QuantizerBoundarySource',
      'CompositorWorkerShape',
      'RenderWorkerShape',
      'TransferableCanvas',
      'WorkerHostRenderConfig',
      'WorkerHostShape',
      'MotionSampleMessage',
    ],
  },
  {
    runtimeModule: 'packages/vite/src/index.ts',
    relations: [
      'PluginConfig',
      'PrimitiveKind',
      {
        typeName: 'PrimitiveShape',
        spineExpr: "PrimitiveShape<'boundary' | 'token' | 'theme' | 'style'>",
      },
      {
        typeName: 'PrimitiveResolution',
        spineExpr: "PrimitiveResolution<'boundary' | 'token' | 'theme' | 'style'>",
      },
      'QuantizeBlock',
      'QuantizeStateBody',
      'QuantizeNestedRule',
      'QuantizeSheetContext',
      'TokenBlock',
      'ThemeBlock',
      'StyleBlock',
      'VirtualModuleId',
      'VirtualModuleData',
      'CollectBoundaryManifestOptions',
      'HMRPayload',
    ],
  },
  {
    runtimeModule: 'packages/remotion/src/index.ts',
    relations: ['RemotionVideoConfig'],
  },
  {
    runtimeModule: 'packages/command/src/index.ts',
    relations: [
      'CommandJsonSchema',
      'CommandAnnotations',
      'CommandExecutionKind',
      'CapsuleCommandDescriptor',
      'CapsuleCommandInvocation',
      { typeName: 'CapsuleCommandResult', spineExpr: 'CapsuleCommandResult<unknown>' },
      'SceneCompilation',
    ],
  },
  {
    runtimeModule: `${EDGE}/index.ts`,
    relations: [
      'KVNamespace',
      'CompiledOutputs',
      'CompiledGLSLOutput',
      'CompiledWGSLOutput',
      'BoundaryCache',
      'BoundaryManifest',
      'BoundaryManifestEntry',
      'BoundaryManifestFile',
      'TierKey',
      'ClientHintsHeaders',
      'EdgeTierResult',
      'ThemeCompileConfig',
      'ThemeCompileResult',
      'EdgeHostContext',
      'EdgeHostCompileContext',
      'EdgeHostCacheTags',
      'EdgeHostBoundaryConfig',
      'EdgeHostCacheConfig',
      'EdgeHostCacheStatus',
      'EdgeHostBoundaryResolution',
      'EdgeHostAdapterConfig',
      'EdgeHostResolution',
      'EdgeHostAdapter',
    ],
  },
] as const;

/** The frozen admission table — every currently-pinned spine mirror type. */
export const LITESHIP_SPINE_ADMISSIONS: readonly SpineTypeAdmission[] = [
  ...LITESHIP_SPINE_EXACT_RELATION_CATALOG.flatMap(exactRelations),

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
  // The spine intentionally exposes the minimal bridge port Signal.audio reads,
  // while the runtime's private implementation parameter is the richer AVBridge.
  // Preserve the observed direction explicitly so flipping or exactifying it reds.
  runtimeMirror('Signal.audio', `${CORE}/reactive/signal.ts`, 'public-narrower', 'typeof Signal.audio'),
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
