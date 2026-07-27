/**
 * Typed, role-bearing contracts for the curated `liteship` facade.
 *
 * The JSON payloads are the authored product decisions. Runtime arrays, numeric
 * budgets, facade tests, and the lean gauntlet gate derive from them. Keeping the
 * payload JSON lets the gauntlet validate it without importing TypeScript or
 * evaluating the facade.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';

export type RootExportKind = 'value' | 'type';
export type RootExportRole = 'authoring' | 'inspection';
export type FacadeStability = 'stable' | 'experimental';
export type FacadeAudience = 'application-author' | 'package-author' | 'host-integrator' | 'operator';
export type FacadeSurfaceClass = 'paved-road' | 'advanced-module';
export type FacadeLifecycleClass = 'active-owned' | 'gc-owned-mutable' | 'pure-allocation';
export type FacadeDisposalContract = 'dispose-async' | 'none';
export type FacadePostDisposeContract = 'inert' | 'not-applicable';
export type FacadeSiblingCleanupContract = 'aggregate' | 'not-applicable';

export interface RootExportContract {
  readonly name: string;
  readonly kind: RootExportKind;
  readonly role: RootExportRole;
  readonly owner: string;
  readonly userStory: string;
  readonly lifecycle: string;
  readonly failureContract: string;
  readonly example: string;
  readonly stability: FacadeStability;
  /** Who should reach for this symbol. `role` is its product category. */
  readonly audience: FacadeAudience;
  /** The concrete module that supplies this public binding. */
  readonly producer: string;
  readonly surfaceClass: 'paved-road';
  readonly relatedInvariant: `INV-${string}`;
  /** Replacement or deprecation route; `none` means the symbol is current. */
  readonly replacement: string;
  /** Executable or compile-time example authority. */
  readonly exampleProof: `tests/${string}.test.ts`;
}

export interface FacadeSubpathContract {
  readonly subpath: `./${string}`;
  readonly specifier: `liteship/${string}`;
  readonly owner: `@liteship/${string}`;
  readonly role: string;
  readonly userStory: string;
  readonly dependencyCost: string;
  readonly packedProof: string;
  readonly lifecycle: string;
  readonly failureContract: string;
  readonly example: string;
  readonly stability: FacadeStability;
  readonly symbol: string;
  readonly reason: string;
  readonly audience: FacadeAudience;
  /** The concrete package/subpath directly re-exported by this advanced route. */
  readonly producer: `@liteship/${string}`;
  readonly surfaceClass: 'advanced-module';
  readonly relatedInvariant: `INV-${string}`;
  readonly replacement: string;
  readonly exampleProof: `tests/${string}.test.ts`;
}

/** One public allocation operation and its exact resource-ownership law. */
export interface FacadeLifecycleOperationContract {
  readonly operation: string;
  readonly specifier: `liteship/${string}`;
  readonly owner: `@liteship/${string}`;
  readonly classification: FacadeLifecycleClass;
  readonly disposal: FacadeDisposalContract;
  readonly postDispose: FacadePostDisposeContract;
  readonly siblingCleanup: FacadeSiblingCleanupContract;
  readonly proof: `tests/${string}`;
  readonly rationale: string;
}

/** Exact executable witness for a public facade failure claim. */
export interface FacadeFailureProofContract {
  readonly test: `tests/${string}.test.ts::${string}`;
  readonly importSource: string;
  readonly operation: string;
  readonly observation: {
    readonly kind: 'diagnostic-and-output-omission';
    readonly code: string;
    readonly outputField: string;
  };
}

/** Authored root decisions. The root admits default authoring and inspection only. */
export const ROOT_EXPORT_CONTRACT_SOURCE = `[
  {
    "name": "defineConfig",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Define the one immutable project configuration consumed by host integrations.",
    "lifecycle": "immutable-definition",
    "failureContract": "Invalid configuration is rejected before host projection.",
    "example": "defineConfig(input)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "defineBoundary",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Partition a continuous input into named application states.",
    "lifecycle": "immutable-definition",
    "failureContract": "Invalid thresholds or states are rejected at definition time.",
    "example": "defineBoundary(input)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "defineQuantizer",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/quantizer",
    "userStory": "Attach target outputs to a boundary without starting a runtime.",
    "lifecycle": "immutable-definition",
    "failureContract": "Incomplete or invalid output maps are rejected before runtime allocation.",
    "example": "defineQuantizer(boundary, options)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/quantizer",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "defineToken",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Define one content-addressed design token.",
    "lifecycle": "immutable-definition",
    "failureContract": "Invalid token identity or values are rejected at definition time.",
    "example": "defineToken(input)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "defineTheme",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Define named token variants as one immutable theme.",
    "lifecycle": "immutable-definition",
    "failureContract": "Invalid variants or token references are rejected at definition time.",
    "example": "defineTheme(input)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "defineStyle",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Define base and state-layer declarations against one boundary.",
    "lifecycle": "immutable-definition",
    "failureContract": "Invalid declarations or state ownership are rejected at definition time.",
    "example": "defineStyle(input)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "defineAdaptive",
    "kind": "value",
    "role": "authoring",
    "owner": "liteship",
    "userStory": "Define adaptive behavior, apply its attributes, inspect state, and emit its compiled plan.",
    "lifecycle": "immutable-definition",
    "failureContract": "Lowering rejects invalid definitions and explanation follows the live quantizer contract.",
    "example": "defineAdaptive(spec)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "./authoring/adaptive.js",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "schema",
    "kind": "value",
    "role": "authoring",
    "owner": "@liteship/core/schema",
    "userStory": "Describe and decode typed data at a semantic boundary.",
    "lifecycle": "immutable-definition",
    "failureContract": "Decode returns structured issues instead of accepting malformed data.",
    "example": "schema.struct(fields)",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "explainDiagnostic",
    "kind": "value",
    "role": "inspection",
    "owner": "@liteship/error",
    "userStory": "Turn a stable diagnostic code into meaning and remediation.",
    "lifecycle": "pure-reader",
    "failureContract": "Unknown codes return no invented explanation.",
    "example": "explainDiagnostic(code)",
    "stability": "stable",
    "audience": "operator",
    "producer": "@liteship/error",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-inhabitation.test.ts"
  },
  {
    "name": "Config",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate an authored project configuration.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking rejects incompatible configuration shapes.",
    "example": "Config",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "Boundary",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate a named-state boundary definition.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking preserves the input and state vocabulary.",
    "example": "Boundary<'viewport.width', readonly ['mobile', 'desktop']>",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "Quantizer",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/schema",
    "userStory": "Annotate the structural mapping from boundary states to outputs.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking rejects state or output mismatches.",
    "example": "Quantizer<Boundary>",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "Token",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate a content-addressed token definition.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking preserves the token value contract.",
    "example": "Token<'brand-accent'>",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "Theme",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate named token variants.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking preserves variant names and token values.",
    "example": "Theme<readonly ['default', 'dark']>",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "Style",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate state-aware style declarations.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking binds style states to the boundary vocabulary.",
    "example": "Style<Boundary>",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "Adaptive",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core",
    "userStory": "Annotate the flagship define, apply, and inspect aggregate.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking keeps attrs, explanation, and plan outputs coherent.",
    "example": "Adaptive",
    "stability": "stable",
    "audience": "application-author",
    "producer": "@liteship/core",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "name": "DiagnosticCode",
    "kind": "type",
    "role": "inspection",
    "owner": "@liteship/error",
    "userStory": "Annotate a stable code accepted by diagnostic inspection.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking rejects unknown diagnostic identifiers.",
    "example": "DiagnosticCode",
    "stability": "stable",
    "audience": "operator",
    "producer": "@liteship/error",
    "surfaceClass": "paved-road",
    "relatedInvariant": "INV-FACADE-EXPORT-BUDGET",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  }
]`;

/** Authored expert-subpath decisions. No subpath reimplements its owner. */
export const FACADE_SUBPATH_CONTRACT_SOURCE = `[
  {
    "subpath": "./schema",
    "specifier": "liteship/schema",
    "owner": "@liteship/core/schema",
    "role": "schema",
    "userStory": "Define, decode, and project transport-agnostic schemas.",
    "dependencyCost": "pure core schema kernel",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "immutable definitions and pure decoders",
    "failureContract": "Malformed data returns structured decode issues.",
    "example": "schema.struct(fields)",
    "stability": "stable",
    "symbol": "schema",
    "reason": "Schema authoring is a coherent expert domain beyond the first adaptive feature.",
    "audience": "application-author",
    "producer": "@liteship/core/schema",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./reactive",
    "specifier": "liteship/reactive",
    "owner": "@liteship/core/reactive",
    "role": "reactive-runtime",
    "userStory": "Allocate and dispose cells, signals, stores, lifetimes, and live quantizers.",
    "dependencyCost": "stateful core and quantizer runtime",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "owned resources require disposal",
    "failureContract": "Disposed resources stop work and invalid state transitions fail loudly.",
    "example": "createCell(initial)",
    "stability": "stable",
    "symbol": "createCell",
    "reason": "Runtime allocation is intentionally distinct from immutable root authoring.",
    "audience": "application-author",
    "producer": "@liteship/core/reactive",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./motion",
    "specifier": "liteship/motion",
    "owner": "@liteship/core/motion",
    "role": "motion",
    "userStory": "Define and execute transitions, timelines, easing, reveal, and stagger behavior.",
    "dependencyCost": "motion kernels",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "timeline resources require disposal",
    "failureContract": "Unsupported or invalid motion intent is refused before execution.",
    "example": "createTimeline(boundary, options)",
    "stability": "stable",
    "symbol": "createTimeline",
    "reason": "Motion is an expert capability with its own lifecycle and vocabulary.",
    "audience": "application-author",
    "producer": "@liteship/core/motion",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./graph",
    "specifier": "liteship/graph",
    "owner": "@liteship/core/graph",
    "role": "document-graph",
    "userStory": "Seal, validate, patch, query, and replay the document graph.",
    "dependencyCost": "graph and evidence kernels",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "immutable sealed graphs plus explicit clients",
    "failureContract": "Invalid nodes, patches, or receipts are rejected before application.",
    "example": "DAG.empty()",
    "stability": "stable",
    "symbol": "DAG",
    "reason": "Graph mutation is an advanced engine workflow, not first-hour authoring.",
    "audience": "application-author",
    "producer": "@liteship/core/graph",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./media",
    "specifier": "liteship/media",
    "owner": "@liteship/core/media",
    "role": "media-runtime",
    "userStory": "Resolve responsive media and run compositor, audio, video, and frame-budget paths.",
    "dependencyCost": "media and compositor runtime",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "owned buffers and renderers require disposal",
    "failureContract": "Invalid media inputs and exhausted budgets are surfaced explicitly.",
    "example": "Compositor.create(options)",
    "stability": "stable",
    "symbol": "Compositor",
    "reason": "Media processing has runtime and performance costs unsuitable for root.",
    "audience": "application-author",
    "producer": "@liteship/core/media",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./evidence",
    "specifier": "liteship/evidence",
    "owner": "@liteship/core/evidence",
    "role": "evidence-and-quality",
    "userStory": "Inspect receipts, diagnostics, quality tiers, capabilities, and addressed evidence.",
    "dependencyCost": "pure evidence kernels",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "pure readers and immutable receipts",
    "failureContract": "Invalid chains, addresses, and capability decisions are refused with structured evidence.",
    "example": "inspectReceipt(receipt)",
    "stability": "stable",
    "symbol": "inspectReceipt",
    "reason": "Receipts and tier policy are expert inspection surfaces.",
    "audience": "operator",
    "producer": "@liteship/core/evidence",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./compiler",
    "specifier": "liteship/compiler",
    "owner": "@liteship/compiler",
    "role": "projection-compiler",
    "userStory": "Compile definitions into CSS, shader, accessibility, AI, and motion targets.",
    "dependencyCost": "compiler kernels",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "pure compilation",
    "failureContract": "CSS state keys outside the boundary are omitted and emit the registered compiler/css/unknown-state-key diagnostic.",
    "example": "CSSCompiler.compile(boundary, input)",
    "stability": "stable",
    "symbol": "CSSCompiler",
    "reason": "Projection targets are advanced escape hatches behind the default Adaptive plan.",
    "audience": "application-author",
    "producer": "@liteship/compiler",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./runtime",
    "specifier": "liteship/runtime",
    "owner": "@liteship/web",
    "role": "browser-runtime",
    "userStory": "Apply streaming, morphing, recovery, integrity, and browser runtime behavior.",
    "dependencyCost": "browser DOM runtime",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "connections and observers require disposal",
    "failureContract": "Unsafe URLs, invalid patches, and broken resumptions fail closed.",
    "example": "Morph.morph(input, input)",
    "stability": "stable",
    "symbol": "Morph",
    "reason": "Browser runtime code must never load through the host-free root.",
    "audience": "application-author",
    "producer": "@liteship/web",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./astro",
    "specifier": "liteship/astro",
    "owner": "@liteship/astro",
    "role": "astro-host",
    "userStory": "Install LiteShip into Astro and apply Adaptive attributes and server projections.",
    "dependencyCost": "optional Astro peer and host adapter",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "host integration lifecycle",
    "failureContract": "Invalid host configuration fails during integration setup or build.",
    "example": "adaptiveAttrs(input)",
    "stability": "stable",
    "symbol": "adaptiveAttrs",
    "reason": "Astro ownership and peer cost require an explicit host subpath.",
    "audience": "host-integrator",
    "producer": "@liteship/astro",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./vite",
    "specifier": "liteship/vite",
    "owner": "@liteship/vite",
    "role": "vite-host",
    "userStory": "Install LiteShip into Vite and compile directive and virtual-module projections.",
    "dependencyCost": "optional Vite peer and host plugin",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "host plugin lifecycle",
    "failureContract": "Invalid directives and configuration produce stable build diagnostics.",
    "example": "plugin(options)",
    "stability": "stable",
    "symbol": "plugin",
    "reason": "Vite ownership and peer cost require an explicit host subpath.",
    "audience": "host-integrator",
    "producer": "@liteship/vite",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./testing",
    "specifier": "liteship/testing",
    "owner": "@liteship/core/harness",
    "role": "test-tooling",
    "userStory": "Generate proof harnesses and inspect the installed fleet roster without exposing test tooling on the production root.",
    "dependencyCost": "test-only harness code and fast-check peer",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "test process only",
    "failureContract": "Invalid harness declarations and stale fleet projections fail deterministically.",
    "example": "generatePureTransform(spec)",
    "stability": "stable",
    "symbol": "generatePureTransform",
    "reason": "Proof generators and fleet metadata are a public package-author contract that must remain isolated from production root imports.",
    "audience": "package-author",
    "producer": "@liteship/core/harness",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./migrate",
    "specifier": "liteship/migrate",
    "owner": "@liteship/compiler/migrate",
    "role": "migration",
    "userStory": "Translate supported external syntax into ordinary LiteShip definitions.",
    "dependencyCost": "compiler parser adapters",
    "packedProof": "check/hermetic:runtime-import+node16+bundler",
    "lifecycle": "pure migration",
    "failureContract": "Unrepresentable source is refused with stable diagnostics and no fabricated definition.",
    "example": "fromMediaQueries(css)",
    "stability": "stable",
    "symbol": "fromMediaQueries",
    "reason": "Migration grammar is an explicit expert boundary, not framework ontology.",
    "audience": "application-author",
    "producer": "@liteship/compiler/migrate",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  },
  {
    "subpath": "./genui",
    "specifier": "liteship/genui",
    "owner": "@liteship/genui",
    "role": "generated-ui",
    "userStory": "Define a trusted component catalog, validate generated UI, and render it without raw package discovery.",
    "dependencyCost": "pure generated-UI catalog and renderer",
    "packedProof": "check/journey:one-install-runtime-reference-identity",
    "lifecycle": "immutable catalog and pure validation/rendering",
    "failureContract": "Unknown components, props, or invalid generated trees are refused before rendering.",
    "example": "defineComponentCatalog(input)",
    "stability": "stable",
    "symbol": "defineComponentCatalog",
    "reason": "Generated UI is a documented product capability that deserves a discoverable facade subpath.",
    "audience": "application-author",
    "producer": "@liteship/genui",
    "surfaceClass": "advanced-module",
    "relatedInvariant": "INV-CONSUMER-SUBPATH-CLOSURE",
    "replacement": "none",
    "exampleProof": "tests/unit/liteship/facade-subpaths.test.ts"
  }
]`;

/**
 * Authored lifecycle decisions for every public facade allocation operation.
 * The exact runtime census is proved against this list: adding a `create*` or
 * namespace `.create` without declaring its ownership law fails closed.
 */
export const FACADE_LIFECYCLE_CONTRACT_SOURCE = `[
  {"operation":"RuntimeCoordinator.create","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/reactive/runtime-coordinator.test.ts","rationale":"Bounded in-memory stores own no timer, subscription, process, or external handle."},
  {"operation":"StateCellStore.create","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/reactive/state-cell.test.ts","rationale":"The registry is an in-memory authority over a coordinator and starts no background work."},
  {"operation":"createCell","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/reactive/cell.test.ts","rationale":"The cell owns subscriptions and exposes its Lifetime directly through dispose."},
  {"operation":"createDirtyFlags","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/reactive/dirty-flags-runtime.test.ts","rationale":"Dirty flags are bounded synchronous bit storage with no active resource."},
  {"operation":"createLifetime","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/reactive/lifetime.test.ts","rationale":"Lifetime is the aggregate exactly-once finalizer authority."},
  {"operation":"createLiveCell","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/reactive/disposed-write-inert.test.ts","rationale":"The live cell owns its reactive kernel and closes writes and subscribers on disposal."},
  {"operation":"createLiveCellBoundary","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/reactive/disposed-write-inert.test.ts","rationale":"The boundary live cell owns its reactive kernel and crossing stream."},
  {"operation":"createQuantizer","specifier":"liteship/reactive","owner":"@liteship/quantizer","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/quantizer/animated-quantizer.test.ts","rationale":"A live quantizer owns input subscriptions, transition work, and output delivery."},
  {"operation":"createSignal","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/reactive/signal.test.ts","rationale":"A signal owns source listeners and its delivery kernel."},
  {"operation":"createStore","specifier":"liteship/reactive","owner":"@liteship/core/reactive","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/reactive/store.test.ts","rationale":"A store owns subscribers and reducer delivery through one Lifetime."},
  {"operation":"createBlendTree","specifier":"liteship/motion","owner":"@liteship/core/motion","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/motion/blend-tree.test.ts","rationale":"The blend tree owns its change kernel and derived subscriptions."},
  {"operation":"createTimeline","specifier":"liteship/motion","owner":"@liteship/core/motion","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/liteship/facade-lifecycle-contract.test.ts","rationale":"The timeline owns its scheduler and state delivery kernel through direct disposal."},
  {"operation":"createGraphMutationClient","specifier":"liteship/graph","owner":"@liteship/core/graph","classification":"pure-allocation","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/graph/graph-mutation-client.test.ts","rationale":"The client allocates request closures but owns no persistent connection or background work."},
  {"operation":"createGraphQueryRefreshBase","specifier":"liteship/graph","owner":"@liteship/core/graph","classification":"pure-allocation","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/graph/graph-query.test.ts","rationale":"The helper creates immutable refresh metadata and no active resource."},
  {"operation":"Compositor.create","specifier":"liteship/media","owner":"@liteship/core/media","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/media/compositor.test.ts","rationale":"The compositor owns reactive coordination, state delivery, and registered teardown."},
  {"operation":"createCompositorStatePool","specifier":"liteship/media","owner":"@liteship/core/media","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/media/compositor-pool.test.ts","rationale":"The state pool is bounded reusable memory with no active external handle."},
  {"operation":"createFrameBudget","specifier":"liteship/media","owner":"@liteship/core/media","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/core/media/frame-budget-runtime.test.ts","rationale":"The frame budget owns an animation-frame loop and must cancel it directly."},
  {"operation":"createTokenBuffer","specifier":"liteship/media","owner":"@liteship/core/media","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/core/media/token-buffer.test.ts","rationale":"The token buffer is bounded synchronous storage and owns no active resource."},
  {"operation":"LLMAdapter.create","specifier":"liteship/runtime","owner":"@liteship/web","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/web/llm-adapter.test.ts","rationale":"The adapter transforms caller-driven iteration and starts no independent task or connection."},
  {"operation":"SSE.create","specifier":"liteship/runtime","owner":"@liteship/web","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/liteship/facade-lifecycle-contract.test.ts","rationale":"The client owns timers, one EventSource generation, buffers, and two delivery streams."},
  {"operation":"SlotRegistry.create","specifier":"liteship/runtime","owner":"@liteship/web","classification":"gc-owned-mutable","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/web/web-runtime-primitives.test.ts","rationale":"The registry is inert storage; DOM observation is a separate operation returning its own disposer."},
  {"operation":"createAudioProcessor","specifier":"liteship/runtime","owner":"@liteship/web","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/liteship/facade-lifecycle-contract.test.ts","rationale":"The processor owns a worklet node, graph connection, and bridge running state."},
  {"operation":"createHtmlFragment","specifier":"liteship/runtime","owner":"@liteship/web","classification":"pure-allocation","disposal":"none","postDispose":"not-applicable","siblingCleanup":"not-applicable","proof":"tests/unit/web/runtime-security-helpers.test.ts","rationale":"The helper returns an inert document fragment and starts no observer or background work."},
  {"operation":"createLLMSession","specifier":"liteship/astro","owner":"@liteship/astro/runtime","classification":"active-owned","disposal":"dispose-async","postDispose":"inert","siblingCleanup":"aggregate","proof":"tests/unit/astro/astro-runtime.test.ts","rationale":"The session owns pooled render runtime state and queued delivery work."}
]`;

/**
 * Exact executable evidence for facade failure claims that need an operator-visible
 * proof beyond an owner-package filename. The compiler row is intentionally bound
 * through `packages/liteship/src/compiler.ts`, so a deep owner test cannot satisfy
 * the public-facade contract.
 */
export const FACADE_FAILURE_PROOF_CONTRACT: Readonly<Record<string, FacadeFailureProofContract>> = Object.freeze({
  'liteship/compiler': Object.freeze({
    test: 'tests/unit/liteship/facade-failure-contract.test.ts::liteship/compiler failure contract > CSSCompiler.compile omits an unknown state and emits its registered diagnostic',
    importSource: '../../../packages/liteship/src/compiler.js',
    operation: 'CSSCompiler.compile',
    observation: Object.freeze({
      kind: 'diagnostic-and-output-omission',
      code: 'compiler/css/unknown-state-key',
      outputField: 'raw',
    }),
  }),
});

const ROOT_KEYS = [
  'name',
  'kind',
  'role',
  'owner',
  'userStory',
  'lifecycle',
  'failureContract',
  'example',
  'stability',
  'audience',
  'producer',
  'surfaceClass',
  'relatedInvariant',
  'replacement',
  'exampleProof',
] as const;

const SUBPATH_KEYS = [
  'subpath',
  'specifier',
  'owner',
  'role',
  'userStory',
  'dependencyCost',
  'packedProof',
  'lifecycle',
  'failureContract',
  'example',
  'stability',
  'symbol',
  'reason',
  'audience',
  'producer',
  'surfaceClass',
  'relatedInvariant',
  'replacement',
  'exampleProof',
] as const;

const LIFECYCLE_KEYS = [
  'operation',
  'specifier',
  'owner',
  'classification',
  'disposal',
  'postDispose',
  'siblingCleanup',
  'proof',
  'rationale',
] as const;

function exactStringRecord(value: unknown, keys: readonly string[]): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\u0000') === [...keys].sort().join('\u0000') &&
    keys.every((key) => {
      const field = (value as Record<string, unknown>)[key];
      return typeof field === 'string' && field.trim().length > 0;
    })
  );
}

function invalidContract(detail: string): never {
  throw ValidationError('liteship.facade-contract', detail);
}

function parseContractJson(source: string): unknown {
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    return invalidContract(`contract source is not valid JSON: ${String(error)}`);
  }
}

/** @internal Parse and freeze the authored root contract. Exported only for direct proof. */
export function parseRootExportContract(source: string): readonly RootExportContract[] {
  const value = parseContractJson(source);
  if (!Array.isArray(value) || value.length === 0)
    return invalidContract('root export contract must be a non-empty array');
  const seen = new Set<string>();
  return Object.freeze(
    value.map((entry): RootExportContract => {
      if (!exactStringRecord(entry, ROOT_KEYS)) return invalidContract('root export contract entry is malformed');
      const candidate = entry as Record<(typeof ROOT_KEYS)[number], string>;
      if (candidate.kind !== 'value' && candidate.kind !== 'type')
        return invalidContract('root export kind is invalid');
      if (candidate.role !== 'authoring' && candidate.role !== 'inspection')
        return invalidContract('root export role is invalid');
      if (candidate.stability !== 'stable' && candidate.stability !== 'experimental') {
        return invalidContract('root export stability is invalid');
      }
      if (!['application-author', 'package-author', 'host-integrator', 'operator'].includes(candidate.audience)) {
        return invalidContract('root export audience is invalid');
      }
      if (candidate.surfaceClass !== 'paved-road') return invalidContract('root export must be a paved-road surface');
      if (!candidate.relatedInvariant.startsWith('INV-')) return invalidContract('root export invariant is invalid');
      if (!/^tests\/[A-Za-z0-9_./-]+\.test\.ts$/.test(candidate.exampleProof)) {
        return invalidContract('root export example proof path is invalid');
      }
      const identity = `${candidate.kind}:${candidate.name}`;
      if (seen.has(identity)) return invalidContract(`duplicate root export contract: ${identity}`);
      seen.add(identity);
      return Object.freeze(candidate as unknown as RootExportContract);
    }),
  );
}

/** @internal Parse and freeze the authored subpath contract. Exported only for direct proof. */
export function parseFacadeSubpathContract(source: string): readonly FacadeSubpathContract[] {
  const value = parseContractJson(source);
  if (!Array.isArray(value) || value.length === 0) return invalidContract('facade subpath contract must be non-empty');
  const seen = new Set<string>();
  return Object.freeze(
    value.map((entry): FacadeSubpathContract => {
      if (!exactStringRecord(entry, SUBPATH_KEYS)) return invalidContract('facade subpath contract entry is malformed');
      const candidate = entry as Record<(typeof SUBPATH_KEYS)[number], string>;
      if (
        !/^\.\/[a-z0-9][a-z0-9-]*$/.test(candidate.subpath) ||
        candidate.specifier !== `liteship/${candidate.subpath.slice(2)}`
      ) {
        return invalidContract('facade subpath identity is invalid');
      }
      if (!/^@liteship\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)?$/.test(candidate.owner)) {
        return invalidContract('facade subpath owner is invalid');
      }
      if (candidate.stability !== 'stable' && candidate.stability !== 'experimental') {
        return invalidContract('facade subpath stability is invalid');
      }
      if (!['application-author', 'package-author', 'host-integrator', 'operator'].includes(candidate.audience)) {
        return invalidContract('facade subpath audience is invalid');
      }
      if (candidate.surfaceClass !== 'advanced-module') {
        return invalidContract('facade subpath must be an advanced-module surface');
      }
      if (!candidate.relatedInvariant.startsWith('INV-')) {
        return invalidContract('facade subpath invariant is invalid');
      }
      if (!/^@liteship\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)?$/.test(candidate.producer)) {
        return invalidContract('facade subpath producer is invalid');
      }
      if (!/^tests\/[A-Za-z0-9_./-]+\.test\.ts$/.test(candidate.exampleProof)) {
        return invalidContract('facade subpath example proof path is invalid');
      }
      if (seen.has(candidate.subpath)) return invalidContract(`duplicate facade subpath: ${candidate.subpath}`);
      seen.add(candidate.subpath);
      return Object.freeze(candidate as unknown as FacadeSubpathContract);
    }),
  );
}

/** @internal Parse and freeze the exact public allocation lifecycle contract. */
export function parseFacadeLifecycleContract(source: string): readonly FacadeLifecycleOperationContract[] {
  const value = parseContractJson(source);
  if (!Array.isArray(value) || value.length === 0)
    return invalidContract('facade lifecycle contract must be non-empty');
  const seen = new Set<string>();
  return Object.freeze(
    value.map((entry): FacadeLifecycleOperationContract => {
      if (!exactStringRecord(entry, LIFECYCLE_KEYS)) return invalidContract('facade lifecycle entry is malformed');
      const candidate = entry as Record<(typeof LIFECYCLE_KEYS)[number], string>;
      if (!/^(?:create[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z0-9]*\.create)$/.test(candidate.operation)) {
        return invalidContract('facade lifecycle operation is invalid');
      }
      if (!/^liteship\/[a-z0-9][a-z0-9-]*$/.test(candidate.specifier)) {
        return invalidContract('facade lifecycle specifier is invalid');
      }
      if (!/^@liteship\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)?$/.test(candidate.owner)) {
        return invalidContract('facade lifecycle owner is invalid');
      }
      if (!['active-owned', 'gc-owned-mutable', 'pure-allocation'].includes(candidate.classification)) {
        return invalidContract('facade lifecycle classification is invalid');
      }
      if (!['dispose-async', 'none'].includes(candidate.disposal)) {
        return invalidContract('facade lifecycle disposal is invalid');
      }
      if (!['inert', 'not-applicable'].includes(candidate.postDispose)) {
        return invalidContract('facade lifecycle post-dispose contract is invalid');
      }
      if (!['aggregate', 'not-applicable'].includes(candidate.siblingCleanup)) {
        return invalidContract('facade lifecycle sibling-cleanup contract is invalid');
      }
      const active = candidate.classification === 'active-owned';
      if (
        (active &&
          (candidate.disposal === 'none' ||
            candidate.postDispose !== 'inert' ||
            candidate.siblingCleanup !== 'aggregate')) ||
        (!active &&
          (candidate.disposal !== 'none' ||
            candidate.postDispose !== 'not-applicable' ||
            candidate.siblingCleanup !== 'not-applicable'))
      ) {
        return invalidContract('facade lifecycle guarantees contradict the operation classification');
      }
      if (!/^tests\/[A-Za-z0-9_./-]+\.test\.ts$/.test(candidate.proof)) {
        return invalidContract('facade lifecycle proof path is invalid');
      }
      if (seen.has(candidate.operation))
        return invalidContract(`duplicate facade lifecycle operation: ${candidate.operation}`);
      seen.add(candidate.operation);
      return Object.freeze(candidate as unknown as FacadeLifecycleOperationContract);
    }),
  );
}

export const ROOT_EXPORT_CONTRACT = parseRootExportContract(ROOT_EXPORT_CONTRACT_SOURCE);
export const FACADE_SUBPATH_CONTRACT = parseFacadeSubpathContract(FACADE_SUBPATH_CONTRACT_SOURCE);
export const FACADE_LIFECYCLE_CONTRACT = parseFacadeLifecycleContract(FACADE_LIFECYCLE_CONTRACT_SOURCE);

/** Exact root allowlists derived from the role-bearing contract. */
export const ROOT_VALUE_BUDGET = Object.freeze(
  ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'value').map((entry) => entry.name),
);
export const ROOT_TYPE_BUDGET = Object.freeze(
  ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'type').map((entry) => entry.name),
);

export const ROOT_VALUE_BUDGET_MAX = 30;
export const ROOT_TYPE_BUDGET_MAX = 30;

export type RootValueBudgetSymbol = (typeof ROOT_VALUE_BUDGET)[number];
export type RootTypeBudgetSymbol = (typeof ROOT_TYPE_BUDGET)[number];
