/** @liteship/worker error contract */
import { describe, it, expect } from 'vitest';
import { SPSCRing } from '@liteship/worker';

describe('@liteship/worker error contract', () => {
  it('consumer push names the side and the attach call to make', () => {
    const { consumer } = SPSCRing.createPair(4, 1);
    expect(() => consumer.push(new Float64Array([1]))).toThrow(/consumer side.*attachProducer/s);
  });
});
