/**
 * Property test: Core validation and branding invariants.
 *
 * Type guard boolean invariants, brand constructor zero-cost guarantees.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { ValidationError, hasTag } from '@liteship/error';
// `brand` is the generic brand factory used by `@liteship/core` itself to
// define the sanctioned brand constructors. It is intentionally not on
// the public package surface; tests that exercise its zero-cost identity
// property import it from the source module directly.
import { brand } from '../../packages/core/src/brands.js';

describe('Core validation properties', () => {
  test('ValidationError type guard boolean invariant', () => {
    fc.assert(
      fc.property(fc.oneof(
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.object(), { nil: undefined }),
        fc.integer(),
        fc.boolean(),
        fc.array(fc.string()),
        fc.constant(ValidationError('test-module', 'test-detail'))
      ), (input) => {
        const result = hasTag(input, 'ValidationError');
        return typeof result === 'boolean';
      }),
    );
  });

  test('ValidationError type guard correctly identifies instances', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 20 }), (module, detail) => {
        const error = ValidationError(module, detail);
        return hasTag(error, 'ValidationError') === true;
      }),
    );
  });

  test('ValidationError type guard rejects non-instances', () => {
    fc.assert(
      fc.property(fc.oneof(
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.object(), { nil: undefined }),
        fc.integer(),
        fc.boolean()
      ), (input) => {
        return hasTag(input, 'ValidationError') === false;
      }),
    );
  });

  test('Brand constructor preserves value identity (zero runtime cost)', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const branded = brand(value);
        return branded === value; // Zero runtime cost
      }),
    );
  });

  test('Brand constructor works with different value types', () => {
    fc.assert(
      fc.property(fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.float().filter(n => !Number.isNaN(n)), // Filter out NaN
        fc.array(fc.string())
      ), (value) => {
        const branded = brand(value);
        return branded === value;
      }),
    );
  });
});
