import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { scanConsumerAppSource } from '../../../packages/cli/src/lib/consumer-app-audit.js';

describe('consumer-app audit (#117)', () => {
  test('flags raw Request passed to resolveInitialState', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'page.astro'),
      `---
import { resolveInitialState } from '@czap/astro';
const state = resolveInitialState(context.request);
---`,
    );
    const findings = scanConsumerAppSource(dir);
    expect(findings.some((f) => f.rule === 'consumer.raw-request-resolve')).toBe(true);
  });

  test('flags unguarded innerHTML even when createHtmlFragment exists elsewhere in the file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-consumer-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'safe.ts'),
      `import { createHtmlFragment } from '@czap/web';
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
});
