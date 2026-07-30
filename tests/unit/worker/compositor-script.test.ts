/** Executed proof for the inline compositor worker, not source-string matching. @module */

import { describe, expect, test } from 'vitest';
import { executeCompositorScript } from '../../support/compositor-script-harness.js';

interface StateMessage {
  readonly type: 'state';
  readonly state: {
    readonly discrete: Record<string, string>;
    readonly outputs: { readonly css: Record<string, string> };
    readonly resolvedStateGenerations: Record<string, number>;
  };
}

const registration = (name: string, states = ['low', 'high']) => ({
  type: 'add-quantizer',
  name,
  boundaryId: `fnv1a:${name}`,
  states,
  thresholds: [0, 500],
});

describe('COMPOSITOR_WORKER_SCRIPT execution', () => {
  test('every compute emits a complete snapshot while dirty names selectively advance', () => {
    const worker = executeCompositorScript();
    worker.send({ type: 'init', config: { targetFps: 60 } });
    worker.take('ready');
    worker.send(registration('a'));
    worker.send(registration('b', ['off', 'on']));
    worker.send({ type: 'compute' });
    expect(worker.take<StateMessage>('state').state.discrete).toEqual({ a: 'low', b: 'off' });

    worker.send({ type: 'evaluate', name: 'a', value: 900 });
    worker.send({ type: 'compute' });
    const afterA = worker.take<StateMessage>('state').state;
    expect(afterA.discrete).toEqual({ a: 'high', b: 'off' });
    expect(afterA.outputs.css).toEqual({ '--liteship-a': 'high', '--liteship-b': 'off' });
    expect(afterA.resolvedStateGenerations).toEqual({ a: 0, b: 0 });

    worker.send({ type: 'evaluate', name: 'b', value: 900 });
    worker.send({ type: 'compute' });
    expect(worker.take<StateMessage>('state').state.discrete).toEqual({ a: 'high', b: 'on' });

    worker.send({ type: 'remove-quantizer', name: 'b' });
    worker.send({ type: 'compute' });
    expect(worker.take<StateMessage>('state').state).toMatchObject({
      discrete: { a: 'high' },
      outputs: { css: { '--liteship-a': 'high' } },
    });
  });

  test('resolved-state acknowledgements report actual output changes', () => {
    const worker = executeCompositorScript();
    worker.send(registration('layout'));
    worker.send({
      type: 'apply-resolved-state',
      states: [{ name: 'layout', state: 'high', generation: 1 }],
      ack: true,
    });
    expect(
      worker.take<{ type: 'resolved-state-ack'; additionalOutputsChanged: boolean }>('resolved-state-ack'),
    ).toMatchObject({ additionalOutputsChanged: true });

    worker.send({
      type: 'apply-resolved-state',
      states: [{ name: 'layout', state: 'high', generation: 2 }],
      ack: true,
    });
    expect(
      worker.take<{ type: 'resolved-state-ack'; additionalOutputsChanged: boolean }>('resolved-state-ack'),
    ).toMatchObject({ additionalOutputsChanged: false });
  });

  test('warm reset clears generations and projections before rebuilding the retained snapshot', () => {
    const worker = executeCompositorScript();
    worker.send(registration('layout'));
    worker.send({ type: 'apply-resolved-state', states: [{ name: 'layout', state: 'high', generation: 9 }] });
    worker.send({ type: 'compute' });
    worker.take('state');
    worker.send({ type: 'warm-reset' });
    worker.send({ type: 'compute' });
    expect(worker.take<StateMessage>('state').state).toMatchObject({
      discrete: { layout: 'low' },
      resolvedStateGenerations: { layout: 0 },
      outputs: { css: { '--liteship-layout': 'low' } },
    });
  });

  test('metrics report frame-budget utilization rather than raw milliseconds', () => {
    const worker = executeCompositorScript(20);
    worker.send({ type: 'init', config: { targetFps: 60 } });
    worker.take('ready');
    worker.send(registration('layout'));
    for (let i = 0; i < 55; i++) worker.send({ type: 'compute' });
    const metrics = worker.take<{ type: 'metrics'; fps: number; budgetUsed: number }>('metrics');
    expect(metrics.fps).toBe(50);
    expect(metrics.budgetUsed).toBeCloseTo(1.2, 5);
  });

  test('dispose clears state and closes the classic worker global', () => {
    const worker = executeCompositorScript();
    worker.send(registration('layout'));
    worker.send({ type: 'dispose' });
    expect(worker.closed).toBe(true);
  });
});
