/** Canonical inversion of LiteShip and plain CSS custom-property names. @module */

const LITESHIP_PREFIX = '--liteship-';

/**
 * Recover the authored token name from a CSS custom property. Both
 * `--liteship-name` and `--name` map to `name`; callers must reject collisions
 * when distinct source properties map to the same token.
 */
export function tokenNameForCSSCustomProperty(property: string): string | null {
  if (property.startsWith(LITESHIP_PREFIX)) return property.slice(LITESHIP_PREFIX.length);
  if (property.startsWith('--')) return property.slice(2);
  return null;
}
