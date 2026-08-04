/**
 * Shared CSS identity primitives for motion projections.
 *
 * CSS string escaping belongs below the compiler because core itself authors
 * generated boundary selectors. CSS identifiers retain a readable slug and use
 * the repository's FNV-1a content-address decision when spelling is lossy.
 *
 * @module
 */

import { fnv1a } from '../evidence/fnv.js';
import { ValidationError } from '@liteship/error';

/** Escape a value for interpolation inside a double-quoted CSS string. */
export function escapeCssString(value: string): string {
  return value.replace(/[\"\\\n\r\f]/g, (character) => {
    if (character === '\n') return '\\A ';
    if (character === '\r') return '\\D ';
    if (character === '\f') return '\\C ';
    return `\\${character}`;
  });
}

function slugPart(value: string, fallback: string): { readonly value: string; readonly lossless: boolean } {
  let projected = '';
  let invalidRun = false;
  for (const character of value.trim()) {
    const code = character.codePointAt(0)!;
    const allowed =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      character === '_' ||
      character === '-';
    if (allowed) {
      projected += character;
      invalidRun = false;
    } else if (!invalidRun) {
      projected += '-';
      invalidRun = true;
    }
  }

  let start = 0;
  let end = projected.length;
  while (projected[start] === '-') start += 1;
  while (end > start && projected[end - 1] === '-') end -= 1;
  const slug = projected.slice(start, end);
  return { value: slug.length > 0 ? slug : fallback, lossless: slug === value && slug.length > 0 };
}

/**
 * Derive a valid CSS identifier from semantic string parts.
 *
 * Safe ASCII parts preserve their established spelling. A lossy projection, an
 * ambiguous join, or `alwaysAddressed`, appends the short FNV-1a suffix over the
 * original parts so distinct authored identities do not collapse merely because
 * their slugs do.
 *
 * The address is skipped ONLY when the readable spelling DECODES back to the exact
 * authored parts. Losslessness alone is not that guarantee, because the `-` join is
 * itself lossy over parts that may contain `-`: `['a-b','c','d']` and
 * `['a','b-c','d']` are both entirely lossless, both join to `a-b-c-d`, and the
 * unaddressed form erased the component boundary that told them apart. The decode
 * is a positive proof of injectivity rather than an enumeration of hazards, so a
 * part shape nobody anticipated gets addressed instead of silently colliding.
 */
export function cssIdentFor(
  prefix: 'liteship-motion-' | 'liteship-vt-',
  parts: readonly string[],
  options: { readonly fallback: string; readonly alwaysAddressed?: boolean },
): string {
  if (parts.length === 0 || parts.some((part) => typeof part !== 'string')) {
    throw ValidationError('cssIdentFor', 'identity parts must be a non-empty string array');
  }
  const slugs = parts.map((part) => slugPart(part, options.fallback));
  const joined = slugs.map((part) => part.value).join('-');
  const readable = `${prefix}${joined}`;
  const decoded = joined.split('-');
  const recoversParts =
    slugs.every((part) => part.lossless) &&
    decoded.length === parts.length &&
    decoded.every((piece, index) => piece === parts[index]);
  if (options.alwaysAddressed !== true && recoversParts) return readable;
  return `${readable}-${fnv1a(JSON.stringify(parts)).slice('fnv1a:'.length)}`;
}
