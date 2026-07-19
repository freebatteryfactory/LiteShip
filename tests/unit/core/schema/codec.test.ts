/**
 * Codec — kernel schema codec: sync encode/decode returning tagged results.
 *
 * Kernel schemas carry no encode TRANSFORM (a decoded value and its wire form
 * are the same runtime value), so the codec is a validated identity transport:
 * `decode` validates untrusted input into the typed value, `encode` validates a
 * domain value into its wire form. Both return an `ok`/`err` Result — never an
 * Effect, never a throw.
 */

import { describe, test, expect } from 'vitest';
import { S, Codec } from '@liteship/core';

describe('Codec', () => {
  describe('roundtrip with a struct schema', () => {
    const PersonSchema = S.struct({ name: S.string, age: S.number });
    const personCodec = Codec.make(PersonSchema);

    test('decode then encode recovers a structurally-equal value', () => {
      const original = { name: 'Alice', age: 30 };
      const decoded = personCodec.decode(original);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) throw new Error('expected an ok result');
      expect(decoded.value).toEqual(original);
      const encoded = personCodec.encode(decoded.value);
      expect(encoded.ok).toBe(true);
      if (!encoded.ok) throw new Error('expected an ok result');
      expect(encoded.value).toEqual(original);
    });

    test('decode a valid input succeeds with the typed value', () => {
      const decoded = personCodec.decode({ name: 'Bob', age: 25 });
      if (!decoded.ok) throw new Error('expected an ok result');
      expect(decoded.value.name).toBe('Bob');
      expect(decoded.value.age).toBe(25);
    });
  });

  describe('error handling — tagged results, never a throw', () => {
    const StrictSchema = S.struct({ id: S.number, label: S.string });
    const strictCodec = Codec.make(StrictSchema);

    test('decode with a wrong field type returns a ParseError result', () => {
      const result = strictCodec.decode({ id: 'not-a-number', label: 'test' });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected an err result');
      expect(result.error._tag).toBe('ParseError');
    });

    test('decode with a missing field returns a ParseError result', () => {
      const result = strictCodec.decode({ id: 42 });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected an err result');
      expect(result.error._tag).toBe('ParseError');
    });

    test('decode of a non-object returns a ParseError result', () => {
      const result = strictCodec.decode('not an object at all');
      expect(result.ok).toBe(false);
    });
  });

  describe('schema property', () => {
    test('codec exposes the underlying kernel schema', () => {
      const codec = Codec.make(S.struct({ value: S.boolean }));
      expect(codec.schema).toBeDefined();
    });
  });
});
