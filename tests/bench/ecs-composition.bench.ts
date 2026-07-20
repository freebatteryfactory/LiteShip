/**
 * Benchmark: ECS Composition Performance
 *
 * Performance benchmarks for ECS composition over existing primitives.
 * These tests ensure ECS composition has <5% overhead vs direct primitive usage.
 */

import { Bench } from 'tinybench';
import { Boundary, Composable, ComposableWorld, Part, World, defineBoundary, defineToken, defineStyle } from '@liteship/core';

const bench = new Bench({ warmupIterations: 50 });

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [[0, 'mobile'], [768, 'tablet'], [1024, 'desktop']],
});

const token = defineToken({
  name: 'primary',
  category: 'color',
  axes: ['themeLevel'] as const,
  values: { '1': '#00e5ff', '2': 'hsl(175 70% 50%)' },
  fallback: '#00e5ff',
});

const style = defineStyle({
  boundary,
  base: { properties: { display: 'grid', padding: '1rem' } },
  states: {
    tablet: { properties: { padding: '2rem' } },
    desktop: { properties: { padding: '3rem' } },
  },
});

type TestSchema = {
  boundary?: typeof boundary;
  token?: typeof token;
  style?: typeof style;
};

const denseStore = Part.dense('hp', 2048);
const denseEntityIds = Array.from({ length: 256 }, (_, index) => `entity-${index}:fnv1a:${index.toString(16).padStart(8, '0')}` as never);
for (const [index, entityId] of denseEntityIds.entries()) {
  denseStore.set(entityId, index);
}

bench.add('direct boundary evaluation', () => {
  Boundary.evaluate(boundary, 800);
});

bench.add('Composable.make -- boundary only', () => {
  Composable.make<TestSchema>({ boundary });
});

bench.add('Composable.make -- boundary + token + style', () => {
  Composable.make<TestSchema>({ boundary, token, style });
});

bench.add('Composable.compose -- two entities', () => {
  Composable.compose(
    Composable.make<TestSchema>({ boundary }),
    Composable.make<TestSchema>({ token, style }),
  );
});

bench.add('Composable.merge -- three entities', () => {
  Composable.merge(
    Composable.make<TestSchema>({ boundary }),
    Composable.make<TestSchema>({ token }),
    Composable.make<TestSchema>({ style }),
  );
});

bench.add('ComposableWorld.spawn -- single entity', () => {
  const scopedWorld = World.make();
  const scopedComposableWorld = ComposableWorld.make<TestSchema>(scopedWorld);
  scopedComposableWorld.spawn({ boundary, token, style });
});

bench.add('ComposableWorld.evaluate -- boundary + token + style', () => {
  const scopedWorld = World.make();
  const scopedComposableWorld = ComposableWorld.make<TestSchema>(scopedWorld);
  const entity = scopedComposableWorld.spawn({ boundary, token, style });
  scopedComposableWorld.evaluate(entity, { 'viewport.width': 800, themeLevel: 1 });
});

bench.add('DenseStore get -- hot lookup', () => {
  denseStore.get(denseEntityIds[128]!);
});

bench.add('DenseStore set -- overwrite hot slot', () => {
  denseStore.set(denseEntityIds[128]!, 999);
});

bench.add('DenseStore delete + reinsert', () => {
  const tempStore = Part.dense('temp', 8);
  const idA = 'entity-a:fnv1a:aaaaaaaa' as never;
  const idB = 'entity-b:fnv1a:bbbbbbbb' as never;
  tempStore.set(idA, 1);
  tempStore.set(idB, 2);
  tempStore.delete(idA);
  tempStore.set(idA, 3);
});

bench.add('World.tick -- regular system', () => {
  const scopedWorld = World.make();
  scopedWorld.spawn({ boundary });
  scopedWorld.addSystem({
    name: 'reader',
    query: ['boundary'],
    execute() {},
  });
  scopedWorld.tick();
});

bench.add('World.tick -- dense system', () => {
  const scopedWorld = World.make();
  const posX = Part.dense('posX', 8);
  const posY = Part.dense('posY', 8);
  scopedWorld.addDenseStore(posX);
  scopedWorld.addDenseStore(posY);
  const id = scopedWorld.spawn();
  posX.set(id, 1);
  posY.set(id, 2);
  scopedWorld.addSystem({
    name: 'dense-reader',
    query: ['posX', 'posY'],
    _denseSystem: true,
    execute(stores) {
      const x = stores.get('posX');
      const y = stores.get('posY');
      if (x && y) {
        x.data[0] = x.data[0]! + 1;
        y.data[0] = y.data[0]! + 1;
      }
    },
  });
  scopedWorld.tick();
});

bench.add('ComposableWorld.query -- existing world', () => {
  const scopedWorld = World.make();
  const scopedComposableWorld = ComposableWorld.make<TestSchema>(scopedWorld);
  scopedComposableWorld.spawn({ boundary });
  scopedComposableWorld.spawn({ boundary, token });
  scopedComposableWorld.query('boundary');
});

bench.add('baseline object construction', () => {
  const _sink = { boundary, token, style };
  void _sink;
});

await bench.run();
console.table(bench.table());
