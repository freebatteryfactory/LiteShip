/**
 * THE ONE module-scope ambient-Date scanner (F-PROTO-3 / #115 / #117).
 *
 * `scanModuleScopeDateReads` is the single AST scanner both the doctor probe and the
 * consumer-app audit call (Law 6). It replaces a regex heuristic that silently missed four
 * module-LOAD read forms (template interpolation, IIFE, post-function-decl initializer, class
 * static initializer) and over-flagged deferred (call-time) bodies. This matrix pins each
 * previously-missed form as FLAGGED and each deferred/deterministic form as CLEAN.
 *
 * @module
 */
import { describe, expect, test } from 'vitest';
import { scanModuleScopeDateReads, hasModuleScopeDateRead } from '@czap/audit';

const flagged = (src: string): boolean => hasModuleScopeDateRead(src, 'x.worker.ts');

describe('scanModuleScopeDateReads — the four F-PROTO-3 miss-classes are now FLAGGED', () => {
  test('(a) template-literal interpolation at module scope', () => {
    expect(flagged('const stamp = `booted-${Date.now()}`;')).toBe(true);
  });

  test('(b) immediately-invoked arrow — runs at load', () => {
    expect(flagged('const boot = (() => Date.now())();')).toBe(true);
  });

  test('(b2) immediately-invoked function expression — runs at load', () => {
    expect(flagged('const boot = (function () {\n  return Date.now();\n})();')).toBe(true);
  });

  test('(c) non-exported const Date.now() AFTER a function declaration', () => {
    expect(flagged('const a = 1;\nfunction foo() { return a; }\nconst startedAt = Date.now();')).toBe(true);
  });

  test('(d) class static field initializer — runs at class definition', () => {
    expect(flagged('export class Config {\n  static startedAt = Date.now();\n}')).toBe(true);
  });

  test('(d2) class static block — runs at class definition', () => {
    expect(flagged('export class Config {\n  static {\n    const t = Date.now();\n  }\n}')).toBe(true);
  });
});

describe('scanModuleScopeDateReads — additional load-time forms', () => {
  test('top-level exported const (the always-flagged baseline)', () => {
    expect(flagged('export const startedAt = Date.now();')).toBe(true);
  });

  test('object-literal property initializer at module scope', () => {
    expect(flagged('export const cfg = { t: Date.now() };')).toBe(true);
  });

  test('bare new Date() with zero args', () => {
    expect(flagged('export const now = new Date();')).toBe(true);
  });

  test('bare Date() function call (current-time string)', () => {
    expect(flagged('export const s = Date();')).toBe(true);
  });

  test('Date["now"]() bracket spelling', () => {
    expect(flagged('export const t = Date["now"]();')).toBe(true);
  });

  test('reports a 1-based line for the read', () => {
    const hits = scanModuleScopeDateReads('const a = 1;\nconst t = Date.now();', 'x.worker.ts');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.line).toBe(2);
    expect(hits[0]!.kind).toBe('Date.now');
  });
});

describe('scanModuleScopeDateReads — deferred / deterministic reads are CLEAN (no false positive)', () => {
  test('deferred expression-bodied arrow (per-call)', () => {
    expect(flagged('export const clock = () => Date.now();')).toBe(false);
  });

  test('deferred function declaration body', () => {
    expect(flagged('export function handler() { return Date.now(); }')).toBe(false);
  });

  test('deferred instance-method body', () => {
    expect(flagged('export class Svc {\n  boot() { return Date.now(); }\n}')).toBe(false);
  });

  test('deferred object getter body', () => {
    expect(flagged('export const clock = {\n  get now() { return Date.now(); },\n};')).toBe(false);
  });

  test('deferred class INSTANCE field initializer (runs at construction)', () => {
    expect(flagged('export class Svc {\n  startedAt = Date.now();\n}')).toBe(false);
  });

  test('deferred method inside export default object', () => {
    expect(flagged('export default {\n  async fetch() { return Date.now(); }\n};')).toBe(false);
  });

  test('deterministic new Date(explicit arg) is not an ambient read', () => {
    expect(flagged('export const epoch = new Date(0);')).toBe(false);
  });

  test('Date.now() only inside a string literal is not a call', () => {
    expect(flagged('export const hint = "call Date.now() at runtime";')).toBe(false);
  });

  test('Date.UTC / Date.parse are deterministic, not ambient', () => {
    expect(flagged('export const a = Date.UTC(2020, 0, 1);\nexport const b = Date.parse("2020-01-01");')).toBe(false);
  });
});
