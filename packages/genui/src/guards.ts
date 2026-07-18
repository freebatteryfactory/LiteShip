/**
 * genui's shared structural type guards.
 *
 * `isPlainObject` is the single "is this a JSON object literal, not null / array /
 * primitive" predicate the parser and the validator both lean on when narrowing
 * MODEL-controlled input before touching its members. Both paths carried a
 * byte-identical local copy; this leaf module owns the one definition so they can
 * share the narrowing without a parse↔validate import cycle.
 *
 * @module
 */

/** True for a plain object literal — NOT `null`, an array, or a primitive. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
