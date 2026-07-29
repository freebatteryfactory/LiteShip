/** Standards-shaped `CSS.escape` implementation for test realms that omit it. */
export function testCssEscape(value: string): string {
  const input = String(value);
  let output = '';
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    const char = input[index]!;
    if (code === 0) {
      output += '\uFFFD';
      continue;
    }
    const control = (code >= 1 && code <= 31) || code === 127;
    const leadingDigit = index === 0 && code >= 48 && code <= 57;
    const secondDigitAfterHyphen = index === 1 && code >= 48 && code <= 57 && input.charCodeAt(0) === 45;
    if (control || leadingDigit || secondDigitAfterHyphen) {
      output += `\\${code.toString(16)} `;
      continue;
    }
    if (index === 0 && code === 45 && input.length === 1) {
      output += '\\-';
      continue;
    }
    const safe =
      code >= 128 ||
      code === 45 ||
      code === 95 ||
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    output += safe ? char : `\\${char}`;
  }
  return output;
}

/** Install the helper only when the test realm does not provide CSS.escape. */
export function installTestCssEscape(): void {
  const current = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS;
  if (typeof current?.escape === 'function') return;
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: { ...current, escape: testCssEscape },
  });
}
