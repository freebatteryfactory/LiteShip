/**
 * Config determinism — same input always produces same ContentAddress.
 * Bang 1: fails because defineConfig throws.
 */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { defineConfig } from '@liteship/core';
import { arbConfigInput } from '../helpers/primitive-harness.js';

describe('Config determinism (property)', () => {
  test('same input → same id', () => {
    fc.assert(fc.property(arbConfigInput, (input) => {
      const c1 = defineConfig(input);
      const c2 = defineConfig(input);
      return c1.id === c2.id;
    }));
  });

  test('output is frozen', () => {
    fc.assert(fc.property(arbConfigInput, (input) => {
      const cfg = defineConfig(input);
      return Object.isFrozen(cfg);
    }));
  });

  test('_tag is always ConfigDef', () => {
    fc.assert(fc.property(arbConfigInput, (input) => {
      const cfg = defineConfig(input);
      return cfg._tag === 'ConfigDef';
    }));
  });
});
