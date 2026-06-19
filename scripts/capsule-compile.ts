#!/usr/bin/env tsx
/**
 * capsule-compile — walks every capsule call site (direct `defineCapsule(...)`
 * or factory wrappers like `defineAsset(...)`, `BeatMarkerProjection(id)`,
 * `OnsetProjection(id)`, `WaveformProjection(id, opts)`) under
 * `packages/**\/src/**` and `examples/**`, dispatches each to its arm-specific
 * harness generator, writes generated test + bench files under
 * `tests/generated/`, and emits `reports/capsule-manifest.json` listing every
 * capsule found.
 *
 * Capsule detection is type-directed (see `./lib/capsule-detector.ts`): a
 * `ts.Program` + `getTypeChecker()` resolves every CallExpression's return
 * type and matches anything that extends `CapsuleContract<K, ...>` /
 * `CapsuleDef<K, ...>`. Replaces the syntax-only ts.createSourceFile walker
 * that was blind to factory wrappers.
 *
 * This script is the factory compiler — the `capsule:compile` gauntlet phase.
 *
 * @module
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { WallClockTimestamp } from '@czap/core';
import { getCapsuleManifestPath } from '../packages/cli/src/receipts.js';
import { normalizeRepoPath } from '@czap/audit'; // CUT B5b — one slash-normalize home
import { getCapsuleGeneratedDir } from './lib/capsule-paths.js';
import * as fc from 'fast-check';
import {
  schemaToArbitrary,
  UnsupportedSchemaError,
} from '../packages/core/src/harness/arbitrary-from-schema.js';

/**
 * Atomic write via tmp file + rename. Concurrent gauntlet test workers
 * each spawn `pnpm run capsule:compile`; tmp+rename means readers never
 * observe a partial view and writers can't trip Windows EBUSY/EACCES on
 * the shared destination.
 *
 * We deliberately re-write even when content is unchanged. capsule:verify
 * uses `sourceAge > testAge` as its staleness signal, so the test file
 * mtime must advance on every compile. A skip-if-unchanged optimization
 * (an earlier version of this helper) caused stale-flagged failures
 * inside flex:verify's nested pnpm test chain because the OUTER gauntlet
 * capsule:compile wrote at minute 0, the INNER one at minute 21+ skipped,
 * and any source mtime in between would falsely trip the staleness check.
 */
function atomicWrite(targetPath: string, content: string): void {
  // pid + hrtime keeps tmp paths unique across concurrent processes AND across
  // multiple writes from the same process within a single millisecond.
  const tmpPath = `${targetPath}.${process.pid}-${process.hrtime.bigint()}.tmp`;
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, targetPath);
}
import fastGlob from 'fast-glob';
import {
  generatePureTransform,
  generateReceiptedMutation,
  generateStateMachine,
  generateSiteAdapter,
  generatePolicyGate,
  generateCachedProjection,
  generateSceneComposition,
  type HarnessOutput,
  type HarnessContext,
} from '../packages/core/src/harness/index.js';
import type { CapsuleDef } from '../packages/core/src/assembly.js';
import type { AssemblyKind } from '../packages/core/src/capsule.js';
import type { ContentAddress } from '../packages/core/src/brands.js';
import { detectCapsuleCalls } from './lib/capsule-detector.js';

/** A single entry in the capsule manifest. */
interface ManifestEntry {
  readonly name: string;
  readonly kind: string;
  readonly source: string;
  readonly generated: { testFile: string; benchFile: string };
  /**
   * `true` when the harness has a real binding to probe (the generated test
   * exercises the capsule); `false` when it fell back to `it.skip` because the
   * binding isn't wired yet. The plumb gate reads this so a skip-only capsule
   * cannot silently ship green — it must be wired or registered.
   */
  readonly wired: boolean;
  /** Set when the call site uses a factory wrapper instead of `defineCapsule` directly. */
  readonly factory?: string;
  /** Literal arguments captured at the factory call site. */
  readonly args?: readonly unknown[];
  /**
   * receiptedMutation only: the declared `effect-outcome` exemption reason. Set
   * when a receipted mutation declared the TYPED escape hatch
   * `receiptKind: 'effect-outcome'` (its receipt is the outcome of an effect
   * with no pure core to drive idempotently). Recording it here makes the
   * waiver a tracked, machine-readable manifest fact — visible to any audit
   * surface — not just a comment in the generated test file. Absent for
   * capsules with a pure `mutate` core (their real checks are the proof).
   */
  readonly effectOutcomeExemption?: string;
}

/** The shape written to reports/capsule-manifest.json. */
interface CapsuleManifest {
  readonly generatedAt: WallClockTimestamp;
  readonly capsules: readonly ManifestEntry[];
}

/**
 * Build a stub `CapsuleDef` sufficient for harness generator dispatch.
 * Generators only use `name`, `_kind`, and `invariants` from the def — all
 * other fields are safe to stub with structural defaults.
 */
function buildStubDef(
  kind: AssemblyKind,
  name: string,
): CapsuleDef<AssemblyKind, unknown, unknown, unknown> {
  return {
    _kind: kind,
    name,
    id: `fnv1a:00000000` as ContentAddress,
    input: null as unknown,
    output: null as unknown,
    invariants: [],
    budgets: {},
    capabilities: { reads: [], writes: [] },
    site: ['node'],
  } as unknown as CapsuleDef<AssemblyKind, unknown, unknown, unknown>;
}

/**
 * Result of the compile-time binding probe — whether the harness can emit
 * a FINAL real test (no `it.skip` placeholder) for this capsule.
 */
interface BindingProbe {
  /** `schemaToArbitrary(cap.input)` resolves a usable arbitrary. */
  readonly arbitraryDerivable: boolean;
  /** The kind-specific handler(s) the harness drives are present. */
  readonly handlersPresent: boolean;
  /**
   * Set when the schema IS derivable and handlers ARE present, yet the
   * generic property test still can't run — the handler rejects
   * structurally-conformant input because its true domain is narrower than
   * its input schema declares (e.g. a CBOR decoder typed `instanceOf(
   * Uint8Array)` whose `run` throws on non-canonical bytes). Carries the
   * honest reason for the resulting skip.
   */
  readonly preconditionMismatch?: string;
  /**
   * receiptedMutation only: both `cap.input` AND `cap.output` resolve a
   * fast-check arbitrary, so the contract round-trip test can be emitted real.
   */
  readonly contractRoundTrippable?: boolean;
  /** receiptedMutation only: the capsule exposes a typed `mutate` handler. */
  readonly mutatePresent?: boolean;
  /** receiptedMutation only: the capsule declares a non-empty `faults` table. */
  readonly faultsDeclared?: boolean;
  /**
   * receiptedMutation only: the capsule declared the TYPED escape hatch
   * `receiptKind: 'effect-outcome'` with a `reason`. Carries the reason so the
   * harness records a documented, machine-readable exemption (not a skip).
   */
  readonly effectOutcomeReason?: string;
}

/**
 * Import the REAL capsule binding at compile time and probe it: does its
 * input schema yield a fast-check arbitrary, and are the kind-specific
 * handlers present? When both hold, the harness template emits a real
 * `it(...)` block instead of an `it.skip` placeholder — closing the
 * built-not-plumbed gap at the source rather than shipping a green skip.
 *
 * Probing is best-effort: a non-derivable schema (`UnsupportedSchemaError`)
 * or a missing handler simply leaves the template on its self-reporting
 * runtime branch. Any OTHER failure (import error, walker defect) is
 * re-thrown — silently degrading to a skip would launder a real break.
 *
 * Only `pureTransform` and `stateMachine` are probed today: those are the
 * arms whose generated tests turn on (arbitrary ✕ handler) and that have
 * wired bindings. Other arms return `undefined` (no probe).
 */
async function probeBinding(
  kind: AssemblyKind,
  sourceFile: string,
  bindingName: string,
): Promise<BindingProbe | undefined> {
  if (kind !== 'pureTransform' && kind !== 'stateMachine' && kind !== 'receiptedMutation') {
    return undefined;
  }
  const moduleUrl = pathToFileURL(resolve(sourceFile)).href;
  const mod = (await import(moduleUrl)) as Record<string, unknown>;
  const cap = mod[bindingName] as
    | {
        input?: { ast?: unknown };
        output?: { ast?: unknown };
        run?: ((input: unknown) => unknown) | undefined;
        step?: ((state: unknown, event: unknown) => unknown) | undefined;
        initialState?: unknown;
        mutate?: ((input: unknown) => unknown) | undefined;
        faults?: readonly unknown[] | undefined;
        receiptKind?: unknown;
        reason?: unknown;
      }
    | undefined;
  if (cap === undefined || cap.input === undefined) return undefined;

  // receiptedMutation: probe (input AND output) arbitrary-derivability for the
  // contract round-trip, plus `mutate` / `faults` presence for the invocation
  // and fault-injection checks. The harness emits ONLY the checks these flags
  // unlock — every other check is non-emitted with a written reason, never a
  // green it.skip.
  if (kind === 'receiptedMutation') {
    const derivable = (schema: { ast?: unknown } | undefined): boolean => {
      if (schema === undefined) return false;
      try {
        schemaToArbitrary(schema as never);
        return true;
      } catch (err) {
        if (!(err instanceof UnsupportedSchemaError)) throw err;
        return false;
      }
    };
    const contractRoundTrippable = derivable(cap.input) && derivable(cap.output);
    const mutatePresent = typeof cap.mutate === 'function';
    const faultsDeclared = Array.isArray(cap.faults) && cap.faults.length > 0;
    // The TYPED escape hatch: surface the declared `effect-outcome` reason so
    // the harness records a documented exemption (a waiver with teeth) rather
    // than the generic non-emission prose. defineCapsule already enforced that
    // a non-empty reason accompanies the exemption.
    const effectOutcomeReason =
      cap.receiptKind === 'effect-outcome' && typeof cap.reason === 'string'
        ? cap.reason
        : undefined;
    return {
      arbitraryDerivable: contractRoundTrippable,
      handlersPresent: mutatePresent,
      contractRoundTrippable,
      mutatePresent,
      faultsDeclared,
      ...(effectOutcomeReason !== undefined ? { effectOutcomeReason } : {}),
    };
  }

  let arb: fc.Arbitrary<unknown> | undefined;
  try {
    arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    if (!(err instanceof UnsupportedSchemaError)) throw err;
    arb = undefined;
  }
  const arbitraryDerivable = arb !== undefined;

  const handlersPresent =
    kind === 'pureTransform'
      ? typeof cap.run === 'function'
      : typeof cap.step === 'function' && cap.initialState !== undefined;

  // Semantic-precondition guard: a structurally-conformant arbitrary can
  // still violate a capsule's UNMODELLED precondition — e.g. a CBOR decoder
  // whose input schema is `Schema.instanceOf(Uint8Array)` (any bytes) but
  // whose `run` rejects bytes that aren't canonical CBOR. The schema is
  // derivable, yet the round-trip invariant cannot be exercised by random
  // bytes, and a generated `run(sample)` would throw a FALSE failure. We
  // sample the arbitrary and run the handler over a few cases at compile
  // time: if the handler throws on conformant input, we DON'T emit a real
  // test (the template stays on its honest self-reporting branch) — the
  // input schema under-specifies the handler's true domain.
  let preconditionMismatch: string | undefined;
  if (arb !== undefined && handlersPresent && kind === 'pureTransform' && typeof cap.run === 'function') {
    const run = cap.run;
    try {
      // Fixed seed → the probe samples (and therefore the realOnly /
      // mismatch verdict and the generated file) are reproducible across
      // compiles, not dependent on fast-check's default random seed.
      for (const sample of fc.sample(arb, { numRuns: 24, seed: 0x5eed })) run(sample);
    } catch (err) {
      // The error class is stable across samples; the per-sample message
      // (byte offset, reason variant) is not — emit only the class name so
      // the generated file stays byte-deterministic across compiles.
      const errClass = err instanceof Error ? err.constructor.name : 'Error';
      preconditionMismatch =
        `handler rejects schema-conformant input — the input schema ` +
        `under-specifies the handler's domain (throws ${errClass})`;
    }
  }

  return preconditionMismatch !== undefined
    ? { arbitraryDerivable, handlersPresent, preconditionMismatch }
    : { arbitraryDerivable, handlersPresent };
}

/**
 * Factory wrappers that produce a `cachedProjection` whose `derive(bytes)`
 * decodes the named source asset's RAW BYTES (BeatMarkerProjection decodes the
 * WAV then autocorrelates; WavMetadataProjection walks LIST/INFO tags). For
 * these, the canonical decode fixture is the SOURCE asset's byte file — named
 * by the asset id passed as the factory's first argument
 * (`BeatMarkerProjection('intro-bed')`), resolved against the asset decl's
 * `source` path.
 *
 * Source of truth: each listed factory wires `input: AssetBytes` +
 * `derive: (bytes) => ...` over the named asset (see
 * `packages/assets/src/analysis/*.ts`). Keep this in sync with those factories
 * — the same discipline `FACTORY_NAMING` already follows. A factory NOT listed
 * here stays on the harness's honest self-reporting branch (no fixture wired).
 */
const ASSET_BYTE_PROJECTION_FACTORIES = new Set<string>([
  'BeatMarkerProjection',
  'WavMetadataProjection',
]);

/** Dispatch to the correct harness generator based on assembly kind. */
function dispatchHarness(
  kind: AssemblyKind,
  cap: CapsuleDef<AssemblyKind, unknown, unknown, unknown>,
  ctx?: HarnessContext,
): HarnessOutput {
  switch (kind) {
    case 'pureTransform':
      return generatePureTransform(
        cap as CapsuleDef<'pureTransform', unknown, unknown, unknown>,
        ctx,
      );
    case 'receiptedMutation':
      return generateReceiptedMutation(
        cap as CapsuleDef<'receiptedMutation', unknown, unknown, unknown>,
        ctx,
      );
    case 'stateMachine':
      return generateStateMachine(
        cap as CapsuleDef<'stateMachine', unknown, unknown, unknown>,
        ctx,
      );
    case 'siteAdapter':
      return generateSiteAdapter(
        cap as CapsuleDef<'siteAdapter', unknown, unknown, unknown>,
      );
    case 'policyGate':
      return generatePolicyGate(
        cap as CapsuleDef<'policyGate', unknown, unknown, unknown>,
      );
    case 'cachedProjection':
      return generateCachedProjection(
        cap as CapsuleDef<'cachedProjection', unknown, unknown, unknown>,
        ctx,
      );
    case 'sceneComposition':
      return generateSceneComposition(
        cap as CapsuleDef<'sceneComposition', unknown, unknown, unknown>,
      );
    default: {
      const exhaustive: never = kind;
      throw new Error(`[capsule-compile] Unknown assembly kind: ${String(exhaustive)}`);
    }
  }
}

/** Checks whether a string is a valid AssemblyKind. */
const VALID_KINDS = new Set<string>([
  'pureTransform',
  'receiptedMutation',
  'stateMachine',
  'siteAdapter',
  'policyGate',
  'cachedProjection',
  'sceneComposition',
]);

function isAssemblyKind(k: string): k is AssemblyKind {
  return VALID_KINDS.has(k);
}

/**
 * Naming-convention map for known capsule factories. Source of truth lives
 * in the factory's `defineCapsule({ name: ... })` template literal — we
 * mirror it here so the manifest's surface name matches what the runtime
 * registers. Keep this in sync with the factories in
 * `packages/assets/src/analysis/*.ts`.
 */
const FACTORY_NAMING: Readonly<Record<string, (args: readonly unknown[]) => string | undefined>> = {
  BeatMarkerProjection: (args) => (typeof args[0] === 'string' ? `${args[0]}:beats` : undefined),
  OnsetProjection: (args) => (typeof args[0] === 'string' ? `${args[0]}:onsets` : undefined),
  WaveformProjection: (args) =>
    typeof args[0] === 'string' && typeof args[1] === 'number'
      ? `${args[0]}:waveform:${args[1]}`
      : undefined,
  WavMetadataProjection: (args) =>
    typeof args[0] === 'string' ? `${args[0]}:wav-metadata` : undefined,
};

/** Resolve the capsule's runtime-registered name from a detected call site. */
function resolveCapsuleName(
  detectedName: string,
  factory: string | undefined,
  args: readonly unknown[] | undefined,
): string {
  if (factory && args && FACTORY_NAMING[factory]) {
    const resolved = FACTORY_NAMING[factory](args);
    if (resolved !== undefined) return resolved;
  }
  return detectedName;
}

async function main(): Promise<void> {
  const cwd = resolve(process.cwd());
  // Generated test/bench output dir — `tests/generated` by default, redirectable
  // via CZAP_CAPSULE_GENERATED_DIR so parallel tests isolate their compile output
  // and never race the shared dir on a renameSync (CUT T1).
  const generatedDir = getCapsuleGeneratedDir(cwd);
  // Manifest-only mode (CZAP_CAPSULE_MANIFEST_ONLY): build + write the manifest
  // but SKIP writing the test/bench files. Tests that only need a fresh manifest
  // pointing at the already-committed tests/generated/ files use this so they
  // don't rewrite that shared dir while the parent vitest run is executing those
  // same files (CUT T1). Production / gauntlet leave it unset → full compile.
  const manifestOnly =
    process.env.CZAP_CAPSULE_MANIFEST_ONLY === '1' || process.env.CZAP_CAPSULE_MANIFEST_ONLY === 'true';
  const allFiles = await fastGlob(
    ['packages/**/src/**/*.ts', 'examples/**/*.ts'],
    {
      ignore: ['**/*.d.ts', '**/node_modules/**', '**/dist/**'],
      absolute: true,
      cwd,
    },
  );

  // Pre-filter to files that mention `defineCapsule` or a known capsule
  // factory. The detector's ts.createProgram pulls in transitive
  // dependencies anyway, so we don't need to feed it every source file.
  // Derives the factory list from FACTORY_NAMING + the two base factories
  // so a new naming rule auto-extends the hint list.
  // Assumption: every capsule call site includes one of these bare tokens
  // in its source text. Holds for all current invocation patterns
  // (defineCapsule({...}), defineAsset(id, {...}), Factory(args)).
  const FACTORY_HINTS = ['defineCapsule', 'defineAsset', ...Object.keys(FACTORY_NAMING)];
  const files = allFiles.filter((f) => {
    try {
      const src = readFileSync(f, 'utf8');
      return FACTORY_HINTS.some((h) => src.includes(h));
    } catch {
      return false;
    }
  });

  // Single program creation across all candidate files — the type
  // checker resolves CapsuleContract / CapsuleDef return types
  // through factory wrappers (defineAsset, BeatMarkerProjection, ...).
  const detected = detectCapsuleCalls(files);

  // Resolve runtime names (factory-aware) and dedupe by (kind, resolvedName).
  // Skip the inner `defineCapsule` call sites inside factory bodies where the
  // detector can't extract a name — those are not concrete instances, just
  // factory definitions. The outer factory call IS the instance.
  type ResolvedHit = (typeof detected)[number] & { resolvedName: string };
  const byKey = new Map<string, ResolvedHit>();
  for (const d of detected) {
    const resolvedName = resolveCapsuleName(d.name, d.factory, d.args);
    const key = `${d.kind}::${resolvedName}`;
    if (!byKey.has(key)) byKey.set(key, { ...d, resolvedName });
  }

  // Static asset id -> byte source map, built from the detected `defineAsset`
  // declarations (their `name` IS the asset id, `declSource` the byte path).
  // Used to resolve the canonical decode fixture for projection factories that
  // name their source asset by id (BeatMarkerProjection('intro-bed')) — fully
  // static, no runtime module import (the example scene modules import the
  // unlinked `@czap/assets` bare specifier and aren't importable from here).
  const assetSourceById = new Map<string, string>();
  for (const d of byKey.values()) {
    if (d.factory === 'defineAsset' && d.declSource !== undefined) {
      assetSourceById.set(d.name, d.declSource);
    }
  }

  const capsules: ManifestEntry[] = [];

  for (const d of byKey.values()) {
    if (!isAssemblyKind(d.kind)) {
      console.warn(
        `[capsule-compile] ${d.file}: unknown kind "${d.kind}" for capsule "${d.resolvedName}" — skipped`,
      );
      continue;
    }

    const stub = buildStubDef(d.kind, d.resolvedName);

    const slug = d.resolvedName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const testPath = resolve(generatedDir, `${slug}.test.ts`);
    const benchPath = resolve(generatedDir, `${slug}.bench.ts`);

    // Build a HarnessContext when we have a binding name AND either the call
    // is direct (`defineCapsule`, no factory wrapper) or it is a `defineAsset`
    // call bound to an EXPORTED const (e.g. `export const introBed =
    // defineAsset({...})` in examples/scenes/assets.ts) — the harness can
    // import that binding and probe the capsule's derive handler.
    const factoryBindable = d.factory === 'defineAsset' && d.exported === true;

    // ADDITIVE cachedProjection branch — independent of the receiptedMutation /
    // pure-transform probe paths above. The analysis projection factories
    // (BeatMarkerProjection, WavMetadataProjection, ...) are EXPORTED bindings
    // (`export const introBedBeats = BeatMarkerProjection('intro-bed')`) that
    // now carry a real `derive(bytes)` handler. They name their source asset by
    // id, not by path, so the canonical decode fixture is resolved from the
    // static asset id -> source map (assetSourceById, built from the detected
    // `defineAsset` decls) rather than from a call-site `source` literal. When
    // the factory is a known byte-projection AND its fixture resolves, the
    // cachedProjection harness emits REAL cache-hit / invalidation / determinism
    // probes over the fixture bytes instead of `it.skip`.
    const cachedProjectionFactory =
      d.kind === 'cachedProjection' &&
      d.factory !== undefined &&
      ASSET_BYTE_PROJECTION_FACTORIES.has(d.factory) &&
      d.exported === true &&
      d.binding !== undefined;
    // Resolve the source asset id (factory's first string arg) to its byte
    // source path via the static defineAsset map built above.
    const cachedProjectionAssetId = cachedProjectionFactory
      ? d.args?.find((v): v is string => typeof v === 'string')
      : undefined;
    const cachedProjectionFixture =
      cachedProjectionAssetId !== undefined
        ? assetSourceById.get(cachedProjectionAssetId)
        : undefined;
    const cachedProjectionBindable =
      cachedProjectionFactory && cachedProjectionFixture !== undefined;

    let harnessCtx: HarnessContext | undefined;
    if (
      d.binding !== undefined &&
      (d.factory === undefined || factoryBindable || cachedProjectionBindable)
    ) {
      const sourceModule = normalizeRepoPath(relative(dirname(testPath), d.file)).replace(/\.ts$/, '.js');
      const arbitraryAbs = resolve(
        'packages/core/src/harness/arbitrary-from-schema.ts',
      );
      const arbitraryModule = normalizeRepoPath(relative(dirname(testPath), arbitraryAbs)).replace(/\.ts$/, '.js');
      // Canonical content-address kernel — the cachedProjection harness keys
      // its cache-hit / invalidation probes on contentAddressOf (never a
      // hand-rolled hash). Resolved as a repo-relative import for the test file.
      const contentAddressAbs = resolve('packages/core/src/content-address.ts');
      const contentAddressModule = normalizeRepoPath(
        relative(dirname(testPath), contentAddressAbs),
      ).replace(/\.ts$/, '.js');
      // Compile-time probe: import the real binding and check whether its
      // input schema is arbitrary-derivable and its handlers are present.
      // When both hold the harness emits a FINAL real test rather than an
      // `it.skip` placeholder (the built-not-plumbed lie).
      const probe = await probeBinding(d.kind, d.file, d.binding);
      // Fixture path: asset decls carry it as a call-site `source` literal
      // (declSource); analysis projection factories name their source asset by
      // id and resolve it from the registry (cachedProjectionFixture). Either
      // way it's a repo-relative byte source the harness decodes.
      const fixturePath =
        d.declSource !== undefined
          ? normalizeRepoPath(d.declSource)
          : cachedProjectionFixture;
      harnessCtx = {
        bindingImport: sourceModule.startsWith('.')
          ? sourceModule
          : `./${sourceModule}`,
        bindingName: d.binding,
        arbitraryImport: arbitraryModule.startsWith('.')
          ? arbitraryModule
          : `./${arbitraryModule}`,
        contentAddressImport: contentAddressModule.startsWith('.')
          ? contentAddressModule
          : `./${contentAddressModule}`,
        // Asset decls name their canonical byte source (repo-relative) —
        // the cachedProjection harness uses it for fixture-based
        // determinism tests and the real decode bench.
        ...(fixturePath !== undefined ? { fixturePath } : {}),
        // Factory-wrapped byte-projection capsule whose `derive` + fixture were
        // statically resolved (ASSET_BYTE_PROJECTION_FACTORIES + the asset
        // source map): the harness emits the FINAL real-only cache/determinism
        // probes — zero `it.skip` literals — over the canonical fixture bytes.
        ...(cachedProjectionBindable ? { cachedProjectionRealOnly: true } : {}),
        ...(probe !== undefined
          ? {
              arbitraryDerivable: probe.arbitraryDerivable,
              handlersPresent: probe.handlersPresent,
              ...(probe.preconditionMismatch !== undefined
                ? { preconditionMismatch: probe.preconditionMismatch }
                : {}),
              ...(probe.contractRoundTrippable !== undefined
                ? { contractRoundTrippable: probe.contractRoundTrippable }
                : {}),
              ...(probe.mutatePresent !== undefined ? { mutatePresent: probe.mutatePresent } : {}),
              ...(probe.faultsDeclared !== undefined
                ? { faultsDeclared: probe.faultsDeclared }
                : {}),
              ...(probe.effectOutcomeReason !== undefined
                ? { effectOutcomeReason: probe.effectOutcomeReason }
                : {}),
            }
          : {}),
      };
    }
    const { testFile, benchFile } = dispatchHarness(d.kind, stub, harnessCtx);

    // Skip the file writes in manifest-only mode; the manifest entry below still
    // records the (committed) testFile/benchFile paths so verify can run them.
    if (!manifestOnly) {
      mkdirSync(dirname(testPath), { recursive: true });
      atomicWrite(testPath, testFile);
      atomicWrite(benchPath, benchFile);
    }

    const sourceRel = normalizeRepoPath(relative(cwd, d.file));
    const testRel = normalizeRepoPath(relative(cwd, testPath));
    const benchRel = normalizeRepoPath(relative(cwd, benchPath));

    const wired = harnessCtx !== undefined;
    // The TYPED escape-hatch waiver, recorded as a tracked manifest fact (not
    // just a generated-test comment): a receiptedMutation that declared
    // `receiptKind: 'effect-outcome'` surfaces its reason here.
    const exemption =
      harnessCtx?.effectOutcomeReason !== undefined
        ? { effectOutcomeExemption: harnessCtx.effectOutcomeReason }
        : {};
    const entry: ManifestEntry =
      d.factory !== undefined
        ? d.args !== undefined && d.args.length > 0
          ? {
              name: d.resolvedName,
              kind: d.kind,
              source: sourceRel,
              generated: { testFile: testRel, benchFile: benchRel },
              wired,
              factory: d.factory,
              args: d.args,
              ...exemption,
            }
          : {
              name: d.resolvedName,
              kind: d.kind,
              source: sourceRel,
              generated: { testFile: testRel, benchFile: benchRel },
              wired,
              factory: d.factory,
              ...exemption,
            }
        : {
            name: d.resolvedName,
            kind: d.kind,
            source: sourceRel,
            generated: { testFile: testRel, benchFile: benchRel },
            wired,
            ...exemption,
          };
    capsules.push(entry);
  }

  // Stable ordering by (kind, name) — keeps the manifest deterministic
  // across runs (program ordering is not guaranteed file-order).
  capsules.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.name.localeCompare(b.name);
  });

  const manifest: CapsuleManifest = {
    generatedAt: new Date().toISOString(),
    capsules,
  };

  // Honor CZAP_CAPSULE_MANIFEST (same resolver the readers use, see
  // packages/cli/src/receipts.ts). Default is reports/capsule-manifest.json, so
  // production behavior is unchanged when the env var is unset; tests point both
  // sides at a temp path to avoid racing the shared default (CUT T1).
  const manifestPath = getCapsuleManifestPath();
  mkdirSync(dirname(manifestPath), { recursive: true });
  // tmp+rename protects this write under concurrent test workers — manifest
  // content always changes (generatedAt is a fresh ISO timestamp per spawn),
  // so direct writeFileSync on the shared destination would race.
  atomicWrite(
    manifestPath,
    JSON.stringify(manifest, null, 2),
  );

  console.log(JSON.stringify({ status: 'ok', capsuleCount: capsules.length }));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
