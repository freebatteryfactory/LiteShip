/**
 * A KNOWN-BAD downstream source file — it carries the exact violation the custom
 * gate exists to catch (a `console.log` debug crumb). The proof test globs this
 * `red/` tree to assert the gate BITES on a real filesystem context (not just its
 * in-memory fixture), so the composed run over it is NOT green. Proof the gate is a
 * real gate, not a no-op.
 *
 * @module
 */

/** A handler that left a debug crumb behind — the violation. */
export function handle(payload: string): string {
  console.log('handling', payload);
  return payload.toUpperCase();
}
