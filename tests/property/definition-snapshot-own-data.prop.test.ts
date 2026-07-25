/** Ownership laws for content-addressed definition snapshots. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { snapshotDefinitionValue } from '../../packages/core/src/evidence/definition-snapshot.js';

const primitive = fc.oneof(
  fc.string(),
  fc.double({ noNaN: true, noDefaultInfinity: true }),
  fc.boolean(),
  fc.constant(null),
);

function ownDataRecord(
  key: string,
  value: unknown,
  prototype: object | null = Object.prototype,
): Record<string, unknown> {
  const record = Object.create(prototype) as Record<string, unknown>;
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
  return record;
}

describe('definition snapshot own-data laws', () => {
  it('preserves every own string key as frozen data without invoking inherited accessors', () => {
    fc.assert(
      fc.property(fc.string(), fc.array(primitive, { maxLength: 12 }), (key, authoredValues) => {
        const nested = { values: [...authoredValues] };
        const source = ownDataRecord(key, nested);

        const snapshot = snapshotDefinitionValue(source) as Readonly<
          Record<string, { readonly values: readonly unknown[] }>
        >;
        const descriptor = Object.getOwnPropertyDescriptor(snapshot, key);

        expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
        expect(Object.hasOwn(snapshot, key)).toBe(true);
        expect(descriptor).toMatchObject({ enumerable: true, writable: false, configurable: false });
        expect(descriptor?.value).toEqual(nested);
        expect(Object.isFrozen(snapshot)).toBe(true);
        expect(Object.isFrozen(descriptor?.value)).toBe(true);
        expect(Object.isFrozen(descriptor?.value.values)).toBe(true);

        nested.values.push('caller-mutation');
        expect(descriptor?.value.values).toEqual(authoredValues);
      }),
      { numRuns: 300 },
    );
  });

  it.each(['__proto__', 'constructor', 'prototype', 'toString'])('%s remains an own data property', (key) => {
    const source = ownDataRecord(key, { admitted: true });
    const snapshot = snapshotDefinitionValue(source) as Readonly<Record<string, { readonly admitted: boolean }>>;

    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    expect(Object.hasOwn(snapshot, key)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(snapshot, key)?.value).toEqual({ admitted: true });
    expect((Object.prototype as Record<string, unknown>)['admitted']).toBeUndefined();
  });

  it('preserves a null-prototype record while still installing poison-shaped keys as data', () => {
    const source = ownDataRecord('__proto__', { axis: 'authored' }, null);
    const snapshot = snapshotDefinitionValue(source) as Readonly<Record<string, { readonly axis: string }>>;

    expect(Object.getPrototypeOf(snapshot)).toBeNull();
    expect(Object.hasOwn(snapshot, '__proto__')).toBe(true);
    expect(Object.getOwnPropertyDescriptor(snapshot, '__proto__')?.value).toEqual({ axis: 'authored' });
  });

  it('refuses accessors before evaluating them', () => {
    let reads = 0;
    const source = {} as Record<string, unknown>;
    Object.defineProperty(source, 'value', {
      get() {
        reads += 1;
        return 'hidden';
      },
      enumerable: true,
    });

    expect(() => snapshotDefinitionValue(source)).toThrow(/accessor property/u);
    expect(reads).toBe(0);
  });

  it('refuses cycles instead of retaining caller-owned graph identity', () => {
    const source: Record<string, unknown> = {};
    source['self'] = source;

    expect(() => snapshotDefinitionValue(source)).toThrow(/contains a cycle/u);
  });
});
