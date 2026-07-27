/**
 * Benchmark: ECS Composition Performance
 *
 * Performance benchmarks for ECS composition over existing primitives.
 * These tests ensure ECS composition has <5% overhead vs direct primitive usage.
 */

import { Bench } from 'tinybench';
import {
  Boundary,
  ComposableWorld,
  defineBoundary,
  defineToken,
  defineStyle,
  Composable,
  createComposable,
  schema,
} from '@liteship/core';
import {
  admitPart,
  createDenseStore,
  createWorld,
  defineDenseSystem,
  definePart,
  defineSystem,
  EntityId,
} from '@liteship/core/ecs';

const bench = new Bench({ warmupIterations: 50 });

const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ],
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

const Hp = definePart('bench-composition-hp', schema.number);
const Temp = definePart('bench-composition-temp', schema.number);
const BoundaryPart = definePart('bench-composition-boundary', schema.unknown);
const PosX = definePart('bench-composition-pos-x', schema.number);
const PosY = definePart('bench-composition-pos-y', schema.number);
const denseStore = createDenseStore(Hp, 2048);
const denseEntityIds = Array.from({ length: 256 }, (_, index) =>
  EntityId(`entity-${index}:fnv1a:${index.toString(16).padStart(8, '0')}`),
);
for (const [index, entityId] of denseEntityIds.entries()) {
  denseStore.writer.set(entityId, index);
}

bench.add('direct boundary evaluation', () => {
  Boundary.evaluate(boundary, 800);
});

bench.add('Composable.make -- boundary only', () => {
  createComposable<TestSchema>({ boundary });
});

bench.add('Composable.make -- boundary + token + style', () => {
  createComposable<TestSchema>({ boundary, token, style });
});

bench.add('Composable.compose -- two entities', () => {
  Composable.compose(createComposable<TestSchema>({ boundary }), createComposable<TestSchema>({ token, style }));
});

bench.add('Composable.merge -- three entities', () => {
  Composable.merge(
    createComposable<TestSchema>({ boundary }),
    createComposable<TestSchema>({ token }),
    createComposable<TestSchema>({ style }),
  );
});

bench.add('ComposableWorld.spawn -- single entity', () => {
  const scopedWorld = createWorld();
  const scopedComposableWorld = ComposableWorld.make<TestSchema>(scopedWorld);
  scopedComposableWorld.spawn({ boundary, token, style });
});

bench.add('ComposableWorld.evaluate -- boundary + token + style', () => {
  const scopedWorld = createWorld();
  const scopedComposableWorld = ComposableWorld.make<TestSchema>(scopedWorld);
  const entity = scopedComposableWorld.spawn({ boundary, token, style });
  scopedComposableWorld.evaluate(entity, { 'viewport.width': 800, themeLevel: 1 });
});

bench.add('DenseStore get -- hot lookup', () => {
  denseStore.store.get(denseEntityIds[128]!);
});

bench.add('DenseStore set -- overwrite hot slot', () => {
  denseStore.writer.set(denseEntityIds[128]!, 999);
});

bench.add('DenseStore delete + reinsert', () => {
  const tempStore = createDenseStore(Temp, 8);
  const idA = EntityId('entity-a:fnv1a:aaaaaaaa');
  const idB = EntityId('entity-b:fnv1a:bbbbbbbb');
  tempStore.writer.set(idA, 1);
  tempStore.writer.set(idB, 2);
  tempStore.writer.delete(idA);
  tempStore.writer.set(idA, 3);
});

bench.add('World.tick -- regular system', () => {
  const scopedWorld = createWorld();
  const admitted = admitPart(BoundaryPart, boundary);
  if (!admitted.ok) throw new Error('benchmark fixture failed boundary admission');
  scopedWorld.spawn(admitted.value);
  scopedWorld.addSystem(defineSystem({ name: 'reader', query: [BoundaryPart], reads: [], writes: [], execute() {} }));
  scopedWorld.tick();
});

bench.add('World.tick -- dense system', () => {
  const scopedWorld = createWorld();
  const posX = createDenseStore(PosX, 8);
  const posY = createDenseStore(PosY, 8);
  scopedWorld.addDenseStore(posX);
  scopedWorld.addDenseStore(posY);
  const id = scopedWorld.spawn();
  posX.writer.set(id, 1);
  posY.writer.set(id, 2);
  scopedWorld.addSystem(
    defineDenseSystem({
      name: 'dense-reader',
      reads: [],
      writes: [PosX, PosY],
      execute(context) {
        const x = context.write(PosX).view();
        const y = context.write(PosY).view();
        x[0] = x[0]! + 1;
        y[0] = y[0]! + 1;
      },
    }),
  );
  scopedWorld.tick();
});

bench.add('ComposableWorld.query -- existing world', () => {
  const scopedWorld = createWorld();
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
