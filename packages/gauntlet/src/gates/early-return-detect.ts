/**
 * Token-level early-return detector — lean fallback when the AST detector is not injected.
 *
 * @module
 */

export interface EarlyReturnMatch {
  readonly line: number;
  readonly token: string;
}

const EARLY_RETURN_IN_TEST = /\b(?:it|test)\s*\([^)]*\)\s*(?:=>|\{)[\s\S]*?return\s*;/;

/**
 * Best-effort scan for `return;` inside `it(` / `test(` callbacks before `expect(`.
 * The AST detector (`detectEarlyReturnBeforeExpectAST`) is authoritative when injected.
 */
export function detectEarlyReturnBeforeExpect(source: string): readonly EarlyReturnMatch[] {
  const matches: EarlyReturnMatch[] = [];
  const lines = source.split('\n');
  let inTest = false;
  let braceDepth = 0;
  let sawExpect = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/\b(?:it|test)\s*\(/.test(line)) {
      inTest = true;
      braceDepth = 0;
      sawExpect = false;
    }
    if (!inTest) continue;
    if (/\bexpect\s*\(/.test(line)) sawExpect = true;
    braceDepth += (line.match(/\{/g) ?? []).length;
    braceDepth -= (line.match(/\}/g) ?? []).length;
    if (!sawExpect && /^\s*return\s*;/.test(line)) {
      matches.push({ line: i + 1, token: 'return;' });
    }
    if (braceDepth <= 0 && line.includes('}') && i > 0) {
      inTest = false;
    }
  }

  // Suppress duplicate whole-file regex hits when the line scan already found them.
  if (
    matches.length === 0 &&
    EARLY_RETURN_IN_TEST.test(source) &&
    !/\bexpect\s*\(/.test(source.split('return;')[0] ?? '')
  ) {
    const idx = source.indexOf('return;');
    if (idx >= 0) {
      const line = source.slice(0, idx).split('\n').length;
      matches.push({ line, token: 'return;' });
    }
  }

  return matches;
}
