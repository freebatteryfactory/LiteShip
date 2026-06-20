import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
// CUT A3 — the line-ending policy fns moved out of scripts/check-invariants.ts into
// the `check-invariants` command's host scan engine.
import {
  expectedLineEnding,
  findLineEndingViolations,
  parseLineEndingRules,
} from '@czap/command/host';

/** Repo root: this test lives at tests/unit/meta/, three levels under the root. */
const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');

describe('check-invariants command (host scan)', () => {
  test('parses .gitattributes eol rules in declaration order', () => {
    const rules = parseLineEndingRules('* text=auto eol=lf\n*.ps1 text eol=crlf\n*.png binary\n');

    expect(rules).toEqual([
      { pattern: '*', eol: 'lf' },
      { pattern: '*.ps1', eol: 'crlf' },
      { pattern: '*.png', eol: 'binary' },
    ]);
  });

  test('resolves expected line endings from .gitattributes precedence', () => {
    const rules = parseLineEndingRules('* text=auto eol=lf\n*.ps1 text eol=crlf\n');

    expect(expectedLineEnding('STATUS.md', rules)).toBe('lf');
    expect(expectedLineEnding('scripts/dev.ps1', rules)).toBe('crlf');
  });

  test('repo currently satisfies the declared line-ending policy', async () => {
    expect(await findLineEndingViolations(REPO_ROOT)).toEqual([]);
  });
});
