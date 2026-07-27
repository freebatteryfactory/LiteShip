/** Prototype-free string-keyed records for hostile external token names. @module */

/** Create a dictionary where `__proto__` and other inherited names are ordinary own keys. */
export function migrationRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}
