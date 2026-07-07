/**
 * Token-level early-return detector — lean fallback when the AST detector is not injected.
 *
 * @module
 */

import { codeOnly } from './code-only.js';

export interface EarlyReturnMatch {
  readonly line: number;
  readonly token: string;
}

const BARE_RETURN = /\breturn(?:\s+[A-Za-z_$][\w$]*)?\s*;/;
const TEST_RUNNER_START = /(^|[^\w$.])(?:it|test)\s*\(/;
const CONTROL_FLOW_HEADS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with']);

function startsNestedFunction(line: string): boolean {
  if (/\bfunction\b/.test(line) || /=>\s*\{/.test(line)) return true;
  const trimmed = line.trimStart();
  const method = /^(?:static\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::[^{]+)?\{/.exec(trimmed);
  if (method !== null) return !CONTROL_FLOW_HEADS.has(method[1]!);
  return /[,{]\s*(?:static\s+)?(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*(?::[^{]+)?\{/.test(line);
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
