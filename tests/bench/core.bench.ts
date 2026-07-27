/**
 * Core primitive benchmarks -- Boundary, Token, BlendTree, Compositor, ECS, Config.
 */

import { Bench } from 'tinybench';
import {
  Boundary,
  Compositor,
  Config,
  defineBoundary,
  defineToken,
  defineConfig,
  createBlendTree,
  schema,
} from '@liteship/core';
import {
  admitPart,
  createDenseStore,
  createWorld,
  defineDenseSystem,
  definePart,
  defineSystem,
} from '@liteship/core/ecs';

const bench = new Bench({ warmupIterations: 100 });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const boundary3 = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ] as const,
});

const boundary5 = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'xs'],
    [480, 'sm'],
    [768, 'md'],
    [1024, 'lg'],
    [1440, 'xl'],
  ] as const,
});

const boundary10 = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 's0'],
    [100, 's1'],
    [200, 's2'],
    [300, 's3'],
    [400, 's4'],
    [500, 's5'],
    [600, 's6'],
    [700, 's7'],
    [800, 's8'],
    [900, 's9'],
  ] as const,
});

const boundaryHyst = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1280, 'desktop'],
  ] as const,
  hysteresis: 50,
});

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

bench.add('defineBoundary() -- 3 thresholds', () => {
  defineBoundary({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'tablet'],
      [1280, 'desktop'],
    ] as const,
  });
});

bench.add('Boundary.evaluate -- 3 thresholds', () => {
  Boundary.evaluate(boundary3, 800);
});

bench.add('Boundary.evaluate -- 5 thresholds', () => {
  Boundary.evaluate(boundary5, 800);
});

bench.add('Boundary.evaluate -- 10 thresholds', () => {
  Boundary.evaluate(boundary10, 550);
});

bench.add('Boundary.evaluateWithHysteresis -- 3 thresholds', () => {
  Boundary.evaluateWithHysteresis(boundaryHyst, 780, 'mobile');
});

bench.add('defineToken() + FNV-1a', () => {
  defineToken({
    name: 'primary',
    category: 'color',
    axes: ['theme'] as const,
    values: { dark: '#00e5ff', light: '#00c4d4' },
    fallback: '#00e5ff',
  });
});

bench.add('BlendTree.compute() -- 4 nodes', () => {
  const tree = createBlendTree<{ x: number; y: number }>();
  tree.add('a', { x: 0, y: 0 }, 1);
  tree.add('b', { x: 100, y: 100 }, 1);
  tree.add('c', { x: 50, y: 50 }, 0.5);
  tree.add('d', { x: 75, y: 25 }, 0.5);
  tree.compute();
});

bench.add('Compositor.compute() -- empty', () => {
  const compositor = Compositor.create();
  compositor.compute();
});

// ECS World tick -- setup extracted so only tick() is measured per iteration
{
  const Position = definePart('bench-position', schema.struct({ x: schema.number, y: schema.number }));
  const world100 = createWorld();
  for (let i = 0; i < 100; i++) {
    const admitted = admitPart(Position, { x: i, y: i * 2 });
    if (!admitted.ok) throw new Error('benchmark fixture failed Position admission');
    world100.spawn(admitted.value);
  }
  world100.addSystem(
    defineSystem({
      name: 'mover',
      query: [Position],
      reads: [],
      writes: [],
      execute: () => {},
    }),
  );

  bench.add('ECS World tick -- 100 entities, 1 system', () => {
    world100.tick();
  });
}

{
  const world100Dense = createWorld();
  const PosX = definePart('bench-pos-x', schema.number);
  const PosY = definePart('bench-pos-y', schema.number);
  const posX = createDenseStore(PosX, 128);
  const posY = createDenseStore(PosY, 128);

  world100Dense.addDenseStore(posX);
  world100Dense.addDenseStore(posY);

  for (let i = 0; i < 100; i++) {
    const id = world100Dense.spawn();
    posX.writer.set(id, i);
    posY.writer.set(id, i * 2);
  }

  world100Dense.addSystem(
    defineDenseSystem({
      name: 'mover',
      reads: [PosY],
      writes: [PosX, PosY],
      execute(context) {
        const xData = context.write(PosX).view();
        const yData = context.write(PosY).view();
        for (let i = 0; i < yData.length; i++) {
          xData[i] = xData[i]! + 1;
          yData[i] = yData[i]! + 1;
        }
      },
    }),
  );

  bench.add('ECS World tick -- 100 entities, 1 system (dense)', () => {
    world100Dense.tick();
  });

  const publicReadView = posX.store.view();
  bench.add('ECS DenseStore read view -- 100 values', () => {
    let sum = 0;
    for (let i = 0; i < publicReadView.length; i++) sum += publicReadView.at(i)!;
    return sum;
  });
}

// Config -- make() mints a CanonicalCbor + FNV-1a content address; the
// projections (toViteConfig) are pure structural folds. Both are on the
// adapter-config hot path every liteship project pays once at startup.
const testCfg = defineConfig({ boundaries: { viewport: boundary3 } });

bench.add('defineConfig() -- empty config', () => {
  defineConfig({});
});

bench.add('defineConfig() -- with boundaries', () => {
  defineConfig({ boundaries: { viewport: boundary3, layout: boundary5 } });
});

bench.add('Config.toViteConfig() -- projection', () => {
  Config.toViteConfig(testCfg);
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await bench.run();
console.table(bench.table());
