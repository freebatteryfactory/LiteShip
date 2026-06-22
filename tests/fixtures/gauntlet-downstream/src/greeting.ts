/**
 * A tiny sample of the downstream project's OWN source. It is clean against BOTH
 * LiteShip's built-in gates (no bare throw, no silent catch, no placeholder, no
 * skipped test, no ts-ignore, no nondeterminism) AND the downstream's custom
 * `no-console-log` gate — so a composed run over this tree is GREEN.
 *
 * The composed run in the runner proves the two gate families co-exist: the
 * downstream gate and LiteShip's built-ins fold over the same context and neither
 * fires on this known-good source.
 *
 * @module
 */

import { ValidationError } from '@czap/error';

/** Greet a non-empty name; a bare empty name is a tagged @czap/error (no bare throw). */
export function greet(name: string): string {
  if (name.trim() === '') {
    throw ValidationError('greet', 'name must be non-empty');
  }
  return `hello, ${name}`;
}
