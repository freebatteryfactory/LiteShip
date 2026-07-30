// @vitest-environment node
/**
 * `liteship/compiler` facade parity — every compile primitive the engine
 * publishes is reachable from the taught facade subpath.
 *
 * The defect class (issue #175): `compileViewTransition` shipped in
 * `@liteship/compiler` (dispatch arm, spine-admitted, tested) while being the
 * ONLY one of the five compile primitives missing from the `liteship` facade —
 * present-but-unreachable for the audience the facade is taught to. The law is
 * DERIVED, not a hand list: any future `compile*` primitive the engine exports
 * joins the obligation the moment it exists.
 */

import { describe, expect, it } from 'vitest';
import * as Engine from '@liteship/compiler';
import * as Facade from '../../../packages/liteship/src/compiler.js';

describe('liteship/compiler — compile-primitive parity with the engine', () => {
  const primitives = Object.keys(Engine)
    .filter((name) => /^compile[A-Z]/.test(name))
    .sort();

  it('the engine publishes the expected primitive family (anti-vacuity)', () => {
    // If the sweep ever finds nothing, the loop below passes vacuously — pin the
    // load-bearing member and a floor.
    expect(primitives).toContain('compileViewTransition');
    expect(primitives.length).toBeGreaterThanOrEqual(5);
  });

  it('every engine compile primitive is the SAME function on the facade subpath', () => {
    for (const name of primitives) {
      const facadeExport = (Facade as Record<string, unknown>)[name];
      expect(facadeExport, `${name} is missing from liteship/compiler (present-but-unreachable)`).toBeTypeOf(
        'function',
      );
      expect(facadeExport, `${name} on the facade must be the engine function, not a fork`).toBe(
        (Engine as Record<string, unknown>)[name],
      );
    }
  });
});
