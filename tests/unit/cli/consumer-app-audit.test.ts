import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { scanConsumerAppSource } from '../../../packages/cli/src/lib/consumer-app-audit.js';

describe('consumer-app audit (#117)', () => {
  test('flags raw Request passed to resolveInitialState', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'page.astro'),
      `---
import { resolveInitialState } from '@liteship/astro';
const state = resolveInitialState(context.request);
---`,
    );
    const findings = scanConsumerAppSource(dir);
    expect(findings.some((f) => f.rule === 'consumer.raw-request-resolve')).toBe(true);
  });

  test('flags unguarded innerHTML even when createHtmlFragment exists elsewhere in the file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'safe.ts'),
      `import { createHtmlFragment } from '@liteship/web';
export function safe(el: HTMLElement) {
  el.innerHTML = createHtmlFragment('<p/>', { policy: 'sanitized-html' });
}`,
    );
    writeFileSync(
      join(dir, 'src', 'unsafe.ts'),
      `export function unsafe(el: HTMLElement) {
  el.innerHTML = userInput;
}`,
    );
    const findings = scanConsumerAppSource(dir);
    expect(findings.filter((f) => f.rule === 'consumer.unguarded-html-sink').map((f) => f.file)).toEqual([
      'src/unsafe.ts',
    ]);
  });

  test('outer safe createHtmlFragment does not suppress inner unguarded innerHTML', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'mixed.ts'),
      `import { createHtmlFragment } from '@liteship/web';
export function outer(el: HTMLElement) {
  el.innerHTML = createHtmlFragment('<p/>', { policy: 'sanitized-html' });
}
export function inner(el: HTMLElement) {
  el.innerHTML = userInput;
}`,
    );
    const findings = scanConsumerAppSource(dir);
    expect(findings.filter((f) => f.rule === 'consumer.unguarded-html-sink')).toEqual([
      expect.objectContaining({ file: 'src/mixed.ts', line: 6 }),
    ]);
  });

  test('multiline guarded assignment is not false-positived', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'multiline-safe.ts'),
      `import { createHtmlFragment } from '@liteship/web';
export function safe(el: HTMLElement, x: string) {
  el.innerHTML =
    createHtmlFragment(x);
}`,
    );
    writeFileSync(
      join(dir, 'src', 'multiline-unsafe.ts'),
      `export function unsafe(el: HTMLElement, userInput: string) {
  el.innerHTML =
    userInput;
}`,
    );
    const findings = scanConsumerAppSource(dir);
    expect(findings.filter((f) => f.rule === 'consumer.unguarded-html-sink').map((f) => f.file)).toEqual([
      'src/multiline-unsafe.ts',
    ]);
  });

  test('CRLF line endings do not false-positive multiline guarded innerHTML', () => {
    const dir = mkdtempSync(join(tmpdir(), 'liteship-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'crlf-safe.ts'),
      [
        "import { createHtmlFragment } from '@liteship/web';",
        'export function safe(el: HTMLElement, x: string) {',
        '  el.innerHTML =',
        '    createHtmlFragment(x);',
        '}',
      ].join('\r\n'),
    );
    writeFileSync(
      join(dir, 'src', 'crlf-unsafe.ts'),
      ['export function unsafe(el: HTMLElement, userInput: string) {', '  el.innerHTML =', '    userInput;', '}'].join(
        '\r\n',
      ),
    );
    const findings = scanConsumerAppSource(dir);
    expect(findings.filter((f) => f.rule === 'consumer.unguarded-html-sink').map((f) => f.file)).toEqual([
      'src/crlf-unsafe.ts',
    ]);
  });
});
