/**
 * API Health Canary -- programmatic verification of all public APIs.
 *
 * This test is the czap equivalent of free-batteries' ANTI-ALMOST-CORRECTNESS
 * PROTOCOL. It catches hallucinated, renamed, or removed APIs before they
 * reach production.
 *
 * If a namespace method is removed or renamed, THIS test fails first.
 * If an AI model generates code referencing a non-existent API, THIS test
 * would have caught the discrepancy.
 *
 * The registry below is the ground truth for what @czap/core exports.
 * Update it when you intentionally add/remove/rename APIs.
 */

import { describe, test, expect } from 'vitest';
import * as Core from '@czap/core';

// ── Ground-truth API registry ───────────────────────────────────────
// Every namespace object and its expected methods/values.
// This is intentionally exhaustive — all 47+ core modules.

const API_REGISTRY: Record<string, { methods: string[]; values?: string[] }> = {
  // ── Rendering primitives ──────────────────────────────────────────
  Boundary: { methods: ['make', 'evaluate', 'evaluateWithHysteresis'] },
  BoundarySpec: { methods: ['isActive'] },
  BoundaryAttribute: { methods: ['isAllowedKey'] },
  Token: { methods: ['make', 'tap', 'cssVar'] },
  TokenBuffer: { methods: ['make'] },
  Style: { methods: ['make', 'tap', 'mergeLayers'] },
  Theme: { methods: ['make', 'tap'] },
  Component: { methods: ['make'] },
  Signal: { methods: ['make', 'controllable', 'audio'] },
  Easing: {
    methods: [
      'linear',
      'easeInCubic',
      'easeOutCubic',
      'easeInOutCubic',
      'easeOutExpo',
      'easeOutBack',
      'easeOutElastic',
      'easeOutBounce',
      'ease',
      'easeIn',
      'easeOut',
      'easeInOut',
      'spring',
      'cubicBezier',
      'springToLinearCSS',
      'springNaturalDuration',
    ],
  },
  Animation: { methods: ['run', 'interpolate'] },
  Timeline: { methods: ['from'] },

  // ── Compositor / ECS / scheduling ─────────────────────────────────
  Compositor: { methods: ['create'] },
  CompositorStatePool: { methods: ['make'] },
  BlendTree: { methods: ['make'] },
  DirtyFlags: { methods: ['make'] },
  FrameBudget: { methods: ['make'] },
  Scheduler: { methods: ['raf', 'noop', 'fixedStep', 'audioSync'] },
  Part: { methods: ['dense'] },
  World: { methods: ['make'] },
  Composable: { methods: ['make', 'compose', 'merge'] },
  ComposableWorld: { methods: ['make', 'dense'] },

  Op: {
    methods: ['make', 'fromPromise', 'succeed', 'fail', 'all', 'allSettled', 'race', 'retry', 'timeout'],
  },

  // ── Reactive primitives ───────────────────────────────────────────
  Cell: { methods: ['make', 'fromStream', 'all', 'map'] },
  Derived: { methods: ['make', 'combine', 'map', 'flatten'] },
  Zap: { methods: ['make', 'fromDOMEvent', 'merge', 'map', 'filter', 'debounce', 'throttle'] },
  Wire: {
    methods: ['from', 'fromSSE', 'fromWebSocket', 'fromAsyncIterable', 'zip', 'merge', 'runCollect', 'runForEach'],
  },
  Store: { methods: ['make', 'makeWithEffect'] },
  LiveCell: { methods: ['make', 'makeBoundary'] },

  // ── Content addressing / receipts / DAG ───────────────────────────
  TypedRef: { methods: ['create', 'equals', 'canonicalize', 'hash'] },
  Receipt: {
    methods: [
      'createEnvelope',
      'buildChain',
      'validateChain',
      'validateChainDetailed',
      'hashEnvelope',
      'isGenesis',
      'head',
      'tail',
      'append',
      'findByHash',
      'findByKind',
      'generateMACKey',
      'macEnvelope',
      'verifyMAC',
    ],
    values: ['GENESIS'],
  },
  DAG: {
    methods: [
      'empty',
      'ingest',
      'ingestAll',
      'fromReceipts',
      'checkForkRule',
      'linearize',
      'linearizeFrom',
      'getHeads',
      'canonicalHead',
      'isFork',
      'ancestors',
      'isAncestor',
      'commonAncestor',
      'size',
      'merge',
    ],
  },
  HLC: {
    methods: ['create', 'compare', 'increment', 'merge', 'encode', 'decode', 'makeClock', 'tick', 'receive'],
  },
  VectorClock: {
    methods: [
      'make',
      'from',
      'get',
      'tick',
      'merge',
      'happensBefore',
      'concurrent',
      'equals',
      'compare',
      'toObject',
      'peers',
      'size',
    ],
  },
  Codec: { methods: ['make'] },
  Plan: { methods: ['make', 'validate', 'topoSort'] },
  // GraphPatch — typed graph mutation + structural differ (P5b).
  GraphPatch: {
    methods: ['propose', 'apply', 'preview', 'validate', 'diff', 'decode', 'patchId', 'receipt', 'forkOf'],
  },
  RuntimeCoordinator: { methods: ['create'] },
  Diagnostics: {
    methods: ['warn', 'error', 'warnOnce', 'setSink', 'resetSink', 'clearOnce', 'reset', 'createBufferSink'],
  },
  Config: { methods: ['make', 'toViteConfig', 'toAstroConfig', 'toTestAliases'] },

  // ── Generative UI / video ─────────────────────────────────────────
  GenFrame: { methods: ['make', 'resolveGap'] },
  VideoRenderer: { methods: ['make'] },
  AVBridge: { methods: ['make'] },
  AVRenderer: { methods: ['make'] },
  UIQuality: { methods: ['make'], values: ['boundary'] },

  // ── Device / capability ───────────────────────────────────────────
  Cap: {
    methods: ['empty', 'from', 'grant', 'revoke', 'has', 'superset', 'union', 'intersection', 'atLeast', 'ordinal'],
  },

  // ── Speculative / WASM ────────────────────────────────────────────
  SpeculativeEvaluator: { methods: ['make'] },
  WASMDispatch: { methods: ['detect', 'load', 'kernels', 'isLoaded', 'unload'] },

  // ── Capsule factory ───────────────────────────────────────────────
  TypeValidator: { methods: ['validate'] },

  // ── Canonical CBOR (RFC 8949 §4.2.1) ─────────────────────────────
  CanonicalCbor: { methods: ['encode'] },

  // ── ShipCapsule (ADR-0011) ────────────────────────────────────────
  AddressedDigest: { methods: ['of'] },
  ShipCapsule: { methods: ['make', 'canonicalize', 'decode', 'computeId'] },

  // ── AI cast PRIMITIVE (graph→context/schema→validated proposal) ───
  // "LiteShip teaches graphs how to speak to models; products decide whether
  // model suggestions become action." Casts a DocumentGraph OUT to a content-
  // addressed AIContext + output schemas; validates the patch / UI tree the
  // model proposes back IN (minting the ValidatedProposal envelope); exposes
  // (never invokes) the host-authorized apply step. NO auto-apply, NO network.
  AICast: {
    methods: [
      'castContext',
      'summarizeGraph',
      'graphPatchProposalSchema',
      'generatedUIProposalSchema',
      'validateGraphPatchProposal',
      'validateGeneratedUIProposal',
      'applyValidatedPatch',
    ],
  },

  // Harness lives at `@czap/core/harness` sub-path — intentionally NOT in
  // the main entry to keep fast-check + code-gen surface out of every
  // consumer's bundle. Verified separately below.
};

// ── Standalone function exports ─────────────────────────────────────
const STANDALONE_FUNCTIONS = [
  // `brand` removed from main entry — it is the unsafe escape-hatch the
  // sanctioned brand constructors compose with, and exposing it on the public
  // surface lets consumers forge any brand. Tests that need it import from
  // the source module directly.
  // `isSchemaError` removed from main entry — was an orphan re-export of
  // effect/Schema. Consumers can import directly from 'effect/Schema'.
  'isCell',
  'isDerived',
  'isZap',
  'isWire',
  'fnv1a',
  'fnv1aBytes',
  // JSON-Schema deriver (single-source-of-truth migration): derives a command
  // descriptor's JSON-Schema from ONE Effect Schema (Schema.Type + outputSchema
  // from one source), killing the hand-maintained-JSON-Schema-beside-the-type
  // drift. Production module (NOT harness/) so @czap/command imports it without
  // pulling fast-check into its runtime.
  'schemaToJsonSchema',
  // `isValidationError` removed from the main entry — core migrated to the
  // `@czap/error` algebra; consumers use `hasTag(e, 'ValidationError')` from
  // `@czap/error` (no per-package guard re-export, no compat shim).
  'defineConfig',
  'tupleMap',
  // The single f32-canonical boundary state-index kernel (Phase-0 evaluator
  // consolidation). Public so @czap/worker's host startup path delegates to it.
  'rawIndexF32',
  // Projection vocabulary (Phase-1 Layer 1): per-quantizer output key naming +
  // the canonical GLSL identifier, shared by compositor/worker/astro-gpu/compiler.
  'projectionKeys',
  'glslIdent',
  // the canonical WGSL identifier (D1-WGSL): bare snake_case field name, shared
  // by compositor/worker/astro-wgpu/compiler — the WGSL twin of `glslIdent`.
  'wgslIdent',
  // Signal source-of-truth round-trip (0.3.0): the sanctioned bidirectional
  // SignalSource <-> input-string mapper (dot-string axes + colon-delimited
  // media:/custom: payloads) + the axis-type reader. One vocabulary shared by the
  // astro runtime, vite css-quantize, and the inspector — replacing the forks.
  'sourceToInput',
  'inputToSource',
  'inputSourceType',
  // DocumentGraph IR kernel (P2): the one content-addressing primitive + the
  // node/graph seal/validate/linearize surface.
  'contentAddressOf',
  // The canonical-CBOR byte serializer behind `contentAddressOf` — surfaced so the
  // capsule generator-provenance digests (@czap/command) hash the SAME canonical
  // bytes the content-address kernel does (one canonicalization, no fork).
  'canonicalAddressBytes',
  'sealNode',
  'sealGraph',
  'nodeFromParts',
  'nodeLogicalKey',
  'validateGraph',
  'linearizeGraph',
  // Client→server graph-mutation channel (0.7.0): the server core + the client sender.
  'handleGraphMutation',
  'sendGraphMutation',
  'handleGraphQuery',
  'sendGraphQuery',
  'graphQueryEtag',
  'normalizeGraphQueryEtag',
  'parseGraphQueryEtagList',
  'createGraphQueryRefreshBase',
  // #133 correctness: `discreteSignalPayloadsFromPatch` DELETED (it derived a
  // runtime state VALUE from a SignalNode content-address). The value now arrives
  // typed in the DiscreteStateTransition receipt payload.
  'chainPatchesBetween',
  'replayDiscreteFromPatchReceipts',
  'runGraphNativeGapReplay',
  // DiscreteStateTransition (#133): typed, attestation-checked authority record
  // for a discrete crossing — the ONE hash law + the `${base}#${cell}` subject law.
  'transitionReceipt',
  'mintTransition',
  'decodeDiscreteStateTransition',
  'applyTransition',
  'discreteTransitionSubjectId',
  // Channel additions (0.8.0): the shared applied-graph adopt guard + the
  // client-side base state machine (serialized submits, bounded stale-retry).
  'verifyAppliedGraph',
  'createGraphMutationClient',
  // Version-aware, fail-closed reader for an untrusted DocumentGraph value
  // (Slice C artifact-migration): gates `_tag`/`_version` + per-node
  // well-formedness, rejecting a future-version/malformed graph with one tagged
  // ParseError instead of silently misparsing it into a v1 shape.
  'decodeDocumentGraph',
  // DocumentGraph node well-formedness — the ONE trust gate shared by the AI
  // proposal validator and the @czap/astro runtime graph loader (0.4.0 item B).
  'isWellFormedNode',
  // Escalation chooser (P5c): the reader of PolicyNode — picks the minimal
  // CapTier rung a policy admits on a runtime site.
  'chooseRung',
  // Capability-admissibility ladder projector (cap-axes rename): projects the
  // single index-keyed `LADDER_TARGETS` ladder onto a vocabulary's rung order.
  // The core escalation `RUNG_TARGETS` (CapTier) and the quantizer's
  // `TIER_TARGETS` (MotionTier) both derive from it, so the two cannot drift.
  'projectLadder',
  // AI cast validated-output envelope (the shared discipline for GraphPatch AND
  // genui GeneratedUITree proposals). `mintValidated` (the sole token mint site)
  // is intentionally NOT exported, so the envelope stays un-forgeable. These are
  // the CONSUMER-side helpers: `assertTokenBinds`/`unwrapValidated` re-derive the
  // token binding before a host applies/renders (the un-bypassable door, generalized
  // to both targets); `proposalSubject` exposes the citable content-address;
  // `proposalReceiptSubject` derives the `{ type:'artifact', id }` a host seeds its
  // receipt DAG with (sync seam onto the existing receipt machinery).
  'assertTokenBinds',
  'unwrapValidated',
  'proposalSubject',
  'proposalReceiptSubject',
  'defineCapsule',
  'getCapsuleCatalog',
  // `resetCapsuleCatalog` lives at `@czap/core/testing` sub-path — see below.
  // ShipCapsule release-input addressing helpers (tarballManifestAddress,
  // lockfileAddress, workspaceManifestAddress, normalizedDryRunAddress,
  // normalizeDryRunOutput) live in @czap/cli per ADR-0011 — they import
  // node:zlib and must stay out of the browser-bundleable @czap/core.
  // The determinism substrate (0.4.0) — the FUNCTION half: deterministic clock/rng
  // factories. `fixedClock`/`manualClock` build injectable test clocks; `seededRng`
  // a replayable RNG. (The singleton boundaries systemClock/wallClock/systemRng are
  // value-objects → STANDALONE_OBJECTS.)
  'fixedClock',
  'manualClock',
  'seededRng',
  // The deterministic frame-state -> RGBA painter (0.4.0 stage/render): the single
  // source of truth both ffmpeg backends composite through, so a given CompositeState
  // always yields byte-identical, content-addressable pixels. Pure function.
  'compositeStateToRgba',
  // Authored-motion + self-managing-state surface (Epic 9). Typed interpolation +
  // TransitionNode interpreter (#130 c1-2), reveal intent sugar (#124), and the
  // stream-recovery discrete/continuous helpers (#133). All standalone functions.
  'interpolate',
  'interpolateTyped',
  'parseTypedBinding',
  'formatTypedValue',
  'interpretTransition',
  'lowerRevealIntent',
  'resolveRevealInitialState',
  'ssrRevealPaint',
  'lowerStaggerIntent',
  'resolveStaggerInitialState',
  'lowerScrollTimelineIntent',
  'resolveScrollTimelineInitialState',
  'motionPropToBinding',
  'asReplayableRecoveryCell',
  'signalSourceKind',
  'signalPayloadKind',
  'isReplayHtmlPatch',
  'replayDroppedSignals',
  'filterDiscreteSnapshotSignals',
  'validateSnapshotSignalsField',
  // The ONE effective-candidate law (#140): every responsive-media output (src, srcset,
  // <source>, preload imagesrcset, CSS image-set, cache-key digest) derives from it, so
  // Save-Data never advertises a heavy candidate through any artifact.
  'selectCandidates',
  'resolveResponsiveMedia',
  'buildResponsiveSrcset',
  'buildResponsiveImageSet',
  'projectResponsiveMediaPicture',
  // Runtime easing sampler (#126, W8) + the multi-transition algebra (#141, W9) +
  // the ONE cross-target motion kernel (#130, W10): every non-CSS target samples
  // `sampleProgram`, and the differential oracle pins them all to it.
  'sampleRuntimeEasing',
  'lowerTransitionProgram',
  'interpretProgram',
  'sampleProgramWindows',
  'sampleProgram',
  'sampleProgramUniforms',
  'lowerRevealChain',
  'staggerProgram',
];

// ── Error classes ───────────────────────────────────────────────────
// Empty: core migrated to the `@czap/error` algebra. `CzapValidationError`
// (the old ad-hoc class) was deleted — validation failures are now the tagged
// `ValidationError` value from `@czap/error`, never re-exported from core.
const ERROR_CLASSES: string[] = [];

// Namespace objects that aren't in the main API_REGISTRY (utility re-exports)
const STANDALONE_OBJECTS = [
  // The determinism substrate (0.4.0) — the SINGLETON boundaries: the only two
  // sanctioned ambient time reads (`systemClock` monotonic perf.now for durations,
  // `wallClock` epoch Date.now for timestamps/HLC) + the sanctioned Math.random
  // read (`systemRng`). Every other runtime path threads an injected clock/rng
  // defaulting to these. Value-objects ({now}/{next}), not functions.
  'systemClock',
  'wallClock',
  'systemRng',
  'fallbackKernels',
  'VIEWPORT',
  'boundaryEvaluateCapsule',
  'tokenBufferCapsule',
  'canonicalCborCapsule',
  'canonicalCborDecodeCapsule',
  // GraphPatch round-trip identity capsule (F): proves encode→decode→diff→patch
  // →re-encode holds under the content-addressed multiset law.
  'graphPatchIdentityCapsule',
  // Escalation chooser capsule: the FIRST policyGate instance (ADR-0008). Locks
  // chooseRung's allow/deny + reason-chain + minimal-downgrade / site-gate laws as
  // a standing policyGate contract — the canonical permission/authz check.
  'escalationChooseRungCapsule',
  // DocumentGraph addressing capsule: locks addressDocumentGraph's determinism /
  // fnv1a format / order-independence (CUT B1 code-unit guard).
  'documentGraphAddressCapsule',
  // AI cast summarizer capsule: locks summarizeGraph's determinism / budget-honesty
  // / budget-monotonicity / node-count-honesty as a standing pureTransform contract.
  'aiCastSummarizeCapsule',
  // AI cast proposal-envelope capsule: locks the load-bearing security laws —
  // no-bypass (tampered proposal refused at apply), apply-accepts-only-minted-token,
  // validated-proposal determinism, valid-applies-and-re-addresses, rejection-never-mints.
  'aiCastProposalCapsule',
  // DocumentGraph node schema: the effect/Schema union (the single source of
  // truth `isWellFormedNode` reads) surfaced so hosts can decode/validate nodes.
  'DocumentGraphNodeSchema',
  // Authored-motion + self-managing-state namespace objects (Epic 9): reveal intent
  // sugar (#124) and the StateCell/ProjectionState typed-authority surface (#130 c5).
  // `export const X = { ... }` value-objects, not functions.
  'Reveal',
  'Stagger',
  'ScrollTimeline',
  'ResponsiveMedia',
  'StateCell',
  'ProjectionState',
  'StateCellStore',
];

// ── Centralized default constants (re-exported from defaults.ts) ────
const DEFAULT_CONSTANTS = [
  'DEFAULT_TARGET_FPS',
  'MS_PER_SEC',
  'SSE_BUFFER_SIZE',
  'SSE_HEARTBEAT_MS',
  'SSE_RECONNECT_INITIAL_MS',
  'SSE_RECONNECT_MAX_MS',
  'COMPOSITOR_POOL_CAP',
  'DIRTY_FLAGS_MAX',
  'WASM_SCRATCH_BASE',
  'WASM_BATCH_MAX',
  'CAPTURE_KEYFRAME_INTERVAL',
  'EASING_SPRING_STEPS',
  'THEME_TRANSITION_DURATION_MS',
  'THEME_TRANSITION_EASING',
  'GRAPH_QUERY_FALLBACK_HEADER',
  'CANVAS_FALLBACK_WIDTH',
  'CANVAS_FALLBACK_HEIGHT',
  // Worker-blob twin of rawIndexF32 as an inlinable JS source string (Phase-0).
  'EVALUATE_THRESHOLDS_SOURCE',
  // Worker-blob twin of projectionKeys as an inlinable JS source string (Phase-1).
  'PROJECTION_KEYS_SOURCE',
  // The single index-keyed capability-admissibility ladder + its rung count, the
  // shared source `RUNG_TARGETS` (CapTier) and `TIER_TARGETS` (MotionTier) both
  // project from via `projectLadder` (cap-axes rename).
  'LADDER_TARGETS',
  'LADDER_RUNGS',
  // The ONE spring config the CSS `linear()` path and the JS floor default to (#126, Law 4).
  'DEFAULT_MOTION_SPRING',
];

// ── Branded type constructors (re-exported from brands.ts) ──────────
const BRANDED_CONSTRUCTORS = [
  'SignalInput',
  'ThresholdValue',
  'StateName',
  'ContentAddress',
  'IntegrityDigest',
  'TokenRef',
  'Millis',
  'EntityId',
];

// ── Tests ───────────────────────────────────────────────────────────

describe('API health canary', () => {
  describe('namespace objects', () => {
    for (const [ns, spec] of Object.entries(API_REGISTRY)) {
      describe(ns, () => {
        test(`${ns} exists as an object`, () => {
          const val = (Core as Record<string, unknown>)[ns];
          expect(val).toBeDefined();
          expect(typeof val).toBe('object');
        });

        for (const method of spec.methods) {
          test(`${ns}.${method} is a function`, () => {
            const nsObj = (Core as Record<string, Record<string, unknown>>)[ns];
            expect(nsObj).toBeDefined();
            expect(typeof nsObj[method]).toBe('function');
          });
        }

        if (spec.values) {
          for (const value of spec.values) {
            test(`${ns}.${value} exists`, () => {
              const nsObj = (Core as Record<string, Record<string, unknown>>)[ns];
              expect(nsObj).toBeDefined();
              expect(nsObj[value]).toBeDefined();
            });
          }
        }
      });
    }
  });

  describe('standalone functions', () => {
    for (const fn of STANDALONE_FUNCTIONS) {
      test(`${fn} is exported as a function`, () => {
        expect(typeof (Core as Record<string, unknown>)[fn]).toBe('function');
      });
    }
  });

  describe('standalone objects', () => {
    for (const obj of STANDALONE_OBJECTS) {
      test(`${obj} is exported`, () => {
        expect((Core as Record<string, unknown>)[obj]).toBeDefined();
      });
    }
  });

  describe('branded constructors', () => {
    for (const ctor of BRANDED_CONSTRUCTORS) {
      test(`${ctor} is exported`, () => {
        expect((Core as Record<string, unknown>)[ctor]).toBeDefined();
      });
    }
  });

  describe('default constants', () => {
    for (const name of DEFAULT_CONSTANTS) {
      test(`${name} is exported`, () => {
        const val = (Core as Record<string, unknown>)[name];
        expect(val).toBeDefined();
        expect(
          typeof val === 'number' || typeof val === 'string' || typeof val === 'object',
          `${name} should be a number, string, or object, got ${typeof val}`,
        ).toBe(true);
      });
    }
  });

  describe('error classes', () => {
    for (const name of ERROR_CLASSES) {
      test(`${name} is exported as a constructor`, () => {
        const val = (Core as Record<string, unknown>)[name];
        expect(val).toBeDefined();
        expect(typeof val).toBe('function');
      });
    }

    // Footgun gate: the old ad-hoc error classes were deleted when core moved
    // to the `@czap/error` algebra. They must NOT reappear on the surface —
    // validation/guard helpers now live in `@czap/error` (`ValidationError`,
    // `hasTag(e, 'ValidationError')`), never re-exported here.
    test('the deleted ad-hoc error classes are NOT on the main entry', () => {
      const core = Core as Record<string, unknown>;
      expect(core.CzapValidationError).toBeUndefined();
      expect(core.isValidationError).toBeUndefined();
    });
  });

  describe('registry completeness', () => {
    test('no undocumented namespace exports', () => {
      const documented = new Set([
        ...Object.keys(API_REGISTRY),
        ...STANDALONE_FUNCTIONS,
        ...STANDALONE_OBJECTS,
        ...BRANDED_CONSTRUCTORS,
        ...DEFAULT_CONSTANTS,
        ...ERROR_CLASSES,
        // SchemaError + isSchemaError were removed from the main entry as
        // orphan re-exports of effect/Schema (no in-repo consumers).
      ]);

      const actual = Object.keys(Core).filter((k) => !k.startsWith('_'));

      const undocumented = actual.filter((k) => !documented.has(k));
      expect(
        undocumented,
        `Undocumented exports found: ${undocumented.join(', ')}.\n` +
          'Add them to API_REGISTRY, STANDALONE_FUNCTIONS, or BRANDED_CONSTRUCTORS ' +
          'in tests/unit/meta/api-health.test.ts',
      ).toEqual([]);
    });
  });

  describe('sub-path exports', () => {
    test('@czap/core/testing exposes resetCapsuleCatalog', async () => {
      const Testing = await import('@czap/core/testing');
      expect(typeof Testing.resetCapsuleCatalog).toBe('function');
    });

    test('@czap/core/harness exposes the harness generators', async () => {
      const Harness = await import('@czap/core/harness');
      const expected = [
        'generatePureTransform',
        'generateReceiptedMutation',
        'generateStateMachine',
        'generateSiteAdapter',
        'generatePolicyGate',
        'generateCachedProjection',
        'generateSceneComposition',
      ];
      for (const name of expected) {
        expect(typeof (Harness as Record<string, unknown>)[name]).toBe('function');
      }
    });

    test('resetCapsuleCatalog is NOT on the main entry (footgun gate)', () => {
      expect((Core as Record<string, unknown>).resetCapsuleCatalog).toBeUndefined();
    });

    test('Harness namespace is NOT on the main entry (bundle-weight gate)', () => {
      expect((Core as Record<string, unknown>).Harness).toBeUndefined();
    });
  });
});
