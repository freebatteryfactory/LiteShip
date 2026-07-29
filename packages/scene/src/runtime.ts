/**
 * SceneRuntime — `stateMachine` arm capsule `scene.runtime`.
 *
 * Owns the ECS world lifetime via a `Lifetime`, registers the
 * 8 canonical scene systems (Video → Audio → Transition → Effect →
 * Sync → PassThroughMixer → Motion → SVG) in topological order, and exposes
 * `tick(dtMs)` + `release()` for use by render pipelines (CLI,
 * browser player, smoke tests).
 *
 * Closes the bug-#3 gap: `compileScene` previously returned a world
 * whose internal `Scope` had already closed AND that had no systems
 * registered (it merely attached a `registeredSystems: string[]`
 * metadata field via an `as unknown` cast). SceneRuntime turns
 * "compiled scene" into something that can actually tick.
 *
 * The 7 systems are factory functions parameterized by `frameIndex`
 * (and additional knobs for AudioSystem/PassThroughMixer). They are
 * stateless, so the runtime wraps each as a thin `System` whose
 * `execute` reads the current frame index from a mutable ref. That
 * lets us register the systems exactly once, in order, and have
 * `world.tick()` walk them every frame.
 *
 * @module
 */

import { defineCapsule, schema } from '@liteship/core';
import { createWorld, type World as WorldNS } from '@liteship/core/ecs';
import { InvariantViolationError, ValidationError } from '@liteship/error';
import type { CompiledScene } from './compile.js';
import { BeatBinding } from './beat-binding-capsule.js';
import { VideoSystem } from './systems/video.js';
import { AudioSystem } from './systems/audio.js';
import { TransitionSystem } from './systems/transition.js';
import { EffectSystem } from './systems/effect.js';
import { SyncSystem } from './systems/sync.js';
import { PassThroughMixer, type MixReceipt } from './systems/pass-through-mixer.js';
import { SVGSystem } from './systems/svg.js';
import { collectSvgAttrs, type SvgAttrsFrame } from './systems/svg-egress.js';
import { MotionSampleSystem } from './systems/motion.js';
import { BeatPart, admitScenePartSeed, scenePartSeed } from './parts.js';

/** Number of canonical scene systems — pinned for invariants. */
const CANONICAL_SYSTEM_COUNT = 8;

// ---------------------------------------------------------------------------
// Capsule declaration
// ---------------------------------------------------------------------------

const SceneRuntimeInputSchema = schema.struct({
  scene: schema.unknown,
});

const SceneRuntimeOutputSchema = schema.struct({
  systemsRegistered: schema.number,
  entitySpawnCount: schema.number,
});

/**
 * The declared `scene.runtime` capsule. Registered in the module-level
 * catalog at import time; walked by the factory compiler. Behavior is
 * implemented by {@link SceneRuntime.build} below.
 */
export const sceneRuntimeCapsule = defineCapsule({
  _kind: 'stateMachine',
  name: 'scene.runtime',
  input: SceneRuntimeInputSchema,
  output: SceneRuntimeOutputSchema,
  capabilities: { reads: [], writes: ['ecs.world'] },
  invariants: [
    {
      name: 'all-canonical-systems-registered',
      check: (_input, output) => {
        const o = output as { systemsRegistered?: number };
        return o.systemsRegistered === CANONICAL_SYSTEM_COUNT;
      },
      message: `runtime must register exactly ${CANONICAL_SYSTEM_COUNT} canonical scene systems in topological order`,
    },
    {
      name: 'entity-spawn-count-non-negative',
      check: (_input, output) => {
        const o = output as { entitySpawnCount?: number };
        return typeof o.entitySpawnCount === 'number' && o.entitySpawnCount >= 0;
      },
      message: 'entity spawn count must be >= 0',
    },
  ],
  budgets: { p95Ms: 500, allocClass: 'bounded' },
  site: ['node', 'browser'],
});

// ---------------------------------------------------------------------------
// Runtime handle
// ---------------------------------------------------------------------------

/**
 * Cap on the default mix-receipt collector. Long-running renders would
 * otherwise leak unboundedly through `handle.receipts`. Callers who need
 * every receipt should supply their own `mixSink` (no cap is applied
 * when a sink is provided — bookkeeping is the caller's responsibility).
 */
export const DEFAULT_MIX_RECEIPT_CAP = 1024;

/** Options accepted by {@link SceneRuntime.build}. */
export interface SceneRuntimeOptions {
  /** Audio sample rate fed to AudioSystem. Defaults to 48_000. */
  readonly sampleRate?: number;
  /**
   * Mix-receipt sink for PassThroughMixer. Defaults to a bounded ring
   * (last {@link DEFAULT_MIX_RECEIPT_CAP} receipts) accessible via
   * `handle.receipts`. Pass an explicit sink to receive every receipt.
   */
  readonly mixSink?: (receipt: MixReceipt) => void;
  /**
   * SVG-egress sink. Invoked once per {@link SceneRuntimeHandle.tick} AFTER
   * every system has run, with the entity-keyed {@link SvgAttrsFrame}
   * collected from the persisted `_svgAttrs` components SVGSystem composed
   * this tick. This is the reader that closes SVGSystem's dual-write: feed
   * the frame to `applySvgAttrs` for a live SVG tree, or snapshot it
   * headless. Regardless of whether a sink is supplied, the latest frame is
   * always available via {@link SceneRuntimeHandle.svgAttrs}.
   */
  readonly svgSink?: (frame: SvgAttrsFrame) => void;
}

/** Live runtime handle returned by {@link SceneRuntime.build}. */
export interface SceneRuntimeHandle {
  /** The underlying ECS world — exposed for query-based assertions. */
  readonly world: WorldNS;
  /**
   * Query entities carrying ALL named components, resolved through a Promise.
   * Wraps the now-synchronous `World.query` so the Astro scene
   * bridge can `await` the result without importing Effect (gate 24's
   * Promise-facade decision) — the same entity shape `world.query` returns.
   */
  readonly query: WorldNS['query'];
  /** Number of systems registered (always {@link CANONICAL_SYSTEM_COUNT}). */
  readonly systemsRegistered: number;
  /** Number of entities spawned at build time (one per scene track). */
  readonly entitySpawnCount: number;
  /** Current scene time in milliseconds (advanced by {@link tick}). */
  readonly currentTimeMs: () => number;
  /** Current frame index derived from `currentTimeMs * fps / 1000`. */
  readonly currentFrame: () => number;
  /** Mix receipts collected via the configured sink. Empty when a custom sink was supplied. */
  readonly receipts: readonly MixReceipt[];
  /**
   * The SVG-egress frame collected on the most recent {@link tick} — an
   * entity-keyed snapshot of the `_svgAttrs` SVGSystem composed. Empty
   * before the first tick. Always populated regardless of whether a
   * `svgSink` was supplied, so a consumer can pull the SVG cast post-tick
   * without wiring a callback.
   */
  readonly svgAttrs: () => SvgAttrsFrame;
  /**
   * Advance the simulation by `dtMs` milliseconds, then run every
   * registered system once over the world.
   */
  readonly tick: (dtMs: number) => Promise<void>;
  /** Dispose the world's Lifetime. Idempotent. */
  readonly release: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Build — the real runtime construction. Manifest-level capsule above
// captures the contract; this function does the work.
// ---------------------------------------------------------------------------

/**
 * Build a live SceneRuntime handle from a {@link CompiledScene}.
 *
 * Holds the world (which owns its own teardown) so the caller
 * controls when finalizers run. Systems are registered in the
 * canonical topological order, per the ECS-as-scene-substrate
 * discipline.
 */
async function build(compiled: CompiledScene, opts: SceneRuntimeOptions = {}): Promise<SceneRuntimeHandle> {
  const sampleRate = opts.sampleRate ?? 48_000;
  // Bounded ring for the default sink — long renders would otherwise grow
  // `collected` without limit. Custom sinks bypass the ring entirely.
  const collected: MixReceipt[] = [];
  const defaultSink = (r: MixReceipt): void => {
    collected.push(r);
    if (collected.length > DEFAULT_MIX_RECEIPT_CAP) collected.shift();
  };
  const mixSink = opts.mixSink ?? defaultSink;

  // Latest SVG-egress frame, refreshed after each tick from the persisted
  // `_svgAttrs` components. Held so `handle.svgAttrs()` can surface the SVG
  // cast even when no `svgSink` callback was supplied. Empty until tick 1.
  let svgFrame: SvgAttrsFrame = new Map();
  const svgSink = opts.svgSink;

  // Mutable runtime context — system wrappers close over this ref so
  // we can register them exactly once and still let the frame index
  // advance each tick.
  const ctx = { frameIndex: 0, timeMs: 0 };

  // Build the world — the long-lived owner of its own teardown (and any
  // future resources threaded through `world.lifetime`).
  const world = createWorld();

  // Spawn one entity per compiled track.
  let entitySpawnCount = 0;
  for (const t of compiled.trackSpawns) {
    world.spawn(...t.components.map(admitScenePartSeed));
    entitySpawnCount++;
  }

  // Spawn beat entities BEFORE registering systems so SyncSystem sees
  // them on the very first tick. Bug #8 fix: pure ECS data flow,
  // SyncSystem queries `Beat`-tagged entities instead of reading a
  // perpetually-empty closure-private `_beats` array.
  if (compiled.beats.length > 0) {
    const spawns = BeatBinding.bind(compiled.beats);
    for (const beatSpawn of spawns) {
      world.spawn(admitScenePartSeed(scenePartSeed(BeatPart, beatSpawn.components)));
    }
  }

  // Each system reads the live frame through one shared source function. The
  // system identities are minted once; no per-frame re-registration or free
  // string query reconstruction occurs.
  const frame = (): number => ctx.frameIndex;
  const systems = [
    VideoSystem(frame),
    AudioSystem(frame, compiled.fps, sampleRate),
    TransitionSystem(frame),
    EffectSystem(frame),
    SyncSystem(frame, compiled.fps),
    PassThroughMixer(frame, mixSink),
    MotionSampleSystem(frame),
    // MUST run last: SVGSystem reads `_opacity` (VideoSystem) and `_blend`
    // (TransitionSystem) populated earlier this tick to compose `_svgAttrs`.
    SVGSystem(0),
  ];

  for (const sys of systems) {
    world.addSystem(sys);
  }

  let released = false;

  const handle: SceneRuntimeHandle = {
    world,
    query: world.query,
    systemsRegistered: systems.length,
    entitySpawnCount,
    currentTimeMs: () => ctx.timeMs,
    currentFrame: () => ctx.frameIndex,
    receipts: collected,
    svgAttrs: () => svgFrame,
    tick: async (dtMs: number) => {
      if (released) {
        throw InvariantViolationError(
          'scene.runtime',
          "SceneRuntime: tick() was called after release(). release() closes the world's scope, so entities and systems are gone — call SceneRuntime.build(compiledScene) again to get a fresh handle.",
        );
      }
      if (!Number.isFinite(dtMs) || dtMs < 0) {
        throw ValidationError(
          'SceneRuntime.tick',
          `dtMs must be a finite, non-negative duration — got ${String(dtMs)}. Pass elapsed milliseconds since the previous tick.`,
        );
      }
      ctx.timeMs += dtMs;
      ctx.frameIndex = Math.floor((ctx.timeMs / 1000) * compiled.fps);
      world.tick();
      // SVG egress: SVGSystem ran last in the tick above and persisted
      // `_svgAttrs`. Collect that durable output into the entity-keyed
      // frame — the reader that closes the dual-write — then surface it via
      // `svgAttrs()` and (if configured) the caller's sink.
      svgFrame = collectSvgAttrs(world);
      if (svgSink !== undefined) svgSink(svgFrame);
    },
    release: async () => {
      if (released) return;
      released = true;
      await world.dispose();
    },
  };

  return handle;
}

// ---------------------------------------------------------------------------
// Namespace export (namespace-object pattern)
// ---------------------------------------------------------------------------

/**
 * SceneRuntime namespace — build a live, tickable handle from a
 * compiled scene. The companion type namespace exposes
 * `SceneRuntime.Handle` and `SceneRuntime.Options`.
 */
export const SceneRuntime = {
  /** Number of canonical scene systems the runtime always registers. */
  systemCount: CANONICAL_SYSTEM_COUNT,
  /** Build a live runtime handle. */
  build,
} as const;

export declare namespace SceneRuntime {
  /** Live runtime handle — see {@link SceneRuntimeHandle}. */
  export type Handle = SceneRuntimeHandle;
  /** Build-time options — see {@link SceneRuntimeOptions}. */
  export type Options = SceneRuntimeOptions;
}
