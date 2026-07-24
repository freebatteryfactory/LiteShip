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
    "stability": "stable"
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
    "stability": "stable"
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
    "stability": "stable"
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
    "stability": "stable"
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
    "stability": "stable"
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
    "stability": "stable"
  },
  {
    "name": "defineAdaptive",
    "kind": "value",
    "role": "authoring",
    "owner": "liteship/authoring",
    "userStory": "Define adaptive behavior, apply its attributes, inspect state, and emit its compiled plan.",
    "lifecycle": "immutable-definition",
    "failureContract": "Lowering rejects invalid definitions and explanation follows the live quantizer contract.",
    "example": "defineAdaptive(spec)",
    "stability": "stable"
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
    "stability": "stable"
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
    "stability": "stable"
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
    "stability": "stable"
  },
  {
    "name": "Boundary",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate a named-state boundary definition.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking preserves the input and state vocabulary.",
    "example": "Boundary<Input, State>",
    "stability": "stable"
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
    "stability": "stable"
  },
  {
    "name": "Token",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate a content-addressed token definition.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking preserves the token value contract.",
    "example": "Token<Value>",
    "stability": "stable"
  },
  {
    "name": "Theme",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate named token variants.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking preserves variant names and token values.",
    "example": "Theme",
    "stability": "stable"
  },
  {
    "name": "Style",
    "kind": "type",
    "role": "authoring",
    "owner": "@liteship/core/authoring",
    "userStory": "Annotate state-aware style declarations.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking binds style states to the boundary vocabulary.",
    "example": "Style<State>",
    "stability": "stable"
  },
  {
    "name": "Adaptive",
    "kind": "type",
    "role": "authoring",
    "owner": "liteship/authoring",
    "userStory": "Annotate the flagship define, apply, and inspect aggregate.",
    "lifecycle": "compile-time-only",
    "failureContract": "Type checking keeps attrs, explanation, and plan outputs coherent.",
    "example": "Adaptive<State>",
    "stability": "stable"
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
    "stability": "stable"
  }
]`;

/** Authored expert-subpath decisions. No subpath reimplements its owner. */
export const FACADE_SUBPATH_CONTRACT_SOURCE = `[
  {"subpath":"./schema","specifier":"liteship/schema","owner":"@liteship/core/schema","role":"schema","userStory":"Define, decode, and project transport-agnostic schemas.","dependencyCost":"pure core schema kernel","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"immutable definitions and pure decoders","failureContract":"Malformed data returns structured decode issues.","example":"schema.struct(fields)","stability":"stable","symbol":"schema","reason":"Schema authoring is a coherent expert domain beyond the first adaptive feature."},
  {"subpath":"./reactive","specifier":"liteship/reactive","owner":"@liteship/core/reactive","role":"reactive-runtime","userStory":"Allocate and dispose cells, signals, stores, lifetimes, and live quantizers.","dependencyCost":"stateful core and quantizer runtime","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"owned resources require disposal","failureContract":"Disposed resources stop work and invalid state transitions fail loudly.","example":"createCell(initial)","stability":"stable","symbol":"createCell","reason":"Runtime allocation is intentionally distinct from immutable root authoring."},
  {"subpath":"./motion","specifier":"liteship/motion","owner":"@liteship/core/motion","role":"motion","userStory":"Define and execute transitions, timelines, easing, reveal, and stagger behavior.","dependencyCost":"motion kernels","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"timeline resources require disposal","failureContract":"Unsupported or invalid motion intent is refused before execution.","example":"createTimeline(boundary, options)","stability":"stable","symbol":"createTimeline","reason":"Motion is an expert capability with its own lifecycle and vocabulary."},
  {"subpath":"./graph","specifier":"liteship/graph","owner":"@liteship/core/graph","role":"document-graph","userStory":"Seal, validate, patch, query, and replay the document graph.","dependencyCost":"graph and evidence kernels","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"immutable sealed graphs plus explicit clients","failureContract":"Invalid nodes, patches, or receipts are rejected before application.","example":"DAG.create(input)","stability":"stable","symbol":"DAG","reason":"Graph mutation is an advanced engine workflow, not first-hour authoring."},
  {"subpath":"./media","specifier":"liteship/media","owner":"@liteship/core/media","role":"media-runtime","userStory":"Resolve responsive media and run compositor, audio, video, and frame-budget paths.","dependencyCost":"media and compositor runtime","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"owned buffers and renderers require disposal","failureContract":"Invalid media inputs and exhausted budgets are surfaced explicitly.","example":"Compositor.create(options)","stability":"stable","symbol":"Compositor","reason":"Media processing has runtime and performance costs unsuitable for root."},
  {"subpath":"./evidence","specifier":"liteship/evidence","owner":"@liteship/core/evidence","role":"evidence-and-quality","userStory":"Inspect receipts, diagnostics, quality tiers, capabilities, and addressed evidence.","dependencyCost":"pure evidence kernels","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"pure readers and immutable receipts","failureContract":"Invalid chains, addresses, and capability decisions are refused with structured evidence.","example":"inspectReceipt(receipt)","stability":"stable","symbol":"inspectReceipt","reason":"Receipts and tier policy are expert inspection surfaces."},
  {"subpath":"./compiler","specifier":"liteship/compiler","owner":"@liteship/compiler","role":"projection-compiler","userStory":"Compile definitions into CSS, shader, accessibility, AI, and motion targets.","dependencyCost":"compiler kernels","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"pure compilation","failureContract":"Unsupported definitions produce structured compiler errors.","example":"CSSCompiler.compile(input)","stability":"stable","symbol":"CSSCompiler","reason":"Projection targets are advanced escape hatches behind the default Adaptive plan."},
  {"subpath":"./runtime","specifier":"liteship/runtime","owner":"@liteship/web","role":"browser-runtime","userStory":"Apply streaming, morphing, recovery, integrity, and browser runtime behavior.","dependencyCost":"browser DOM runtime","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"connections and observers require disposal","failureContract":"Unsafe URLs, invalid patches, and broken resumptions fail closed.","example":"Morph.apply(input)","stability":"stable","symbol":"Morph","reason":"Browser runtime code must never load through the host-free root."},
  {"subpath":"./astro","specifier":"liteship/astro","owner":"@liteship/astro","role":"astro-host","userStory":"Install LiteShip into Astro and apply Adaptive attributes and server projections.","dependencyCost":"optional Astro peer and host adapter","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"host integration lifecycle","failureContract":"Invalid host configuration fails during integration setup or build.","example":"integration(options)","stability":"stable","symbol":"adaptiveAttrs","reason":"Astro ownership and peer cost require an explicit host subpath."},
  {"subpath":"./vite","specifier":"liteship/vite","owner":"@liteship/vite","role":"vite-host","userStory":"Install LiteShip into Vite and compile directive and virtual-module projections.","dependencyCost":"optional Vite peer and host plugin","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"host plugin lifecycle","failureContract":"Invalid directives and configuration produce stable build diagnostics.","example":"plugin(options)","stability":"stable","symbol":"plugin","reason":"Vite ownership and peer cost require an explicit host subpath."},
  {"subpath":"./testing","specifier":"liteship/testing","owner":"@liteship/core/testing","role":"test-tooling","userStory":"Generate proof harnesses, reset test registries, and inspect the installed fleet roster.","dependencyCost":"test-only harness code","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"test process only","failureContract":"Invalid harness declarations and stale fleet projections fail deterministically.","example":"generatePureTransform(spec)","stability":"stable","symbol":"resetCapsuleCatalog","reason":"Test-only operations and fleet metadata must not appear on production root."},
  {"subpath":"./migrate","specifier":"liteship/migrate","owner":"@liteship/compiler/migrate","role":"migration","userStory":"Translate supported external syntax into ordinary LiteShip definitions.","dependencyCost":"compiler parser adapters","packedProof":"check/hermetic:runtime-import+node16+bundler","lifecycle":"pure migration","failureContract":"Unrepresentable source is refused with stable diagnostics and no fabricated definition.","example":"fromMediaQueries(css)","stability":"stable","symbol":"fromMediaQueries","reason":"Migration grammar is an explicit expert boundary, not framework ontology."},
  {"subpath":"./genui","specifier":"liteship/genui","owner":"@liteship/genui","role":"generated-ui","userStory":"Define a trusted component catalog, validate generated UI, and render it without raw package discovery.","dependencyCost":"pure generated-UI catalog and renderer","packedProof":"check/journey:one-install-runtime-reference-identity","lifecycle":"immutable catalog and pure validation/rendering","failureContract":"Unknown components, props, or invalid generated trees are refused before rendering.","example":"defineComponentCatalog(input)","stability":"stable","symbol":"defineComponentCatalog","reason":"Generated UI is a documented product capability that deserves a discoverable facade subpath."}
]`;

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
      if (entry.kind !== 'value' && entry.kind !== 'type') return invalidContract('root export kind is invalid');
      if (entry.role !== 'authoring' && entry.role !== 'inspection')
        return invalidContract('root export role is invalid');
      if (entry.stability !== 'stable' && entry.stability !== 'experimental') {
        return invalidContract('root export stability is invalid');
      }
      const identity = `${entry.kind}:${entry.name}`;
      if (seen.has(identity)) return invalidContract(`duplicate root export contract: ${identity}`);
      seen.add(identity);
      return Object.freeze(entry as unknown as RootExportContract);
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
      if (seen.has(candidate.subpath)) return invalidContract(`duplicate facade subpath: ${candidate.subpath}`);
      seen.add(candidate.subpath);
      return Object.freeze(candidate as unknown as FacadeSubpathContract);
    }),
  );
}

export const ROOT_EXPORT_CONTRACT = parseRootExportContract(ROOT_EXPORT_CONTRACT_SOURCE);
export const FACADE_SUBPATH_CONTRACT = parseFacadeSubpathContract(FACADE_SUBPATH_CONTRACT_SOURCE);

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
