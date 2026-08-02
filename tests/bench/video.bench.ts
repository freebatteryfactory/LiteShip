/**
 * Video rendering benchmarks -- scheduler, VideoRenderer, Compositor hot loop.
 */

import { Bench } from 'tinybench';
// The fixture uses CompositorQuantizer's genuine synchronous arm; reactive
// state belongs to ReactiveQuantizer and is not fabricated for this benchmark.
// Compositor.create/add/compute went synchronous in the core-seams wave.
import {
  Scheduler,
  createFrameSchedule,
  createVideoRenderer,
  Compositor,
  Boundary,
  Millis,
  StateName,
  ThresholdValue,
  defineBoundary,
  AddressedDigest,
  CanonicalCbor,
  HLC,
  projectionKeys,
  sealGraph,
  sealNode,
  type CellMeta,
  type ComponentNode,
  type CompositeState,
  type CompositorQuantizer,
  type ContentAddress,
  type DocumentGraph,
  type DocumentGraphEdge,
  type EntityNode,
  type PoseNode,
  type ProjectionNode,
} from '@liteship/core';
import { exportVideo } from '@liteship/stage';
import { cssVarsFromState } from '@liteship/remotion';

const bench = new Bench({ warmupIterations: 50 });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const widthBoundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

function makeQuantizer<B extends Boundary>(boundary: B): CompositorQuantizer<B> {
  let currentState = Boundary.evaluate(boundary, Number.NEGATIVE_INFINITY);
  return {
    _tag: 'Quantizer',
    boundary,
    stateSync: () => currentState,
    evaluate(value: number) {
      currentState = Boundary.evaluate(boundary, value);
      return currentState;
    },
  };
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

bench.add('FixedStepScheduler -- 1000 steps @ 60fps', () => {
  const sched = Scheduler.fixedStep(60);
  let count = 0;
  sched.schedule(() => {
    count++;
  });
  for (let i = 0; i < 1000; i++) {
    sched.step();
    sched.schedule(() => {
      count++;
    });
  }
});

const frameSchedule = createFrameSchedule({ fps: 60, durationMs: Millis(5000) });
bench.add('FrameSchedule -- enumerate 300 deterministic coordinates @ 60fps', () => {
  let checksum = 0;
  for (let index = 0; index < frameSchedule.totalFrames; index++) {
    const frame = frameSchedule.at(index);
    checksum += frame.frame + frame.timestamp + frame.progress;
  }
  if (!Number.isFinite(checksum)) throw new Error('FrameSchedule produced a non-finite coordinate.');
});

const renderer30Config = { fps: 30, width: 1920, height: 1080, durationMs: Millis(1000) } as const;
const renderer30 = createVideoRenderer(renderer30Config, Compositor.create());
bench.add('VideoRenderer -- 30 frames @ 30fps', async () => {
  for await (const _ of renderer30.frames()) {
    /* consume */
  }
});

const renderer300Config = { fps: 60, width: 1920, height: 1080, durationMs: Millis(5000) } as const;
const renderer300 = createVideoRenderer(renderer300Config, Compositor.create());
bench.add('VideoRenderer -- 300 frames @ 60fps', async () => {
  for await (const _ of renderer300.frames()) {
    /* consume */
  }
});

const blendTreeCompositor = (() => {
  const c = Compositor.create();
  c.add('viewport', makeQuantizer(widthBoundary));
  c.add('layout', makeQuantizer(widthBoundary));
  c.add('theme', makeQuantizer(widthBoundary));
  return c;
})();

const stageMetaTimestamp = HLC.increment(HLC.create('stage-video-bench'), 1);
const stageMeta: CellMeta = { created: stageMetaTimestamp, updated: stageMetaTimestamp, version: 1 };

/** Fixture construction stays outside the timed callback; the bench measures only the public cast. */
function stageGraph(componentCount: number): DocumentGraph {
  const nodes: (ComponentNode | EntityNode | ProjectionNode | PoseNode)[] = [];
  const edges: DocumentGraphEdge[] = [];
  for (let index = 0; index < componentCount; index++) {
    const name = `bench-component-${index}`;
    const component = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: '' as ContentAddress,
      meta: stageMeta,
      name,
      thresholds: [ThresholdValue(0), ThresholdValue(1)],
      states: [StateName('low'), StateName('high')],
    });
    const entity = sealNode<EntityNode>({
      _tag: 'DocGraphEntityNode',
      _version: 1,
      family: 'entity',
      id: '' as ContentAddress,
      meta: stageMeta,
      components: [component.id],
    });
    const projection = sealNode<ProjectionNode>({
      _tag: 'DocGraphProjectionNode',
      _version: 1,
      family: 'projection',
      id: '' as ContentAddress,
      meta: stageMeta,
      target: 'css',
      sourceRef: component.id,
      keys: projectionKeys(name),
      resultDigest: AddressedDigest.of(CanonicalCbor.encode({ target: 'css', name })),
    });
    const pose = (state: 'low' | 'high', value: number): PoseNode =>
      sealNode<PoseNode>({
        _tag: 'DocGraphPoseNode',
        _version: 1,
        family: 'pose',
        id: '' as ContentAddress,
        meta: stageMeta,
        entityRef: entity.id,
        state: StateName(state),
        bindings: { [`${name}-opacity`]: value },
      });
    nodes.push(component, entity, projection, pose('low', 0), pose('high', 1));
    edges.push(
      { from: entity.id, to: component.id, type: 'seq' },
      { from: component.id, to: projection.id, type: 'seq' },
    );
  }
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: stageMeta, nodes, edges });
}

const stageRenderGraph = stageGraph(32);
const remotionFrame: CompositeState = {
  discrete: {},
  blend: {},
  outputs: {
    css: Object.fromEntries(Array.from({ length: 1024 }, (_, index) => [`--frame-value-${index}`, index])),
    glsl: {},
    wgsl: {},
    aria: {},
  },
};

bench.add('Compositor.compute() -- hot loop with 3-quantizer blend tree (100 calls)', () => {
  for (let i = 0; i < 100; i++) {
    blendTreeCompositor.compute();
  }
});

const emptyVideoCompositor = Compositor.create();
bench.add('Compositor.compute() -- hot loop (100 calls)', () => {
  for (let i = 0; i < 100; i++) {
    emptyVideoCompositor.compute();
  }
});

bench.add('Stage exportVideo -- 32 components x 4 frames', () => {
  void exportVideo(stageRenderGraph);
});

bench.add('Remotion cssVarsFromState -- 1024 frame outputs', () => {
  void cssVarsFromState(remotionFrame);
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await bench.run();
console.table(bench.table());
