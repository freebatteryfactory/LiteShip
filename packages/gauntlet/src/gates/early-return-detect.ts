/**
 * Token-level early-return detector — lean fallback when the AST detector is not injected.
 *
 * @module
 */

import { codeOnly } from './code-only.js';

/**
 * THE CLASS RULE — ANCHOR: the closed runner vocabulary. ALLOWLIST: roots that
 * declare an individual test are eligible for early-return findings; roots that
 * declare a suite are capability-grouping scopes and are not. Skip detection
 * deliberately consumes the union, because a skipped suite is still a skip.
 */
export const TEST_ROOTS: ReadonlySet<string> = new Set(['it', 'test', 'fit', 'specify', 'fspecify']);
/** Runner roots that declare grouping suites rather than individual test obligations. */
export const SUITE_ROOTS: ReadonlySet<string> = new Set(['describe', 'suite', 'bench', 'fdescribe']);

/** One test control-flow path that exits before an assertion. */
export interface EarlyReturnMatch {
  readonly line: number;
  readonly token: string;
}

const BARE_RETURN = /\breturn(?:\s+[A-Za-z_$][\w$]*)?\s*;/;
const TEST_RUNNER_START = new RegExp(`(^|[^\\w$.])(?:${[...TEST_ROOTS].join('|')})\\s*\\(`, 'u');
const CONTROL_FLOW_HEADS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);

function startsNestedFunction(line: string): boolean {
  if (containsWord(line, 'function') || hasArrowBlock(line)) return true;
  for (let at = 0; at < line.length; at++) {
    if (at > 0 && line[at - 1] !== ',' && line[at - 1] !== '{') continue;
    const name = methodNameAt(line, at);
    if (name !== null && !CONTROL_FLOW_HEADS.has(name)) return true;
  }
  return false;
}

function isIdentifierStart(char: string | undefined): boolean {
  return (
    char !== undefined && ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '_' || char === '$')
  );
}

function isIdentifierPart(char: string | undefined): boolean {
  return isIdentifierStart(char) || (char !== undefined && char >= '0' && char <= '9');
}

function skipSpaces(source: string, at: number): number {
  while (source[at] === ' ' || source[at] === '\t') at++;
  return at;
}

function readIdentifier(source: string, at: number): { readonly value: string; readonly end: number } | null {
  if (!isIdentifierStart(source[at])) return null;
  const start = at++;
  while (isIdentifierPart(source[at])) at++;
  return { value: source.slice(start, at), end: at };
}

function containsWord(source: string, word: string): boolean {
  let at = source.indexOf(word);
  while (at >= 0) {
    if (!isIdentifierPart(source[at - 1]) && !isIdentifierPart(source[at + word.length])) return true;
    at = source.indexOf(word, at + word.length);
  }
  return false;
}

function hasArrowBlock(source: string): boolean {
  let at = source.indexOf('=>');
  while (at >= 0) {
    if (source[skipSpaces(source, at + 2)] === '{') return true;
    at = source.indexOf('=>', at + 2);
  }
  return false;
}

/** Recognize a class/object method head without a backtracking signature regex. */
function methodNameAt(source: string, start: number): string | null {
  let at = skipSpaces(source, start);
  let token = readIdentifier(source, at);
  if (token === null) return null;
  if (token.value === 'static') {
    at = skipSpaces(source, token.end);
    token = readIdentifier(source, at);
    if (token === null) return null;
  }
  if (token.value === 'async') {
    at = skipSpaces(source, token.end);
    token = readIdentifier(source, at);
    if (token === null) return null;
  }
  const name = token.value;
  at = skipSpaces(source, token.end);
  if (source[at] !== '(') return null;
  let depth = 0;
  for (; at < source.length; at++) {
    if (source[at] === '(') depth++;
    else if (source[at] === ')' && --depth === 0) break;
  }
  if (depth !== 0) return null;
  at = skipSpaces(source, at + 1);
  if (source[at] === ':') {
    at++;
    // A `=` inside the annotation is only an initializer delimiter when it is
    // not the `=>` of a function type (`run(): (() => void) | undefined {`).
    while (at < source.length && source[at] !== '{' && source[at] !== ';') {
      if (source[at] === '=') {
        if (source[at + 1] !== '>') break;
        at++;
      }
      at++;
    }
  }
  return source[skipSpaces(source, at)] === '{' ? name : null;
}

/**
 * Best-effort scan for `return;` inside `it(` / `test(` callbacks before `expect(`.
 * The AST detector (`detectEarlyReturnBeforeExpectAST`) is authoritative when injected.
 */
export function detectEarlyReturnBeforeExpect(source: string): readonly EarlyReturnMatch[] {
  const matches: EarlyReturnMatch[] = [];
  const src = codeOnly(source);
  const lines = src.split('\n');
  let inTest = false;
  let braceDepth = 0;
  let sawExpect = false;
  const nestedFunctionDepths: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const startsTest = TEST_RUNNER_START.test(line);
    if (startsTest) {
      inTest = true;
      braceDepth = 0;
      sawExpect = false;
      nestedFunctionDepths.length = 0;
    }
    if (!inTest) continue;
    if (/\bexpect\s*\(/.test(line)) sawExpect = true;

    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    if (!startsTest && startsNestedFunction(line)) {
      nestedFunctionDepths.push(braceDepth + opens - closes);
    }

    if (!sawExpect && nestedFunctionDepths.length === 0 && BARE_RETURN.test(line)) {
      matches.push({ line: i + 1, token: 'return;' });
    }

    braceDepth += opens;
    braceDepth -= closes;
    while (nestedFunctionDepths.length > 0 && braceDepth < nestedFunctionDepths[nestedFunctionDepths.length - 1]!) {
      nestedFunctionDepths.pop();
    }
    if (braceDepth <= 0 && line.includes('}') && i > 0) {
      inTest = false;
      nestedFunctionDepths.length = 0;
    }
  }

  return matches;
}
