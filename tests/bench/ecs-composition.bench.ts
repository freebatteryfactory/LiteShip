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

bench.add('createComposable() -- boundary only', () => {
  createComposable<TestSchema>({ boundary });
});

bench.add('createComposable() -- boundary + token + style', () => {
  createComposable<TestSchema>({ boundary, token, style });
});

const boundaryComposable = createComposable<TestSchema>({ boundary });
const tokenStyleComposable = createComposable<TestSchema>({ token, style });
const tokenComposable = createComposable<TestSchema>({ token });
const styleComposable = createComposable<TestSchema>({ style });

bench.add('Composable.compose -- two entities', () => {
  Composable.compose(boundaryComposable, tokenStyleComposable);
});

bench.add('Composable.merge -- three entities', () => {
  Composable.merge(boundaryComposable, tokenComposable, styleComposable);
});

const freshComposableWorld = () => ComposableWorld.make<TestSchema>(createWorld());
let spawnComposableWorld = freshComposableWorld();
// prettier-ignore
bench.add('ComposableWorld.spawn -- single entity',
  () => {
    spawnComposableWorld.spawn({ boundary, token, style });
  },
  {
    beforeEach() {
      spawnComposableWorld = freshComposableWorld();
    },
  },
);

let evaluationWorld = freshComposableWorld();
let evaluationEntity = evaluationWorld.spawn({ boundary, token, style });
// prettier-ignore
bench.add('ComposableWorld.evaluate -- boundary + token + style',
  () => {
    evaluationWorld.evaluate(evaluationEntity, { 'viewport.width': 800, themeLevel: 1 });
  },
  {
    beforeEach() {
      evaluationWorld = freshComposableWorld();
      evaluationEntity = evaluationWorld.spawn({ boundary, token, style });
    },
  },
);

bench.add('DenseStore get -- hot lookup', () => {
  denseStore.store.get(denseEntityIds[128]!);
});

bench.add('DenseStore set -- overwrite hot slot', () => {
  denseStore.writer.set(denseEntityIds[128]!, 999);
});

const tempStore = createDenseStore(Temp, 8);
const tempIdA = EntityId('entity-a:fnv1a:aaaaaaaa');
const tempIdB = EntityId('entity-b:fnv1a:bbbbbbbb');
tempStore.writer.set(tempIdA, 1);
tempStore.writer.set(tempIdB, 2);
bench.add('DenseStore delete + reinsert', () => {
  tempStore.writer.delete(tempIdA);
  tempStore.writer.set(tempIdA, 3);
});

const regularWorld = createWorld();
const admittedBoundary = admitPart(BoundaryPart, boundary);
if (!admittedBoundary.ok) throw new Error('benchmark fixture failed boundary admission');
regularWorld.spawn(admittedBoundary.value);
regularWorld.addSystem(defineSystem({ name: 'reader', query: [BoundaryPart], reads: [], writes: [], execute() {} }));
bench.add('World.tick -- regular system', () => {
  regularWorld.tick();
});

const denseWorld = createWorld();
const posX = createDenseStore(PosX, 8);
const posY = createDenseStore(PosY, 8);
denseWorld.addDenseStore(posX);
denseWorld.addDenseStore(posY);
const denseId = denseWorld.spawn();
posX.writer.set(denseId, 1);
posY.writer.set(denseId, 2);
denseWorld.addSystem(
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
bench.add('World.tick -- dense system', () => {
  denseWorld.tick();
});

const queryComposableWorld = freshComposableWorld();
queryComposableWorld.spawn({ boundary });
queryComposableWorld.spawn({ boundary, token });
bench.add('ComposableWorld.query -- existing world', () => {
  queryComposableWorld.query('boundary');
});

bench.add('baseline object construction', () => {
  const _sink = { boundary, token, style };
  void _sink;
});

await bench.run();
console.table(bench.table());
