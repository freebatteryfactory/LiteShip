/**
 * SPSCRing -- lock-free single-producer single-consumer ring buffer tests.
 */

import { describe, test, expect } from 'vitest';
import { SPSCRing } from '@czap/worker';

describe('SPSCRing', () => {
  test('createPair returns buffer, producer, and consumer', () => {
    const { buffer, producer, consumer } = SPSCRing.createPair(4, 2);
    expect(buffer).toBeInstanceOf(SharedArrayBuffer);
    expect(producer.capacity).toBe(4);
    expect(consumer.capacity).toBe(4);
  });

  test('empty buffer has count 0', () => {
    const { consumer } = SPSCRing.createPair(4, 2);
    expect(consumer.count).toBe(0);
  });

  test('push increments count', () => {
    const { producer, consumer } = SPSCRing.createPair(4, 2);
    const data = new Float64Array([1.0, 2.0]);
    expect(producer.push(data)).toBe(true);
    expect(consumer.count).toBe(1);
  });

  test('push then pop round-trips data', () => {
    const { producer, consumer } = SPSCRing.createPair(4, 3);
    const input = new Float64Array([10, 20, 30]);
    producer.push(input);

    const output = new Float64Array(3);
    expect(consumer.pop(output)).toBe(true);
    expect(output[0]).toBe(10);
    expect(output[1]).toBe(20);
    expect(output[2]).toBe(30);
  });

  test('pop returns false when buffer is empty', () => {
    const { consumer } = SPSCRing.createPair(4, 2);
    const output = new Float64Array(2);
    expect(consumer.pop(output)).toBe(false);
  });

  test('push returns false when buffer is full', () => {
    const { producer } = SPSCRing.createPair(2, 1);
    const data = new Float64Array([1]);
    expect(producer.push(data)).toBe(true);
    expect(producer.push(data)).toBe(true);
    expect(producer.push(data)).toBe(false); // full
  });

  test('FIFO ordering is preserved', () => {
    const { producer, consumer } = SPSCRing.createPair(4, 1);
    producer.push(new Float64Array([100]));
    producer.push(new Float64Array([200]));
    producer.push(new Float64Array([300]));

    const out = new Float64Array(1);
    consumer.pop(out);
    expect(out[0]).toBe(100);
    consumer.pop(out);
    expect(out[0]).toBe(200);
    consumer.pop(out);
    expect(out[0]).toBe(300);
  });

  test('slots recycle after pop', () => {
    const { producer, consumer } = SPSCRing.createPair(2, 1);
    const data = new Float64Array([1]);
    const out = new Float64Array(1);

    // Fill
    producer.push(data);
    producer.push(data);
    expect(producer.push(data)).toBe(false);

    // Drain one
    consumer.pop(out);

    // Now we can push again
    expect(producer.push(new Float64Array([42]))).toBe(true);

    // Pop both remaining
    consumer.pop(out);
    expect(out[0]).toBe(1);
    consumer.pop(out);
    expect(out[0]).toBe(42);
  });

  test('consumer cannot push — error names the side and the attach call to make', () => {
    const { consumer } = SPSCRing.createPair(4, 1);
    expect(() => consumer.push(new Float64Array([1]))).toThrow(
      'SPSCRing: this handle is the consumer side — push() is producer-only. Inside the worker, call SPSCRing.attachProducer(buffer) and push on that handle.',
    );
  });

  test('producer cannot pop — error names the side and the attach call to make', () => {
    const { producer } = SPSCRing.createPair(4, 1);
    expect(() => producer.pop(new Float64Array(1))).toThrow(
      'SPSCRing: this handle is the producer side — pop() is consumer-only. On the consuming thread, call SPSCRing.attachConsumer(buffer) and pop on that handle.',
    );
  });

  test('wrong slot size throws on push, teaching scratch-array reuse', () => {
    const { producer } = SPSCRing.createPair(4, 3);
    expect(() => producer.push(new Float64Array(2))).toThrow(
      'SPSCRing: this ring was created with slotSize 3 but you pushed a Float64Array of length 2. Allocate your scratch array once with new Float64Array(3) and reuse it.',
    );
  });

  test('wrong slot size throws on pop, teaching scratch-array reuse', () => {
    const { consumer } = SPSCRing.createPair(4, 3);
    expect(() => consumer.pop(new Float64Array(2))).toThrow(
      'SPSCRing: this ring was created with slotSize 3 but you popped into a Float64Array of length 2. Allocate your scratch array once with new Float64Array(3) and reuse it.',
    );
  });

  test('createPair preflights cross-origin isolation with the COOP/COEP remedy', () => {
    const had = Object.getOwnPropertyDescriptor(globalThis, 'crossOriginIsolated');
    Object.defineProperty(globalThis, 'crossOriginIsolated', { value: false, configurable: true });
    try {
      expect(() => SPSCRing.createPair(4, 2)).toThrow(
        'SPSCRing.createPair: SharedArrayBuffer is unavailable because this page is not cross-origin isolated. Serve it with "Cross-Origin-Opener-Policy: same-origin" and "Cross-Origin-Embedder-Policy: require-corp" — @czap/astro sets these headers for you.',
      );
    } finally {
      if (had) {
        Object.defineProperty(globalThis, 'crossOriginIsolated', had);
      } else {
        delete (globalThis as { crossOriginIsolated?: unknown }).crossOriginIsolated;
      }
    }
  });

  test('createPair succeeds where crossOriginIsolated is absent (Node)', () => {
    expect(typeof (globalThis as { crossOriginIsolated?: unknown }).crossOriginIsolated).toBe('undefined');
    expect(() => SPSCRing.createPair(4, 2)).not.toThrow();
  });

  test('invalid slotCount throws', () => {
    expect(() => SPSCRing.createPair(0, 1)).toThrow();
    expect(() => SPSCRing.createPair(-1, 1)).toThrow();
    expect(() => SPSCRing.createPair(1.5, 1)).toThrow();
  });

  test('invalid slotSize throws', () => {
    expect(() => SPSCRing.createPair(4, 0)).toThrow();
    expect(() => SPSCRing.createPair(4, -2)).toThrow();
  });

  test('attachProducer creates producer from existing SAB', () => {
    const { buffer } = SPSCRing.createPair(4, 2);
    const producer = SPSCRing.attachProducer(buffer, 4, 2);
    expect(producer.capacity).toBe(4);
    expect(producer.push(new Float64Array([1, 2]))).toBe(true);
  });

  test('attachConsumer creates consumer from existing SAB', () => {
    const { buffer, producer } = SPSCRing.createPair(4, 2);
    producer.push(new Float64Array([10, 20]));

    const consumer = SPSCRing.attachConsumer(buffer, 4, 2);
    const out = new Float64Array(2);
    expect(consumer.pop(out)).toBe(true);
    expect(out[0]).toBe(10);
    expect(out[1]).toBe(20);
  });

  test('attachProducer throws RangeError for invalid slotCount', () => {
    const sab = new SharedArrayBuffer(64);
    expect(() => SPSCRing.attachProducer(sab, 0, 2)).toThrow(RangeError);
    expect(() => SPSCRing.attachProducer(sab, -1, 2)).toThrow(RangeError);
    expect(() => SPSCRing.attachProducer(sab, 1.5, 2)).toThrow(RangeError);
  });

  test('attachConsumer throws RangeError for invalid slotSize', () => {
    const sab = new SharedArrayBuffer(64);
    expect(() => SPSCRing.attachConsumer(sab, 4, 0)).toThrow(RangeError);
    expect(() => SPSCRing.attachConsumer(sab, 4, -1)).toThrow(RangeError);
    expect(() => SPSCRing.attachConsumer(sab, 4, 1.5)).toThrow(RangeError);
  });
});

describe('SPSCRing header-derived geometry', () => {
  test('attachProducer/attachConsumer need only the buffer — geometry rides in the header', () => {
    const { buffer } = SPSCRing.createPair(8, 3);

    const producer = SPSCRing.attachProducer(buffer);
    const consumer = SPSCRing.attachConsumer(buffer);

    expect(producer.capacity).toBe(8);
    expect(consumer.capacity).toBe(8);

    expect(producer.push(new Float64Array([1, 2, 3]))).toBe(true);
    const out = new Float64Array(3);
    expect(consumer.pop(out)).toBe(true);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });

  test('buffer byte length accounts for the 16-byte control header plus data slots', () => {
    const { buffer } = SPSCRing.createPair(16, 8);
    expect(buffer.byteLength).toBe(16 + 16 * 8 * 8);
  });

  test('explicit args matching the header are accepted (back-compat form)', () => {
    const { buffer } = SPSCRing.createPair(4, 2);
    const producer = SPSCRing.attachProducer(buffer, 4, 2);
    expect(producer.push(new Float64Array([1, 2]))).toBe(true);
  });

  test('explicit args mismatching the header throw instead of silently corrupting', () => {
    const { buffer } = SPSCRing.createPair(4, 2);
    expect(() => SPSCRing.attachProducer(buffer, 8, 2)).toThrow(/created with slotCount 4 \/ slotSize 2/);
    expect(() => SPSCRing.attachConsumer(buffer, 4, 3)).toThrow(/created with slotCount 4 \/ slotSize 2/);
  });

  test('a buffer without ring geometry names createPair as the fix', () => {
    const raw = new SharedArrayBuffer(64);
    expect(() => SPSCRing.attachProducer(raw)).toThrow(/SPSCRing\.createPair/);
  });

  test('a buffer smaller than the control header is rejected with its size', () => {
    const tiny = new SharedArrayBuffer(8);
    expect(() => SPSCRing.attachConsumer(tiny)).toThrow(/only 8 bytes/);
  });
});
