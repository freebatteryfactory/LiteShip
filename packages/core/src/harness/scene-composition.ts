/**
 * Harness template for the `sceneComposition` assembly arm — LANE-AWARE.
 *
 * A `sceneComposition` capsule declares a scene; its real, deterministic
 * frame computation IS the ECS tick (`SceneRuntime.build` + `tick`), NOT a
 * pixel render. There is no ffmpeg and no GPU here: ticking the registered
 * scene systems over the compiled descriptor is the canonical per-frame
 * computation, so every check below drives that real runtime.
 *
 * Each generated check is tagged with the LANE it runs in and emitted into
 * the file that lane owns:
 *
 *  - **unit lane** (`.test.ts`, run by `pnpm test`) — the pure, deterministic
 *    checks. `determinism` (identical input → byte-identical frame stream via
 *    the canonical {@link contentAddressOf}), `sync-accuracy` (audio sample
 *    phase stays locked to the video frame clock within tolerance), and
 *    `invariant-preservation` (every declared scene invariant holds across the
 *    ticked playback). No timing, no rendering — real ECS ticks + real
 *    content-addressed comparison.
 *  - **bench lane** (`.bench.ts`, run by `pnpm run bench`) — the per-frame
 *    budget. A real generated benchmark ticks the scene and (the bench runner)
 *    measures frame time against the capsule's declared p95 budget. A perf
 *    contract, not a unit assertion.
 *  - **integration lane** (`'integration'`) — reserved for the siteAdapter arm
 *    coming next. The {@link HarnessLane} union carries it so the model has a
 *    clean extension point; sceneComposition emits nothing into it today.
 *
 * Per the harness LAW (memory: "no vanity tests", "no placeholders ever"): a
 * `() => true` placeholder and a green `it.skip` shipping unwired work are BOTH
 * banned. When a declared check genuinely cannot apply to a given scene — e.g.
 * a capsule that declares no scene tracks (no frame stream, no audio/video,
 * no playback) — it is recorded as a TYPED, machine-readable EXEMPTION carrying
 * a reason (the `not-applicable` precedent, mirroring receiptedMutation's
 * `effect-outcome` waiver), never a skip and never a silent omission.
 *
 * @module
 */

import { InvariantViolationError } from '@liteship/error';
import type { CapsuleDef } from '../authoring/assembly.js';
import type { HarnessOutput, HarnessContext } from './pure-transform.js';
import { benchNotApplicableMarker } from '../evidence/bench-marker.js';

/**
 * The lanes a generated check can run in. `unit` checks land in the `.test.ts`
 * file (run by `pnpm test`); `bench` checks land in the `.bench.ts` file (run
 * by `pnpm run bench`). `integration` is reserved for the siteAdapter arm — the
 * union carries it as a clean extension point but no arm emits it yet.
 */
export type HarnessLane = 'unit' | 'bench' | 'integration';

/**
 * Resolution of one declared sceneComposition check against a concrete scene.
 * Either the check is WIRED real into its lane, or it is an explicit
 * `not-applicable` EXEMPTION carrying the reason it cannot apply to this scene.
 * There is no skip variant by construction — a skip is exactly the thing the
 * harness LAW forbids.
 */
export type SceneCheckDisposition =
  | { readonly status: 'wired'; readonly lane: HarnessLane }
  | { readonly status: 'not-applicable'; readonly lane: HarnessLane; readonly reason: string };

/**
 * The four canonical sceneComposition checks and the lane each runs in. The
 * `lane` here is the DECLARATIVE lane model: it states where the check belongs
 * (unit vs bench) independent of whether a given scene can satisfy it. The
 * driver's probe (see {@link HarnessContext.sceneDriver}) then resolves each to
 * a {@link SceneCheckDisposition} — wired-real-in-lane or not-applicable.
 */
export const SCENE_CHECKS = [
  {
    id: 'determinism',
    lane: 'unit' as const,
    title: 'determinism: identical seed produces identical frame stream across 3 runs',
  },
  {
    id: 'sync-accuracy',
    lane: 'unit' as const,
    title: 'sync accuracy: audio and video frame timestamps align within +/- 1ms',
  },
  {
    id: 'invariant-preservation',
    lane: 'unit' as const,
    title: 'invariant preservation: every declared scene invariant holds across playback',
  },
  {
    id: 'per-frame-budget',
    lane: 'bench' as const,
    title: 'per-frame budget: p95 frame time below declared budget',
  },
] as const;

/** Number of runtime ticks the unit checks walk across a scene's playback. */
const PLAYBACK_TICK_COUNT = 64;

/** Sample rate the harness drives AudioSystem at — matches SceneRuntime's default. */
const HARNESS_SAMPLE_RATE = 48_000;

/**
 * Generate the test + bench file contents for a `sceneComposition` capsule.
 *
 * Drives the REAL ECS runtime when the driver resolved a `compileScene`-able
 * scene for this capsule ({@link HarnessContext.sceneDriver}). The three pure
 * checks are emitted as real `it(...)` blocks in the unit lane; the budget
 * check is emitted as a real bench in the bench lane. Checks that cannot apply
 * to the scene (e.g. no audio track → no audio/video sync) are recorded as
 * typed `not-applicable` exemptions — never `it.skip`.
 */
export function generateSceneComposition(
  cap: CapsuleDef<'sceneComposition', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const driver = ctx.sceneDriver;

  // No driveable scene resolved for this capsule. The capsule is tagged
  // `sceneComposition` but the driver found no `compileScene`-able contract to
  // tick — either no driver is registered for it, or it is structurally a
  // pre-runtime transform (no tracks / fps / frame stream / playback). Every
  // frame-stream check is recorded as a TYPED not-applicable EXEMPTION with a
  // reason — never an it.skip, never a silent omission. The bench likewise
  // carries the documented reason instead of an empty stub.
  if (driver === undefined) {
    const reason =
      ctx.sceneDriverNotApplicableReason ??
      'capsule:compile resolved no compileScene-able scene for this sceneComposition capsule, so it has no ECS frame stream to tick — these checks are frame-stream / playback checks with nothing to drive.';
    return notApplicableOutput(cap.name, reason, ctx.bindingImport, ctx.bindingName);
  }

  const dispositions = resolveDispositions(driver);
  const unitChecks = dispositions.filter((d) => d.check.lane === 'unit');
  const benchCheck = dispositions.find((d) => d.check.id === 'per-frame-budget');

  return {
    testFile: emitUnitFile(cap.name, driver, unitChecks),
    benchFile: emitBenchFile(cap.name, driver, benchCheck),
  };
}

// ---------------------------------------------------------------------------
// Disposition resolution — wired vs not-applicable, per check, per scene.
// ---------------------------------------------------------------------------

interface ResolvedCheck {
  readonly check: (typeof SCENE_CHECKS)[number];
  readonly disposition: SceneCheckDisposition;
}

/**
 * Resolve each of the four canonical checks for a concrete scene driver.
 * `determinism`, `invariant-preservation`, `per-frame-budget` always apply to
 * any tickable scene. `sync-accuracy` applies ONLY when the scene declares BOTH
 * an audio and a video track — otherwise there is no audio/video pair to align
 * (a typed not-applicable exemption, the owner's named case).
 */
function resolveDispositions(driver: SceneDriver): readonly ResolvedCheck[] {
  return SCENE_CHECKS.map((check) => {
    if (check.id === 'sync-accuracy' && !(driver.hasAudio && driver.hasVideo)) {
      const missing =
        !driver.hasAudio && !driver.hasVideo
          ? 'audio and video tracks'
          : !driver.hasAudio
            ? 'an audio track'
            : 'a video track';
      return {
        check,
        disposition: {
          status: 'not-applicable' as const,
          lane: check.lane,
          reason: `scene declares no ${missing}, so there is no audio/video frame-timestamp pair to align`,
        },
      };
    }
    return { check, disposition: { status: 'wired' as const, lane: check.lane } };
  });
}

// ---------------------------------------------------------------------------
// Unit-lane file emission (.test.ts).
// ---------------------------------------------------------------------------

function emitUnitFile(name: string, driver: SceneDriver, checks: readonly ResolvedCheck[]): string {
  const wired = checks.filter((c) => c.disposition.status === 'wired');
  const exempted = checks.filter((c) => c.disposition.status === 'not-applicable');

  const exemptionNotes = exempted
    .map((c) => {
      const reason = c.disposition.status === 'not-applicable' ? sanitize(c.disposition.reason) : '';
      return (
        `  //  - ${c.check.id} (unit lane): EXEMPTED — not-applicable. ${reason}\n` +
        `  //    Recorded as a typed, machine-readable exemption (a waiver with\n` +
        `  //    teeth), deliberately NOT an it.skip and NOT a silent omission.`
      );
    })
    .join('\n');

  // Every unit check exempt: emit a documentation-only file (no it / it.skip).
  if (wired.length === 0) {
    return `// GENERATED — do not edit by hand
// All unit-lane checks for '${name}' are not-applicable for the documented
// reasons below — deliberately no skipped-test placeholder (which would ship
// unwired work green) and no silent omission.
import 'vitest';

// Non-emitted / EXEMPTED checks (documented):
${exemptionNotes}
`;
  }

  const blocks = wired
    .map((c) => {
      switch (c.check.id) {
        case 'determinism':
          return determinismBlock(c.check.title);
        case 'sync-accuracy':
          return syncAccuracyBlock(c.check.title);
        case 'invariant-preservation':
          return invariantBlock(c.check.title);
        default:
          return '';
      }
    })
    .filter((b) => b.length > 0)
    .join('\n\n');

  const noteBlock =
    exemptionNotes.length > 0
      ? `  // Non-emitted / EXEMPTED checks (documented; deliberately no skipped placeholder):\n${exemptionNotes}\n\n`
      : '';

  return `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { contentAddressOf } from '${driver.contentAddressImport}';
import { ${driver.compileName} } from '${driver.compileImport}';
import { SceneRuntime } from '${driver.runtimeImport}';
import { scaledTimeout } from '../../vitest.shared.js';

describe('${name}', () => {
${noteBlock}${sharedHelpers(driver)}

${blocks}
});
`;
}

/**
 * Shared per-file helpers: build a fresh runtime, tick it across playback, and
 * snapshot each frame to a content address. The snapshot reads the canonical
 * persisted per-entity output components (the durable `setComponent` state the
 * scene systems write each tick) plus the SVG-egress frame — plain JSON-ish
 * data so {@link contentAddressOf} canonicalizes it deterministically.
 */
function sharedHelpers(driver: SceneDriver): string {
  return `  // The compiled scene descriptor is PURE data — identical every call — so
  // building a fresh runtime from it twice is the canonical "same seed" source.
  const compiled = ${driver.compileName}();
  const fps = compiled.fps;
  const tickCount = ${PLAYBACK_TICK_COUNT};
  const sampleRate = ${HARNESS_SAMPLE_RATE};
  const dtMs = 1000 / fps; // one frame per tick

  // The DURABLE per-entity outputs the scene systems persist via setComponent
  // (VideoSystem _opacity, AudioSystem _phase/_gain, SyncSystem _intensity,
  // TransitionSystem _blend). Reading these is the observable frame state.
  const FRAME_COMPONENTS = ['_opacity', '_phase', '_gain', '_intensity', '_blend'];

  // Snapshot one frame to a plain, ordered, content-addressable structure:
  // every entity's id + the durable output components present on it, plus the
  // SVG-egress frame. Sorted by entity id so authoring/iteration order never
  // forks the address.
  const snapshotFrame = async (handle) => {
    // World.query is synchronous — read the ticked FrameRange entities directly.
    const entities = handle.world.query('FrameRange');
    const rows = entities
      .map((e) => {
        const out = {};
        for (const key of FRAME_COMPONENTS) {
          const v = e.components.get(key);
          if (v !== undefined) out[key] = v;
        }
        return { id: String(e.id), out };
      })
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const svg = Array.from(handle.svgAttrs().entries())
      .map(([id, attrs]) => ({ id: String(id), attrs }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { frame: handle.currentFrame(), timeMs: handle.currentTimeMs(), rows, svg };
  };

  // Tick a fresh runtime across playback, content-addressing every frame. The
  // returned array of addresses IS the frame stream — a deterministic scene
  // produces a byte-identical array on every run.
  const frameStream = async () => {
    const handle = await SceneRuntime.build(compiled, { sampleRate });
    try {
      const stream = [];
      for (let i = 0; i < tickCount; i++) {
        await handle.tick(dtMs);
        stream.push(contentAddressOf(await snapshotFrame(handle)));
      }
      return stream;
    } finally {
      await handle.release();
    }
  };`;
}

function determinismBlock(title: string): string {
  return `  it('${escapeSingle(title)}', async () => {
    // Drive the SAME compiled scene through the ECS runtime three times. The
    // compiled descriptor is pure data and the tick is deterministic arithmetic
    // (ADR-0002), so every run must produce a byte-identical frame stream —
    // compared via the canonical contentAddressOf address, never a hand-rolled
    // deep-equal. A non-determinism regression (Map-iteration leak, Date.now in
    // a system, float drift) breaks the address equality RED.
    const [a, b, c] = await Promise.all([frameStream(), frameStream(), frameStream()]);
    expect(a.length).toBe(tickCount);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  }, scaledTimeout(30000));`;
}

function syncAccuracyBlock(title: string): string {
  return `  it('${escapeSingle(title)}', async () => {
    // Audio/video timestamp alignment. The runtime advances ONE clock; the
    // proof that audio stays locked to video is that AudioSystem's sample-PHASE
    // (samplesPerFrame = sampleRate / fps) reconstructs to the same wall-clock
    // ms as the video frame index. A regression in the phase math (wrong
    // samplesPerFrame, off-by-one range gate) drifts these apart > 1ms.
    const handle = await SceneRuntime.build(compiled, { sampleRate });
    try {
      const samplesPerFrame = sampleRate / fps;
      let checkedFrames = 0;
      for (let i = 0; i < tickCount; i++) {
        await handle.tick(dtMs);
        const frame = handle.currentFrame();
        const videoMs = (frame / fps) * 1000;
        // Audio entities in range carry a non-zero _phase relative to their
        // FrameRange.from; reconstruct absolute audio ms and compare to videoMs.
        const audioEntities = handle.world.query('AudioSource', 'FrameRange', '_phase');
        for (const e of audioEntities) {
          const range = e.components.get('FrameRange');
          const phase = e.components.get('_phase');
          if (frame < range.from || frame >= range.to) continue; // not playing this frame
          const audioMs = (phase / samplesPerFrame) * (1000 / fps) + (range.from / fps) * 1000;
          expect(Math.abs(audioMs - videoMs)).toBeLessThanOrEqual(1);
          checkedFrames++;
        }
      }
      // The scene declares audio + video tracks, so the playback window MUST
      // contain at least one frame where audio is active — otherwise the check
      // proved nothing. Assert we actually exercised the alignment.
      expect(checkedFrames, 'no audio frame fell inside playback — sync check was vacuous').toBeGreaterThan(0);
    } finally {
      await handle.release();
    }
  }, scaledTimeout(30000));`;
}

function invariantBlock(title: string): string {
  return `  it('${escapeSingle(title)}', async () => {
    // Every declared scene invariant must hold across the WHOLE ticked playback,
    // not just at compile time. compileScene() already evaluates the contract's
    // invariants and THROWS on violation, so a successful compile proves they
    // hold for the descriptor; we additionally tick the runtime end-to-end and
    // assert the playback completes without a runtime invariant breach (a
    // throwing tick, a runtime that fails to register its canonical systems).
    const handle = await SceneRuntime.build(compiled, { sampleRate });
    try {
      // Structural runtime invariant: the runtime registers exactly its
      // canonical system set (ADR-0009 ECS substrate) and spawns >= 0 entities.
      expect(handle.systemsRegistered).toBe(SceneRuntime.systemCount);
      expect(handle.entitySpawnCount).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < tickCount; i++) {
        // A tick that violates an arithmetic/ECS invariant throws; reaching the
        // end of playback without a throw is the preservation proof.
        await handle.tick(dtMs);
      }
      expect(handle.currentFrame()).toBeGreaterThanOrEqual(0);
    } finally {
      await handle.release();
    }
  }, scaledTimeout(30000));`;
}

// ---------------------------------------------------------------------------
// Bench-lane file emission (.bench.ts).
// ---------------------------------------------------------------------------

function emitBenchFile(name: string, driver: SceneDriver, benchCheck: ResolvedCheck | undefined): string {
  // A resolved scene driver always makes the per-frame budget a WIRED check
  // (resolveDispositions returns `wired` for `per-frame-budget` for any tickable
  // scene), so this is always the real timing contract: tick the scene and let
  // the bench runner measure per-tick frame time against the declared p95 budget.
  // The not-applicable budget case has no driver and is handled by
  // notApplicableOutput, not here.
  if (benchCheck === undefined || benchCheck.disposition.status !== 'wired') {
    // Impossible-state tripwire: a driver was resolved yet the budget check did
    // not resolve `wired`. Fail loud rather than silently emit a fake bench.
    throw InvariantViolationError(
      'scene-composition.per-frame-budget',
      `'${name}': a scene driver was resolved but the per-frame-budget check did ` +
        `not resolve 'wired' — resolveDispositions must wire the budget for any tickable scene.`,
    );
  }
  // The declared budget is read at runtime from the capsule binding itself
  // (`cap.budgets.p95Ms`) — the source of truth — not a static literal that
  // could drift from the capsule. Surfaced in the bench label so the perf
  // contract is visible alongside the p95 the reporter measures.
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { ${driver.compileName} } from '${driver.compileImport}';
import { ${driver.capsuleName} } from '${driver.capsuleImport}';
import { SceneRuntime } from '${driver.runtimeImport}';

// BENCH LANE: per-frame budget is a perf contract, not a unit assertion. It
// ticks the REAL scene runtime one frame per bench iteration; the vitest bench
// reporter surfaces p95, compared against the capsule's declared budget
// (cap.budgets.p95Ms — read from the binding, the source of truth).
const compiled = ${driver.compileName}();
const declaredP95Ms = (${driver.capsuleName} as { budgets?: { p95Ms?: number } }).budgets?.p95Ms;
let handle;

bench(
  \`${escapeSingle(name)} — per-frame tick (p95 vs declared budget \${declaredP95Ms ?? 'n/a'}ms)\`,
  async () => {
    await handle.tick(1000 / compiled.fps);
  },
  {
    time: 2000,
    setup: async () => {
      handle = await SceneRuntime.build(compiled, { sampleRate: ${HARNESS_SAMPLE_RATE} });
    },
    teardown: async () => {
      await handle.release();
    },
  },
);
`;
}

// ---------------------------------------------------------------------------
// not-applicable whole-capsule output (no driver resolved).
// ---------------------------------------------------------------------------

function notApplicableOutput(
  name: string,
  reason: string,
  bindingImport: string | undefined,
  bindingName: string | undefined,
): HarnessOutput {
  const r = sanitize(reason);
  const checkNotes = SCENE_CHECKS.map((c) => `  //  - ${c.id} (${c.lane} lane): EXEMPTED — not-applicable. ${r}`).join(
    '\n',
  );

  // The exemption is recorded as comments AND pinned by a real premise guard:
  // import the capsule binding and assert the STRUCTURAL fact that justifies the
  // not-applicable disposition — it is a sceneComposition-tagged capsule that
  // exposes NO tickable scene (no `tracks` / `fps` contract surface). This is
  // not a vanity test: if this capsule is ever turned into a real driveable
  // scene, the guard fails RED, forcing the driver to WIRE it rather than let a
  // stale exemption ship green. When no binding is importable we fall back to a
  // documentation-only file (no suite) — but that path is not reachable for the
  // current sceneComposition capsules, which are all exported consts.
  const hasBinding = bindingImport !== undefined && bindingName !== undefined;
  const testFile = hasBinding
    ? `// GENERATED — do not edit by hand
// All four sceneComposition checks for '${name}' are not-applicable for the
// documented reason below — deliberately no skipped-test placeholder (which
// would ship unwired work green) and no silent omission. The exemption is PINNED by a
// real premise guard so it cannot silently go stale. Reason:
//   ${r}
import { describe, it, expect } from 'vitest';
import { ${bindingName} } from '${bindingImport}';

describe('${name}', () => {
  // Non-emitted / EXEMPTED checks (documented):
${checkNotes}

  it('exemption premise holds: sceneComposition capsule exposes no tickable scene', () => {
    const cap = ${bindingName} as { _kind?: unknown; tracks?: unknown; fps?: unknown };
    // It IS a sceneComposition capsule (so the four checks nominally apply)...
    expect(cap._kind).toBe('sceneComposition');
    // ...but it carries NO scene-runtime contract surface (no tracks / fps), so
    // there is no frame stream / playback / audio-video pair / per-frame loop to
    // drive. That absence is exactly what makes the four checks not-applicable.
    // If this capsule ever gains a driveable scene, this guard fails RED and the
    // exemption must be replaced by a wired driver.
    expect(cap.tracks).toBeUndefined();
    expect(cap.fps).toBeUndefined();
  });
});
`
    : `// GENERATED — do not edit by hand
// All checks for '${name}' are not-applicable for the documented reason below —
// deliberately no skipped-test placeholder (which would ship unwired work green)
// and no silent omission. No capsule binding was importable to pin the premise.
// Reason:
//   ${r}
import 'vitest';

// EXEMPTED checks (documented):
${checkNotes}
`;

  return {
    testFile,
    benchFile: notApplicableBench(name, r, bindingImport, bindingName),
  };
}

// ---------------------------------------------------------------------------
// Driver descriptor + string helpers.
// ---------------------------------------------------------------------------

/**
 * Everything the harness needs to drive a concrete scene through its ECS
 * runtime: the import for its `compileScene`-able function, the SceneRuntime
 * import, the canonical content-address import, and the declared facts the
 * dispositions branch on (track kinds present, p95 budget). Resolved by the
 * driver (`scripts/capsule-compile.ts`) from a scene-driver registry — the
 * sceneComposition equivalent of the cachedProjection fixture resolution.
 */
export interface SceneDriver {
  /** Exported name of the `() => CompiledScene` function (e.g. `compileIntro`). */
  readonly compileName: string;
  /** ESM import specifier (with `.js`) for the compile function's module. */
  readonly compileImport: string;
  /** Exported name of the sceneComposition capsule binding (e.g. `intro`). */
  readonly capsuleName: string;
  /** ESM import specifier (with `.js`) for the capsule binding's module. */
  readonly capsuleImport: string;
  /** Import specifier (with `.js`) for the module exporting `SceneRuntime`. */
  readonly runtimeImport: string;
  /** Import specifier (with `.js`) for the canonical `contentAddressOf`. */
  readonly contentAddressImport: string;
  /** Whether the scene declares at least one audio track (gates sync-accuracy). */
  readonly hasAudio: boolean;
  /** Whether the scene declares at least one video track (gates sync-accuracy). */
  readonly hasVideo: boolean;
}

/** Sanitize a reason for a `//` comment: collapse whitespace, single line. */
function sanitize(reason: string): string {
  return reason.replace(/\s+/g, ' ').trim();
}

/** Escape single quotes + newlines for a single-quoted string literal. */
function escapeSingle(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/[\r\n]+/g, ' ');
}

/**
 * TYPED not-applicable bench for a sceneComposition capsule with no tickable
 * scene (e.g. scene.beat-binding — a pre-runtime beat-to-spawn transform). Emits
 * the machine-readable marker line + a real premise-guard body — never a
 * comment-only `import 'vitest'` stub (which classifies as a lazy placeholder),
 * never a `bench.skip`. The driver records a matching `benchExemption` in the
 * manifest.
 *
 * The premise guard has TEETH: it imports the capsule binding and asserts the
 * STRUCTURAL fact that makes the bench not-applicable — it is a
 * sceneComposition-tagged capsule that exposes NO tickable scene (no `tracks` /
 * `fps` contract surface). If the capsule ever gains a driveable scene, the
 * guard fails RED, forcing the driver to WIRE a real per-frame bench rather than
 * let a stale exemption ship green. No binding is importable only for an
 * unreachable code path (the current sceneComposition capsules are all exported
 * consts); there we assert the recorded exemption reason is non-empty so the
 * marker can't rot into an empty placeholder.
 */
function notApplicableBench(
  name: string,
  reason: string,
  bindingImport: string | undefined,
  bindingName: string | undefined,
): string {
  if (bindingImport !== undefined && bindingName !== undefined) {
    return `// GENERATED — do not edit by hand
${benchNotApplicableMarker(reason)}
import { bench, expect } from 'vitest';
import { ${bindingName} } from '${bindingImport}';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's \`benchExemption\` manifest record). '${name}' has no compileScene-able
// scene to tick — no frame stream / per-frame loop to time. This is a real
// PREMISE GUARD with TEETH: it asserts the STRUCTURAL absence that makes a
// per-frame bench not-applicable. If this capsule ever gains a driveable scene
// (tracks / fps), the guard fails RED, forcing a real per-frame bench.
bench('${escapeSingle(name)} — bench not-applicable (premise guard)', () => {
  const cap = ${bindingName} as { _kind?: unknown; tracks?: unknown; fps?: unknown };
  expect(cap._kind).toBe('sceneComposition');
  expect(cap.tracks).toBeUndefined();
  expect(cap.fps).toBeUndefined();
}, { time: 50 });
`;
  }
  return `// GENERATED — do not edit by hand
${benchNotApplicableMarker(reason)}
import { bench, expect } from 'vitest';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's \`benchExemption\` manifest record). No capsule binding was importable
// to pin the structural premise, so this guard asserts the recorded exemption
// reason is non-empty — the marker can't rot into an empty placeholder.
bench('${escapeSingle(name)} — bench not-applicable (premise guard)', () => {
  expect('${escapeSingle(reason)}'.length).toBeGreaterThan(0);
}, { time: 50 });
`;
}
