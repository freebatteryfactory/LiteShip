/**
 * Escape a value for interpolation inside a double-quoted CSS string.
 *
 * Attribute-selector values use this helper in every compiler projection so a
 * quote, backslash, or line terminator can never terminate the selector and
 * silently discard the rule (CSS Syntax section 4.3.5).
 */
export function escapeCssString(value: string): string {
  return value.replace(/[\\\"\n\r\f]/g, (character) => {
    if (character === '\n') return '\\A ';
    if (character === '\r') return '\\D ';
    if (character === '\f') return '\\C ';
    return `\\${character}`;
  });
}
