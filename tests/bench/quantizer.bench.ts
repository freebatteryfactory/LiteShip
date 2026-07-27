/** Qualified AnimatedQuantizer lifecycle benchmark. */

import { Bench } from 'tinybench';
import { CellKernel, Millis, StateName, defineBoundary } from '@liteship/core';
import type { BoundaryCrossing, ReactiveQuantizer } from '@liteship/core';
import { AnimatedQuantizer } from '@liteship/quantizer';

const CROSSINGS_PER_LIFECYCLE = 128;
const boundary = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'expanded'],
  ] as const,
});
type State = 'compact' | 'expanded';
type Crossing = BoundaryCrossing<State>;

function crossing(from: State, to: State, counter: number): Crossing {
  return {
    from: StateName(from),
    to: StateName(to),
    timestamp: { wall_ms: 0, counter, node_id: 'bench' } as Crossing['timestamp'],
    value: to === 'expanded' ? 900 : 100,
  };
}

async function runLifecycleCycle(): Promise<void> {
  const changes = CellKernel.fanout<Crossing>();
  let sourceState: State = 'compact';
  const quantizer = {
    _tag: 'Quantizer' as const,
    boundary,
    state: CellKernel.replay1<State>('compact'),
    stateSync: () => sourceState,
    changes,
    evaluate: () => sourceState,
  } satisfies ReactiveQuantizer<typeof boundary>;
  const animated = AnimatedQuantizer.make(
    quantizer,
    { '*': { duration: Millis(0) } },
    { compact: { opacity: 0 }, expanded: { opacity: 1 } },
  );
  let remaining = CROSSINGS_PER_LIFECYCLE;
  let counter = 0;
  const publishNext = (): void => {
    const from = sourceState;
    sourceState = sourceState === 'compact' ? 'expanded' : 'compact';
    changes.publish(crossing(from, sourceState, counter++));
  };
  animated.interpolated.subscribe(() => {
    remaining -= 1;
    if (remaining > 0) publishNext();
  });

  publishNext();
  await animated.dispose();
  if (
    remaining !== 0 ||
    changes.size !== 0 ||
    animated.interpolated.size !== 0 ||
    animated.state.size !== 0 ||
    !animated.interpolated.closed ||
    !animated.state.closed
  ) {
    throw new Error('AnimatedQuantizer lifecycle benchmark retained a subscriber or failed to close a channel');
  }
}

const bench = new Bench({ warmupIterations: 25 });

bench.add('AnimatedQuantizer lifecycle -- 128 reentrant crossings + disposal', async () => runLifecycleCycle());

await bench.run();
console.table(bench.table());
