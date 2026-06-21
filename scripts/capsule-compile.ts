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
import { hasTag, assertNever } from '@czap/error';
import { schemaToArbitrary } from '../packages/core/src/harness/arbitrary-from-schema.js';

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
  BENCH_NOT_APPLICABLE_RE,
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
  readonly generated: { testFile: string; benchFile: string; integrationFile?: string };
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
  /**
   * siteAdapter only: the `declared-integration` host-capability proof, recorded
   * as a tracked manifest fact (a waiver WITH TEETH — points at real proof, fails
   * RED if that proof's file disappears). The owner's rule is NO MOCKS ON THE HOST
   * PATH, so the host capability is proved by the lanes that already run the REAL
   * runtime, linked here per declared site.
   *
   *  - `sites`        — the adapter's declared host-site set (the matrix domain).
   *  - `coverageRef`  — the PRIMARY real-host suite path, or `null` when EVERY
   *    declared site is an uncovered gap (an honest, visible no-real-host state).
   *  - `coverage`     — every real-host coverage link: which sites it proves, the
   *    suite file, and the `pnpm run` lane that drives it under the real runtime.
   *  - `gaps`         — declared sites with NO real-host lane (tracked, never a
   *    fabricated link) — the gaps the owner must see, not papered over.
   */
  readonly declaredIntegration?: {
    readonly sites: readonly string[];
    readonly coverageRef: string | null;
    readonly coverage: ReadonlyArray<{
      readonly sites: readonly string[];
      readonly coverageRef: string;
      readonly lane: string;
    }>;
    readonly gaps: ReadonlyArray<{ readonly site: string; readonly reason: string }>;
  };
  /**
   * Set when the capsule's generated bench is a TYPED not-applicable EXEMPTION
   * rather than a real measurement: the capsule has NO pure, perf-sensitive hot
   * path to time (its real behavior is an external effect — a process spawn, a
   * DOM morph — or a not-yet-tickable scene). The generated `.bench.ts` carries
   * the matching `// BENCH-NOT-APPLICABLE: <reason>` marker line (see
   * `packages/core/src/harness/bench-marker.ts`); recording the same reason here
   * makes the exemption a tracked, machine-readable manifest fact a gate can
   * cross-check against the marker — a real `bench()` body with NO marker AND no
   * `benchExemption` is a real measurement; a comment-only body with neither is a
   * LAZY PLACEHOLDER the gate must fail on. Absent for capsules whose bench is a
   * real measurement.
   */
  readonly benchExemption?: { readonly reason: string };
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
  /**
   * policyGate only: the capsule exposes a typed `decide` verdict handler. Paired
   * with `arbitraryDerivable` (the subject schema) this unlocks the real allow/deny
   * + reason-chain + determinism traversal; absent it the harness fails loud.
   */
  readonly decidePresent?: boolean;
}

/**
 * Import the REAL capsule binding at compile time and probe it: does its
 * input schema yield a fast-check arbitrary, and are the kind-specific
 * handlers present? When both hold, the harness template emits a real
 * `it(...)` block instead of an `it.skip` placeholder — closing the
 * built-not-plumbed gap at the source rather than shipping a green skip.
 *
 * Probing is best-effort: a non-derivable schema (a tagged `UnsupportedError`)
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
  if (
    kind !== 'pureTransform' &&
    kind !== 'stateMachine' &&
    kind !== 'receiptedMutation' &&
    kind !== 'cachedProjection' &&
    kind !== 'policyGate'
  ) {
    return undefined;
  }
  const moduleUrl = pathToFileURL(resolve(sourceFile)).href;
  let mod: Record<string, unknown>;
  try {
    mod = (await import(moduleUrl)) as Record<string, unknown>;
  } catch (err) {
    // cachedProjection only: its REAL-ONLY fixture form is resolved STATICALLY
    // (the factory + asset-source map, no module import needed), so a module that
    // can't be imported from the compile script (e.g. an example scene module
    // importing the unlinked `@czap/assets` bare specifier) just leaves the
    // arbitrary-derivability probe unresolved — the static cachedProjectionRealOnly
    // flag still drives the corpus. For every other probed kind an import failure
    // is a real defect and must surface, never be laundered into a skip.
    if (kind === 'cachedProjection') return undefined;
    throw err;
  }
  const cap = mod[bindingName] as
    | {
        input?: { ast?: unknown };
        output?: { ast?: unknown };
        run?: ((input: unknown) => unknown) | undefined;
        step?: ((state: unknown, event: unknown) => unknown) | undefined;
        initialState?: unknown;
        mutate?: ((input: unknown) => unknown) | undefined;
        derive?: ((source: unknown) => unknown) | undefined;
        decide?: ((subject: unknown) => unknown) | undefined;
        faults?: readonly unknown[] | undefined;
        receiptKind?: unknown;
        reason?: unknown;
      }
    | undefined;
  if (cap === undefined || cap.input === undefined) return undefined;

  // cachedProjection: probe whether the SOURCE schema (`cap.input`) is
  // arbitrary-derivable and `derive` is present. The harness resolves disposition
  // at compile time (the same pattern pureTransform/stateMachine use): a derivable
  // source + derive yields the real property form; a non-derivable source relies
  // on the canonical byte fixture (the real-only fixture form, gated separately by
  // cachedProjectionRealOnly + fixturePath). A binding with NEITHER fails the
  // compile loud in the harness — never a green skip.
  if (kind === 'cachedProjection') {
    let derivable = false;
    try {
      schemaToArbitrary(cap.input as never);
      derivable = true;
    } catch (err) {
      if (!hasTag(err, 'UnsupportedError')) throw err;
      derivable = false;
    }
    return {
      arbitraryDerivable: derivable,
      handlersPresent: typeof cap.derive === 'function',
    };
  }

  // policyGate: probe whether the SUBJECT schema (`cap.input`) is arbitrary-
  // derivable and `decide` is present. Both unlock the real allow/deny + reason-
  // chain + determinism traversal (the same compile-time disposition pattern
  // pureTransform/cachedProjection use). A binding missing either fails the
  // compile loud in the harness — never a green skip.
  if (kind === 'policyGate') {
    let derivable = false;
    try {
      schemaToArbitrary(cap.input as never);
      derivable = true;
    } catch (err) {
      if (!hasTag(err, 'UnsupportedError')) throw err;
      derivable = false;
    }
    const decidePresent = typeof cap.decide === 'function';
    return {
      arbitraryDerivable: derivable,
      handlersPresent: decidePresent,
      decidePresent,
    };
  }

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
        if (!hasTag(err, 'UnsupportedError')) throw err;
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
    if (!hasTag(err, 'UnsupportedError')) throw err;
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

/**
 * Scene-driver registry for `sceneComposition` capsules — the sceneComposition
 * analogue of {@link ASSET_BYTE_PROJECTION_FACTORIES}. A sceneComposition
 * capsule's binding (e.g. `intro`) is a manifest entry carrying `Schema.Unknown`
 * I/O — it does NOT itself hold the tickable scene. The driveable scene is a
 * sibling `() => CompiledScene` export (`compileScene(contract)`) in the SAME
 * source module. This map names that export per capsule so the harness can
 * import it and drive the REAL ECS runtime.
 *
 * `hasAudio`/`hasVideo` gate the audio↔video sync check. They mirror the
 * scene's declared tracks (source of truth: the `SceneContract.tracks` literal
 * in the capsule's module). The generated sync test self-pins this fact: it
 * asserts `checkedFrames > 0`, so a registry that wrongly claimed `hasAudio`
 * for an audio-less scene fails RED rather than passing vacuously.
 *
 * `p95Ms` mirrors the capsule's declared `budgets.p95Ms` (surfaced into the
 * bench's perf-contract label). A capsule NOT listed here resolves no driver —
 * its checks become typed `not-applicable` exemptions (e.g. `scene.beat-binding`
 * is a pre-runtime beat→spawn transform with no tracks, fps, or frame stream).
 *
 * Keep in sync with the scene modules — same discipline `FACTORY_NAMING`
 * follows. The compile export must live in the capsule's own source file.
 */
interface SceneDriverSpec {
  /** Exported `() => CompiledScene` function name in the capsule's source module. */
  readonly compileExport: string;
  /** Scene declares at least one audio track. */
  readonly hasAudio: boolean;
  /** Scene declares at least one video track. */
  readonly hasVideo: boolean;
}
const SCENE_DRIVERS: Readonly<Record<string, SceneDriverSpec>> = {
  // examples/scenes/intro.ts — audio bed ('bed') + video ('hero','outro'),
  // beats declared, p95Ms = 16. compileIntro() = compileScene(introContract).
  'examples.intro': { compileExport: 'compileIntro', hasAudio: true, hasVideo: true },
};

/**
 * Runtime-driver registry for `stateMachine` capsules whose transition is a
 * BUILDER + tick handle rather than declared `step`/`initialState` fields — the
 * stateMachine analogue of {@link SCENE_DRIVERS}. The driveable machine is a
 * pure compile fn (`() => CompiledDescriptor`) plus a builder namespace exposing
 * `build(descriptor)` (returning a handle with `tick(dtMs)` / `currentFrame()` /
 * the build-time output fields the invariants read). Both live in the capsule's
 * own source module, or — for a capsule whose driveable scene is an EXAMPLE —
 * in a named sibling module.
 *
 * `outputFields` names the handle fields the capsule's declared invariants read
 * off the built output. Source of truth: the capsule's invariant `check(_,
 * output)` bodies (`output.systemsRegistered`, `output.entitySpawnCount`). The
 * generated traversal copies exactly these off the handle, so a drifted list
 * (a field the invariant reads but the handle doesn't expose) fails RED.
 *
 * A capsule NOT listed here with no `step`/`initialState` stays on the harness's
 * self-reporting skip branch. Keep in sync with the capsule modules — same
 * discipline `FACTORY_NAMING` follows.
 */
interface StateMachineDriverSpec {
  /** Exported `() => CompiledDescriptor` (pure data) function name. */
  readonly compileExport: string;
  /** Repo-relative module the compile fn is exported from. */
  readonly compileModule: string;
  /** Exported builder namespace name with a `build(descriptor)` method. */
  readonly builderExport: string;
  /** Repo-relative module the builder namespace is exported from. */
  readonly builderModule: string;
  /** Handle fields the capsule's declared invariants read off the built output. */
  readonly outputFields: readonly string[];
}
const STATE_MACHINE_DRIVERS: Readonly<Record<string, StateMachineDriverSpec>> = {
  // packages/scene/src/runtime.ts — scene.runtime is a contract-only stateMachine
  // (no step/initialState); its transition is SceneRuntime.build(compiled).tick(dt).
  // The driveable compiled scene is the example intro (the only registered scene).
  'scene.runtime': {
    compileExport: 'compileIntro',
    compileModule: 'examples/scenes/intro.ts',
    builderExport: 'SceneRuntime',
    builderModule: 'packages/scene/src/runtime.ts',
    outputFields: ['systemsRegistered', 'entitySpawnCount'],
  },
};

/**
 * Real-host coverage registry for `siteAdapter` capsules. The host-capability
 * matrix (INTEGRATION lane) must prove each declared `site` supports the adapter
 * under a REAL host. The owner's rule is NO MOCKS ON THE HOST PATH, so the proof
 * does NOT come from an in-process double living beside the harness — it comes
 * from the lanes that already run the REAL runtime. This map links each capsule's
 * declared sites to those existing real-host suites (`declared-integration`, a
 * waiver WITH TEETH), and records any declared site that has NO real-host lane as
 * an honest `gap` — never a fabricated link.
 *
 * Each coverage link names: the declared `sites` it proves, the repo-relative
 * `coverageRef` suite FILE that proves them, the `pnpm run` `lane` that drives
 * that suite under the real runtime, and a `referencesNeedle` substring the suite
 * must contain (proof it actually references the adapter). The generated test
 * asserts the file exists and contains the needle — so a deleted/renamed/drifted
 * suite fails RED rather than silently lying. `coverage ∪ gaps` MUST partition the
 * declared site set exactly; the generated test asserts that too.
 */
interface SiteAdapterIntegrationSpec {
  readonly coverage: ReadonlyArray<{
    /** Declared sites this real-host suite proves. */
    readonly sites: readonly string[];
    /** Repo-relative path to the existing real-host suite file. */
    readonly coverageRef: string;
    /** The `pnpm run` lane that drives this suite under the real runtime. */
    readonly lane: string;
    /** A substring the suite file MUST contain (proof it references the adapter). */
    readonly referencesNeedle: string;
  }>;
  /** Declared sites with NO real-host lane — tracked gaps, never fabricated. */
  readonly gaps: ReadonlyArray<{ readonly site: string; readonly reason: string }>;
}
const SITE_ADAPTER_INTEGRATIONS: Readonly<Record<string, SiteAdapterIntegrationSpec>> = {
  // packages/cloudflare — sites ['edge','worker']. Both tiers are proved by the
  // `test:cloudflare` real-host lane (scripts/test-cloudflare-astro.ts): a REAL
  // @astrojs/cloudflare Workers SSR build + `czap doctor --target cloudflare`,
  // followed by tests/integration/cloudflare-edge-pipeline.test.ts driving the
  // production `cloudflareMiddleware` end to end through BOTH the precompiled-
  // boundary edge tier (no KV traffic) and the compile-escape-hatch worker tier
  // (content-addressed KV get/put through the env binding). That pipeline suite —
  // run by `pnpm run test:cloudflare`, NOT the generic vitest pass — is the real
  // proof; it references `cloudflareMiddleware` directly.
  'cloudflare.workers-kv-boundary': {
    coverage: [
      {
        sites: ['edge', 'worker'],
        coverageRef: 'tests/integration/cloudflare-edge-pipeline.test.ts',
        lane: 'pnpm run test:cloudflare',
        referencesNeedle: 'cloudflareMiddleware',
      },
    ],
    gaps: [],
  },
  // packages/remotion — sites ['node','browser']. The 'node' frame-production
  // path (precomputeFrames over a real VideoRenderer/Compositor) is proved for
  // real by tests/unit/remotion/remotion.test.ts, which imports the adapter and
  // drives precomputeFrames under the production renderer. The 'browser' hook
  // path (Provider + useCzapState) has NO real-browser lane — only jsdom — so it
  // is recorded as an honest GAP, not papered over with a simulated host.
  'remotion.video-frame-output': {
    coverage: [
      {
        sites: ['node'],
        coverageRef: 'tests/unit/remotion/remotion.test.ts',
        lane: 'pnpm run test:unit',
        referencesNeedle: 'precomputeFrames',
      },
    ],
    gaps: [
      {
        site: 'browser',
        reason:
          'no real-browser render lane exercises the adapter Provider + useCzapState hook — ' +
          'only jsdom (tests/unit/remotion/remotion.test.ts) covers the React-host surface, and ' +
          'jsdom is a simulated host. A real-browser lane (vitest browser-mode under tests/browser/ ' +
          'or a Playwright e2e rendering the Remotion <Provider>) is missing.',
      },
    ],
  },
};

/**
 * Resolve which of a siteAdapter's schemas the pure round-trip samples. Prefer
 * the `input` schema when it is arbitrary-derivable AND concrete (not the
 * over-broad `Unknown`/`Any` that would sample `fc.anything()`); else fall back
 * to the `output` schema; else `undefined` (neither derivable → the round trip
 * is non-emittable, a typed not-applicable, never a skip). The round trip proves
 * CanonicalCbor encode/decode preserves the chosen schema's structure.
 */
function resolveRoundTripSchema(
  cap: { input?: { ast?: { _tag?: string } }; output?: { ast?: { _tag?: string } } },
): 'input' | 'output' | undefined {
  const isConcreteDerivable = (schema: { ast?: { _tag?: string } } | undefined): boolean => {
    if (schema === undefined) return false;
    // Over-broad top-level schemas (`Unknown`/`Any`) are "derivable" but sample
    // fc.anything(); prefer a concrete sibling schema when one exists.
    const tag = schema.ast?._tag;
    if (tag === 'Unknown' || tag === 'AnyKeyword') return false;
    try {
      schemaToArbitrary(schema as never);
      return true;
    } catch (err) {
      if (!hasTag(err, 'UnsupportedError')) throw err;
      return false;
    }
  };
  const isDerivable = (schema: { ast?: { _tag?: string } } | undefined): boolean => {
    if (schema === undefined) return false;
    try {
      schemaToArbitrary(schema as never);
      return true;
    } catch (err) {
      if (!hasTag(err, 'UnsupportedError')) throw err;
      return false;
    }
  };
  if (isConcreteDerivable(cap.input)) return 'input';
  if (isConcreteDerivable(cap.output)) return 'output';
  // Last resort: a derivable-but-broad schema still gives a real round trip.
  if (isDerivable(cap.input)) return 'input';
  if (isDerivable(cap.output)) return 'output';
  return undefined;
}

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
        ctx,
      );
    case 'policyGate':
      return generatePolicyGate(
        cap as CapsuleDef<'policyGate', unknown, unknown, unknown>,
        ctx,
      );
    case 'cachedProjection':
      return generateCachedProjection(
        cap as CapsuleDef<'cachedProjection', unknown, unknown, unknown>,
        ctx,
      );
    case 'sceneComposition':
      return generateSceneComposition(
        cap as CapsuleDef<'sceneComposition', unknown, unknown, unknown>,
        ctx,
      );
    default:
      // Exhaustiveness: every AssemblyKind is handled above. A new kind reaching
      // here is an impossible state — routed through the typed InvariantViolation.
      return assertNever(kind, '[capsule-compile] assembly kind');
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
 *
 * INDEXING NOTE: the projection factories now take a leading `registry`
 * argument — `BeatMarkerProjection(registry, audioAssetId)` — but the detector
 * (`scripts/lib/capsule-detector.ts`) captures only DIRECTLY-SERIALIZABLE
 * literal arguments: a non-literal like the `registry` variable yields
 * `undefined` from `literalValue` and is SKIPPED, never pushed. So `args` is
 * the COMPACTED list of literal call-site arguments — `['intro-bed']`, not
 * `[undefined, 'intro-bed']`. The audioAssetId is therefore still `args[0]`,
 * and a bare numeric `bins` (if ever passed positionally) is still `args[1]`.
 * Do NOT bump these indices for the registry arg — it was never captured.
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

    // ADDITIVE defineAsset real-only branch — the SOURCE-asset analogue of
    // cachedProjectionBindable (which covers the BeatMarker/WavMetadata
    // *projection* factories). A `defineAsset` capsule (e.g. `introBed`) is a
    // cachedProjection whose `derive` is the asset's own decoder
    // (decl.decoder ?? builtinDecoderFor(kind) — see packages/assets/src/contract.ts)
    // and whose canonical byte fixture is its call-site `source` literal
    // (d.declSource). When that fixture resolves, the harness emits the FINAL
    // real-only form (fixture-driven cache/determinism/invariant probes, random
    // source test OMITTED because AssetBytes is a deliberately non-derivable
    // instanceOf(ArrayBuffer)) instead of two runtime-guarded `it.skip` literals.
    // Derive presence is pinned by a REAL premise guard inside the generated
    // test (fails RED if an asset ever loses its decoder), so this gate cannot
    // launder a derive-less asset green.
    const assetDecodeRealOnly =
      d.kind === 'cachedProjection' &&
      d.factory === 'defineAsset' &&
      d.exported === true &&
      d.binding !== undefined &&
      d.declSource !== undefined;

    let harnessCtx: HarnessContext | undefined;
    // siteAdapter only: the declared-integration host-capability proof, hoisted to
    // loop scope so it survives the harness-context block and reaches the manifest
    // entry construction below.
    let declaredIntegration: ManifestEntry['declaredIntegration'];
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

      // ADDITIVE sceneComposition branch — independent of the probe / fixture
      // paths above. A sceneComposition capsule's binding is a manifest entry
      // with Schema.Unknown I/O; the driveable scene is a sibling
      // `() => CompiledScene` export in the SAME module (see SCENE_DRIVERS).
      // When the capsule has a registry entry, resolve the SceneRuntime +
      // compile-fn imports so the harness drives the REAL ECS runtime. When it
      // does NOT (e.g. scene.beat-binding — a pre-runtime beat→spawn transform
      // with no tracks/fps/frame stream), pass a typed not-applicable reason so
      // the harness records exemptions, never an it.skip.
      let sceneDriver: HarnessContext['sceneDriver'];
      let sceneDriverNotApplicableReason: string | undefined;
      if (d.kind === 'sceneComposition') {
        const spec = SCENE_DRIVERS[d.resolvedName];
        if (spec !== undefined) {
          const runtimeAbs = resolve('packages/scene/src/runtime.ts');
          const runtimeModule = normalizeRepoPath(
            relative(dirname(testPath), runtimeAbs),
          ).replace(/\.ts$/, '.js');
          const sceneModule = sourceModule.startsWith('.') ? sourceModule : `./${sourceModule}`;
          sceneDriver = {
            compileName: spec.compileExport,
            // The compile fn lives in the capsule's own source module.
            compileImport: sceneModule,
            capsuleName: d.binding,
            capsuleImport: sceneModule,
            runtimeImport: runtimeModule.startsWith('.') ? runtimeModule : `./${runtimeModule}`,
            contentAddressImport: contentAddressModule.startsWith('.')
              ? contentAddressModule
              : `./${contentAddressModule}`,
            hasAudio: spec.hasAudio,
            hasVideo: spec.hasVideo,
          };
        } else {
          sceneDriverNotApplicableReason =
            `'${d.resolvedName}' is a sceneComposition-tagged capsule with no registered scene driver — ` +
            `it declares no compileScene-able scene (no tracks, fps, frame stream, or playback) to tick. ` +
            `It is a pre-runtime transform, so the frame-stream / sync / playback / per-frame-budget checks have nothing to drive.`;
        }
      }

      // ADDITIVE stateMachine runtime-driver branch — independent of every path
      // above. A stateMachine capsule whose transition is a builder + tick
      // handle (no declared step/initialState) resolves its driver here so the
      // harness emits a REAL traversal instead of a self-reporting skip. Imports
      // are resolved relative to dirname(testPath) (tests/generated/).
      let runtimeDriver: HarnessContext['runtimeDriver'];
      if (d.kind === 'stateMachine') {
        const spec = STATE_MACHINE_DRIVERS[d.resolvedName];
        if (spec !== undefined) {
          const relSpec = (repoRelModule: string): string => {
            const abs = resolve(repoRelModule);
            const m = normalizeRepoPath(relative(dirname(testPath), abs)).replace(/\.ts$/, '.js');
            return m.startsWith('.') ? m : `./${m}`;
          };
          runtimeDriver = {
            compileName: spec.compileExport,
            compileImport: relSpec(spec.compileModule),
            builderName: spec.builderExport,
            builderImport: relSpec(spec.builderModule),
            capsuleName: d.binding,
            capsuleImport: sourceModule.startsWith('.') ? sourceModule : `./${sourceModule}`,
            outputFields: spec.outputFields,
          };
        }
      }

      // ADDITIVE siteAdapter branch — independent of every path above. The
      // siteAdapter harness needs (a) which of the adapter's schemas the pure
      // round-trip samples and the CanonicalCbor / contentAddressOf import
      // specifiers (UNIT lane), and (b) the `declared-integration` host-capability
      // proof — real-host coverage links + tracked gaps (INTEGRATION lane). The
      // integration file lands one level deeper (tests/generated/integration/
      // <slug>.test.ts), so its imports are resolved relative to THAT dir.
      let siteAdapter: HarnessContext['siteAdapter'];
      if (d.kind === 'siteAdapter') {
        const moduleUrl = pathToFileURL(resolve(d.file)).href;
        const mod = (await import(moduleUrl)) as Record<string, unknown>;
        const cap = mod[d.binding] as
          | {
              input?: { ast?: { _tag?: string } };
              output?: { ast?: { _tag?: string } };
              site?: readonly string[];
            }
          | undefined;
        const roundTripSchema = cap !== undefined ? resolveRoundTripSchema(cap) : undefined;
        if (roundTripSchema !== undefined) {
          // INTEGRATION-lane file dir — one level below tests/generated/.
          const integrationAbs = resolve(generatedDir, 'integration', `${slug}.test.ts`);
          const integrationDir = dirname(integrationAbs);
          const rel = (absPath: string): string => {
            const spec = normalizeRepoPath(relative(integrationDir, absPath)).replace(/\.ts$/, '.js');
            return spec.startsWith('.') ? spec : `./${spec}`;
          };
          const cborAbs = resolve('packages/canonical/src/cbor-decode.ts');
          const cborEncodeAbs = resolve('packages/core/src/cbor.ts');

          // Resolve the declared-integration host-capability proof. A registered
          // entry names real-host coverage links + tracked gaps; an UNregistered
          // siteAdapter has NO real-host proof at all, so EVERY declared site is an
          // honest gap (never a fabricated link).
          const spec = SITE_ADAPTER_INTEGRATIONS[d.resolvedName];
          const declaredSites = [...(cap?.site ?? [])];
          const hostCapability: NonNullable<HarnessContext['siteAdapter']>['hostCapability'] =
            spec !== undefined
              ? { kind: 'declared-integration' as const, coverage: spec.coverage, gaps: spec.gaps }
              : {
                  kind: 'declared-integration' as const,
                  coverage: [],
                  gaps: declaredSites.map((site) => ({
                    site,
                    reason:
                      `'${d.resolvedName}' has no real-host coverage registered in ` +
                      `SITE_ADAPTER_INTEGRATIONS, so this declared site has no real-host lane proving it.`,
                  })),
                };
          // Tracked manifest fact: the declared-integration coverage map (the
          // waiver-with-teeth recorded as machine-readable data, not just a
          // generated-test comment). `coverageRef` is the primary real-host suite
          // (or null when every site is a gap — an honest, visible no-proof state).
          declaredIntegration = {
            sites: declaredSites,
            coverageRef: hostCapability.coverage[0]?.coverageRef ?? null,
            coverage: hostCapability.coverage.map((c) => ({
              sites: [...c.sites],
              coverageRef: c.coverageRef,
              lane: c.lane,
            })),
            gaps: hostCapability.gaps.map((g) => ({ site: g.site, reason: g.reason })),
          };

          siteAdapter = {
            roundTripSchema,
            // The binding import for the INTEGRATION file (deeper dir) differs
            // from the UNIT file's (tests/generated/). Resolve it against the
            // integration dir so the generated import is correct.
            bindingImportFromIntegration: rel(resolve(d.file)),
            // UNIT-lane imports are relative to dirname(testPath) (tests/generated/).
            arbitraryImport: arbitraryModule.startsWith('.') ? arbitraryModule : `./${arbitraryModule}`,
            canonicalCborImport: normalizeRepoPath(relative(dirname(testPath), cborEncodeAbs))
              .replace(/\.ts$/, '.js')
              .replace(/^(?!\.)/, './'),
            cborDecodeImport: normalizeRepoPath(relative(dirname(testPath), cborAbs))
              .replace(/\.ts$/, '.js')
              .replace(/^(?!\.)/, './'),
            contentAddressImport: contentAddressModule.startsWith('.')
              ? contentAddressModule
              : `./${contentAddressModule}`,
            hostCapability,
          };
        }
      }

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
        ...(cachedProjectionBindable || assetDecodeRealOnly
          ? { cachedProjectionRealOnly: true }
          : {}),
        // sceneComposition: the resolved scene driver (REAL runtime) or the
        // typed not-applicable reason. Mutually exclusive — a capsule either has
        // a tickable scene or it doesn't.
        ...(sceneDriver !== undefined ? { sceneDriver } : {}),
        ...(sceneDriverNotApplicableReason !== undefined
          ? { sceneDriverNotApplicableReason }
          : {}),
        // stateMachine: the resolved runtime driver (builder + tick handle) for a
        // contract-only stateMachine. Absent when the capsule has declared
        // step/initialState (the field-driven path) or no registered driver.
        ...(runtimeDriver !== undefined ? { runtimeDriver } : {}),
        // siteAdapter: the resolved round-trip schema + lane import specifiers and
        // the per-site host driver (or declared-integration coverage link). Absent
        // when neither schema is arbitrary-derivable (the round trip is then a typed
        // not-applicable, surfaced by the harness — never an it.skip).
        ...(siteAdapter !== undefined ? { siteAdapter } : {}),
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
              ...(probe.decidePresent !== undefined ? { decidePresent: probe.decidePresent } : {}),
            }
          : {}),
      };
    }
    const { testFile, benchFile, integrationFile } = dispatchHarness(d.kind, stub, harnessCtx);

    // Bench disposition: a generated bench carrying the BENCH-NOT-APPLICABLE
    // marker is a TYPED not-applicable exemption (no pure perf-sensitive path to
    // time). Lift its reason from the marker — the single source of truth the
    // harness emitted — into a tracked manifest fact, so a gate can cross-check
    // the file's marker against this record (and fail a marker/manifest mismatch).
    const benchMarker = BENCH_NOT_APPLICABLE_RE.exec(benchFile);
    const benchExemptionReason = benchMarker?.[1]?.trim();

    // INTEGRATION-lane file (siteAdapter only): lands under
    // tests/generated/integration/<slug>.test.ts. The plumb-gate scans
    // tests/generated/ recursively, so nested integration files ARE gate-scanned.
    const integrationPath =
      integrationFile !== undefined
        ? resolve(generatedDir, 'integration', `${slug}.test.ts`)
        : undefined;

    // Skip the file writes in manifest-only mode; the manifest entry below still
    // records the (committed) testFile/benchFile paths so verify can run them.
    if (!manifestOnly) {
      mkdirSync(dirname(testPath), { recursive: true });
      atomicWrite(testPath, testFile);
      atomicWrite(benchPath, benchFile);
      if (integrationFile !== undefined && integrationPath !== undefined) {
        mkdirSync(dirname(integrationPath), { recursive: true });
        atomicWrite(integrationPath, integrationFile);
      }
    }

    const sourceRel = normalizeRepoPath(relative(cwd, d.file));
    const testRel = normalizeRepoPath(relative(cwd, testPath));
    const benchRel = normalizeRepoPath(relative(cwd, benchPath));
    const integrationRel =
      integrationPath !== undefined ? normalizeRepoPath(relative(cwd, integrationPath)) : undefined;

    const wired = harnessCtx !== undefined;
    // The TYPED escape-hatch waiver, recorded as a tracked manifest fact (not
    // just a generated-test comment): a receiptedMutation that declared
    // `receiptKind: 'effect-outcome'` surfaces its reason here.
    const exemption = {
      ...(harnessCtx?.effectOutcomeReason !== undefined
        ? { effectOutcomeExemption: harnessCtx.effectOutcomeReason }
        : {}),
      // siteAdapter only: the declared-integration host-capability proof — real
      // coverage links + tracked gaps, recorded as a machine-readable fact (a
      // waiver with teeth, the gaps the owner must see), not just a test comment.
      ...(declaredIntegration !== undefined ? { declaredIntegration } : {}),
      // TYPED not-applicable bench exemption (marker -> manifest), so a gate can
      // tell an honest not-applicable bench from a lazy comment-only placeholder.
      ...(benchExemptionReason !== undefined
        ? { benchExemption: { reason: benchExemptionReason } }
        : {}),
    };
    // The generated-artifact triple, with the INTEGRATION file recorded only
    // when the arm emitted one (siteAdapter). Tracking it in the manifest makes
    // the integration lane a first-class, machine-readable fact (verify/audit
    // surfaces see it), not an untracked file on disk.
    const generated: ManifestEntry['generated'] = {
      testFile: testRel,
      benchFile: benchRel,
      ...(integrationRel !== undefined ? { integrationFile: integrationRel } : {}),
    };
    const entry: ManifestEntry =
      d.factory !== undefined
        ? d.args !== undefined && d.args.length > 0
          ? {
              name: d.resolvedName,
              kind: d.kind,
              source: sourceRel,
              generated,
              wired,
              factory: d.factory,
              args: d.args,
              ...exemption,
            }
          : {
              name: d.resolvedName,
              kind: d.kind,
              source: sourceRel,
              generated,
              wired,
              factory: d.factory,
              ...exemption,
            }
        : {
            name: d.resolvedName,
            kind: d.kind,
            source: sourceRel,
            generated,
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
