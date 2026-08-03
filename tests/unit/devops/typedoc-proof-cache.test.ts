import { describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assertCompleteTypeDocProjection,
  createTypeDocProofIdentity,
  digestTypeDocOutput,
  readTypeDocProofReceipt,
  TYPEDOC_COMPLETENESS_FLOOR,
  TYPEDOC_TOOLCHAIN_PATHS,
  writeTypeDocProofReceipt,
} from '../../../scripts/lib/typedoc-proof-cache.js';

const digest = (char: string): `sha256:${string}` => `sha256:${char.repeat(64)}`;

describe('TypeDoc proof cache', () => {
  test('the toolchain identity covers the pipeline AND its direct execution dependencies', () => {
    // The pipeline executes native-tsc through the shared spawn helper; a change
    // to either can alter emitted declarations or process behavior, so both must
    // invalidate cached TypeDoc evidence alongside the pipeline file itself.
    expect(TYPEDOC_TOOLCHAIN_PATHS).toContain('scripts/lib/typedoc-build-pipeline.ts');
    expect(TYPEDOC_TOOLCHAIN_PATHS).toContain('scripts/native-tsc.ts');
    expect(TYPEDOC_TOOLCHAIN_PATHS).toContain('scripts/lib/spawn.ts');
  });

  test('serves only the exact content-addressed identity', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-typedoc-proof-'));
    try {
      const identity = createTypeDocProofIdentity({
        inputDigest: digest('a'),
        outputDigest: digest('b'),
        toolchainDigest: digest('c'),
        environment: 'win32/x64/node-v22',
      });
      expect(readTypeDocProofReceipt(root, identity)).toBeNull();
      expect(writeTypeDocProofReceipt(root, identity)).toMatchObject({ status: 'passed', ...identity });
      expect(readTypeDocProofReceipt(root, identity)).toMatchObject({ status: 'passed', ...identity });

      const changedOutput = createTypeDocProofIdentity({
        ...identity,
        outputDigest: digest('d'),
      });
      expect(readTypeDocProofReceipt(root, changedOutput)).toBeNull();
      const changedToolchain = createTypeDocProofIdentity({
        ...identity,
        toolchainDigest: digest('e'),
      });
      expect(readTypeDocProofReceipt(root, changedToolchain)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a malformed or forged receipt is a miss', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-typedoc-proof-'));
    try {
      const identity = createTypeDocProofIdentity({
        inputDigest: digest('a'),
        outputDigest: digest('b'),
        toolchainDigest: digest('c'),
        environment: 'linux/x64/node-v22',
      });
      writeTypeDocProofReceipt(root, identity);
      const cacheDir = resolve(root, '.liteship', 'cache', 'typedoc');
      const path = resolve(cacheDir, readdirSync(cacheDir)[0]!);
      writeFileSync(path, '{not json', 'utf8');
      expect(readTypeDocProofReceipt(root, identity)).toBeNull();
      writeFileSync(path, JSON.stringify({ ...identity, status: 'failed' }), 'utf8');
      expect(readTypeDocProofReceipt(root, identity)).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('the output digest binds paths and exact bytes', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-typedoc-output-'));
    try {
      const output = resolve(root, 'docs', 'api');
      mkdirSync(resolve(output, 'nested'), { recursive: true });
      writeFileSync(resolve(output, 'index.md'), '# API\n', 'utf8');
      writeFileSync(resolve(output, 'nested', 'item.md'), 'one\n', 'utf8');
      const before = digestTypeDocOutput(root);
      writeFileSync(resolve(output, 'nested', 'item.md'), 'two\n', 'utf8');
      expect(digestTypeDocOutput(root)).not.toBe(before);
      expect(readFileSync(resolve(output, 'index.md'), 'utf8')).toBe('# API\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('refuses empty and OOM-shaped partial projections without rejecting a complete refresh', () => {
    expect(() => assertCompleteTypeDocProjection(4000, 4000)).not.toThrow();
    expect(() => assertCompleteTypeDocProjection(4000, 3600)).not.toThrow();
    expect(() => assertCompleteTypeDocProjection(4000, 3599)).toThrow(/did not finish/);
    expect(() => assertCompleteTypeDocProjection(0, 0)).toThrow(/did not finish/);
    expect(() => assertCompleteTypeDocProjection(0, TYPEDOC_COMPLETENESS_FLOOR - 1)).toThrow(/completeness floor/);
    expect(() => assertCompleteTypeDocProjection(0, TYPEDOC_COMPLETENESS_FLOOR)).not.toThrow();
  });
});
