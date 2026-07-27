import { describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assertTypeDocInputFingerprint,
  buildTypeDocInputFingerprint,
  fingerprintTypeDocInputs,
  projectTypeDocSource,
  writeTypeDocInputFingerprint,
} from '../../../scripts/lib/typedoc-input-fingerprint.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const digest = (content: string): string =>
  fingerprintTypeDocInputs([{ path: 'packages/demo/src/index.ts', content }]).digest;

describe('TypeDoc input fingerprint', () => {
  test('is deterministic across input ordering and line-ending spelling', () => {
    const left = fingerprintTypeDocInputs([
      { path: 'b.ts', content: '/** B */\r\nexport interface B { value: string }\r\n' },
      { path: 'a.ts', content: '/** A */\r\nexport const a: number = 1;\r\n' },
    ]);
    const right = fingerprintTypeDocInputs([
      { path: 'a.ts', content: '/** A */\nexport const a: number = 1;\n' },
      { path: 'b.ts', content: '/** B */\nexport interface B { value: string }\n' },
    ]);
    expect(left).toEqual(right);
  });

  test('ignores ordinary body edits when an explicit return contract makes TypeDoc output stable', () => {
    const before = '/** Public. */\nexport function answer(): number { return 1; }\n';
    const after = '/** Public. */\nexport function answer(): number { return 2 + 2; }\n';
    expect(digest(before)).toBe(digest(after));
  });

  test('detects TSDoc, signature, inferred-return, and source-link line drift', () => {
    const base = '/** Public. */\nexport function answer(): number { return 1; }\n';
    expect(digest(base.replace('Public.', 'Changed.'))).not.toBe(digest(base));
    expect(digest(base.replace(': number', ': string'))).not.toBe(digest(base));
    expect(digest('export function answer() { return 1; }\n')).not.toBe(
      digest('export function answer() { return "one"; }\n'),
    );
    expect(digest(`\n${base}`)).not.toBe(digest(base));
  });

  test('projects only exported top-level declarations while retaining public member contracts', () => {
    const projection = projectTypeDocSource(
      'demo.ts',
      'const privateValue = 1;\n/** API */\nexport class API { method(): string { return "x"; } }\n',
    );
    expect(projection).toContain('export class API');
    expect(projection).toContain('method(): string');
    expect(projection).not.toContain('privateValue');
    expect(projection).not.toContain('return "x"');
  });

  test('committed generated docs carry the current cheap input fingerprint', () => {
    expect(() => assertTypeDocInputFingerprint(REPO)).not.toThrow();
  });

  test('refuses missing and stale committed fingerprints', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-typedoc-fingerprint-'));
    try {
      mkdirSync(resolve(root, 'packages', 'demo', 'src'), { recursive: true });
      writeFileSync(
        resolve(root, 'typedoc.json'),
        `${JSON.stringify({ entryPoints: ['packages/demo/src/index.ts'] })}\n`,
      );
      writeFileSync(resolve(root, 'packages', 'demo', 'src', 'index.ts'), '/** Public. */\nexport const value = 1;\n');

      expect(() => assertTypeDocInputFingerprint(root)).toThrow(/missing .*typedoc-input-fingerprint/);

      mkdirSync(resolve(root, 'docs', 'api'), { recursive: true });
      writeFileSync(
        resolve(root, 'docs', 'api', '.typedoc-input-fingerprint.json'),
        '{"schemaVersion":1,"algorithm":"sha256","digest":"sha256:stale","inputCount":0}\n',
      );
      expect(() => assertTypeDocInputFingerprint(root)).toThrow(/is stale/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('addresses the TypeDoc, TSDoc, and configured README inputs that shape generated API docs', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-typedoc-config-'));
    try {
      mkdirSync(resolve(root, 'packages', 'demo', 'src'), { recursive: true });
      writeFileSync(
        resolve(root, 'typedoc.json'),
        `${JSON.stringify({ entryPoints: ['packages/demo/src/index.ts'], readme: 'TYPEDOC.md' })}\n`,
      );
      writeFileSync(resolve(root, 'tsdoc.json'), '{"tagDefinitions":[]}\n');
      writeFileSync(resolve(root, 'tsconfig.json'), '{"extends":"./tsconfig.base.json"}\n');
      writeFileSync(resolve(root, 'tsconfig.base.json'), '{"compilerOptions":{"strict":true}}\n');
      writeFileSync(resolve(root, 'TYPEDOC.md'), '# API\n');
      writeFileSync(resolve(root, 'packages', 'demo', 'src', 'index.ts'), '/** Public. */\nexport const value = 1;\n');

      const original = buildTypeDocInputFingerprint(root);
      mkdirSync(resolve(root, 'docs', 'api'), { recursive: true });
      writeTypeDocInputFingerprint(root);
      expect(() => assertTypeDocInputFingerprint(root)).not.toThrow();
      writeFileSync(resolve(root, 'tsdoc.json'), '{"tagDefinitions":[{"tagName":"@example"}]}\n');
      expect(buildTypeDocInputFingerprint(root).digest).not.toBe(original.digest);
      expect(() => assertTypeDocInputFingerprint(root)).toThrow(/is stale/);

      writeFileSync(resolve(root, 'tsdoc.json'), '{"tagDefinitions":[]}\n');
      writeFileSync(resolve(root, 'TYPEDOC.md'), '# Changed API\n');
      expect(buildTypeDocInputFingerprint(root).digest).not.toBe(original.digest);

      writeFileSync(resolve(root, 'TYPEDOC.md'), '# API\n');
      writeFileSync(resolve(root, 'tsconfig.base.json'), '{"compilerOptions":{"strict":false}}\n');
      expect(buildTypeDocInputFingerprint(root).digest).not.toBe(original.digest);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('scopes directory entry points to the declared tree, independent of warm sibling artifacts', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-typedoc-directory-entry-'));
    try {
      mkdirSync(resolve(root, 'packages', 'demo', 'src'), { recursive: true });
      mkdirSync(resolve(root, 'packages', 'demo', 'dist'), { recursive: true });
      mkdirSync(resolve(root, 'packages', 'demo', 'node_modules', 'warm-only'), { recursive: true });
      writeFileSync(
        resolve(root, 'typedoc.json'),
        `${JSON.stringify({ entryPoints: ['packages/demo/src'], entryPointStrategy: 'expand' })}\n`,
      );
      writeFileSync(resolve(root, 'packages', 'demo', 'src', 'index.ts'), '/** Public. */\nexport const value = 1;\n');

      const cold = buildTypeDocInputFingerprint(root);
      writeFileSync(resolve(root, 'packages', 'demo', 'dist', 'index.d.ts'), 'export declare const stale: true;\n');
      writeFileSync(
        resolve(root, 'packages', 'demo', 'node_modules', 'warm-only', 'index.d.ts'),
        'export declare const leaked: true;\n',
      );

      expect(buildTypeDocInputFingerprint(root)).toEqual(cold);
      expect(cold.inputCount).toBe(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
