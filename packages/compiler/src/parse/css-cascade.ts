/**
 * Shared structural CSS helpers used by migration adapters when they need to
 * preserve selector-list and declaration-priority semantics.
 *
 * These helpers deliberately stop short of being a general CSS parser. They
 * preserve strings, treat comments as whitespace, and recognize only the
 * structural separators the supported migration grammars need.
 *
 * @module
 */

/** A CSS declaration value separated from its cascade priority. */
export interface CSSDeclarationValue {
  readonly value: string;
  readonly important: boolean;
}

/**
 * Split a selector list on top-level commas. Comments become whitespace while
 * quoted strings, attribute selectors, and functional selectors remain intact.
 */
export function splitCSSSelectorList(selector: string): readonly string[] {
  const members: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i]!;
    if (quote !== null) {
      current += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === '/' && selector[i + 1] === '*') {
      const end = selector.indexOf('*/', i + 2);
      i = end === -1 ? selector.length : end + 1;
      current += ' ';
      continue;
    }

    if (ch === '[') bracketDepth++;
    else if (ch === ']' && bracketDepth > 0) bracketDepth--;
    else if (ch === '(') parenDepth++;
    else if (ch === ')' && parenDepth > 0) parenDepth--;

    if (ch === ',' && bracketDepth === 0 && parenDepth === 0) {
      members.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  members.push(current.trim());
  return members;
}

/**
 * Parse a trailing top-level `!important` marker. The marker is recognized
 * case-insensitively and comments count as whitespace, but text inside strings,
 * functions, brackets, or balanced custom-property blocks remains ordinary
 * value text.
 */
export function parseCSSDeclarationValue(authored: string): CSSDeclarationValue {
  let normalized = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  const topLevelBangOffsets: number[] = [];

  for (let i = 0; i < authored.length; i++) {
    const ch = authored[i]!;
    if (quote !== null) {
      normalized += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      normalized += ch;
      continue;
    }

    if (ch === '/' && authored[i + 1] === '*') {
      const end = authored.indexOf('*/', i + 2);
      i = end === -1 ? authored.length : end + 1;
      normalized += ' ';
      continue;
    }

    if (ch === '(') parenDepth++;
    else if (ch === ')' && parenDepth > 0) parenDepth--;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']' && bracketDepth > 0) bracketDepth--;
    else if (ch === '{') braceDepth++;
    else if (ch === '}' && braceDepth > 0) braceDepth--;

    if (ch === '!' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      topLevelBangOffsets.push(normalized.length);
    }
    normalized += ch;
  }

  for (let i = topLevelBangOffsets.length - 1; i >= 0; i--) {
    const offset = topLevelBangOffsets[i]!;
    if (/^!\s*important\s*$/i.test(normalized.slice(offset))) {
      return { value: normalized.slice(0, offset).trim(), important: true };
    }
  }

  return { value: normalized.trim(), important: false };
}

/** Serialize a parsed declaration value without losing its priority. */
export function serializeCSSDeclarationValue(declaration: CSSDeclarationValue): string {
  return declaration.important ? `${declaration.value} !important` : declaration.value;
}

/** Whether `candidate` wins over `current` for the supported cascade subset. */
export function winsCSSCascade(
  candidate: { readonly important: boolean; readonly specificity: number; readonly sourceOrder: number },
  current: { readonly important: boolean; readonly specificity: number; readonly sourceOrder: number },
): boolean {
  if (candidate.important !== current.important) return candidate.important;
  if (candidate.specificity !== current.specificity) return candidate.specificity > current.specificity;
  return candidate.sourceOrder >= current.sourceOrder;
}
