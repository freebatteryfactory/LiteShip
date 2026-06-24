/**
 * Generator-provenance by CONTENT-HASH (B3) — unit proof for the provenance
 * primitives that bind a generated capsule artifact to its SOURCE + the
 * GENERATOR LOGIC, mtime-independently.
 *
 * The LAWS pinned here:
 *  - `sourceProvenanceDigest` is a deterministic, content-only function: identical
 *    bytes at the same path ⇒ identical digest, regardless of mtime; a one-byte
 *    source change ⇒ a different digest (the mtime suspicion's content-hash
 *    replacement — immune to the git-checkout / skip-if-unchanged mtime bug).
 *  - `generatorVersionDigest` changes when ANY generator-logic source changes
 *    (the toolchain-digest analogue), even when capsule sources are byte-identical.
 *  - `GENERATOR_SOURCE_FILES` enumerates the WHOLE generator: every listed file
 *    exists, and every live harness arm is enrolled — a NEW harness arm that
 *    escapes generator-version invalidation fails RED here.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  GENERATOR_SOURCE_FILES,
  sourceProvenanceDigest,
  generatorVersionDigest,
} from '@czap/command/host';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

/** Materialize a throwaway repo-shaped root with the given relative files. */
function scratchRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-provenance-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

describe('sourceProvenanceDigest (content-hash, mtime-independent)', () => {
  it('is deterministic for identical bytes at the same path', () => {
    const root = scratchRoot({ 'pkg/src/x.ts': 'export const x = 1;\n' });
    try {
      const a = sourceProvenanceDigest(root, 'pkg/src/x.ts');
      const b = sourceProvenanceDigest(root, 'pkg/src/x.ts');
      expect(a).toBe(b);
      expect(a).toMatch(/^blake3:[0-9a-f]{64}$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('changes on a one-byte source edit (the staleness signal)', () => {
    const root = scratchRoot({ 'pkg/src/x.ts': 'export const x = 1;\n' });
    try {
      const before = sourceProvenanceDigest(root, 'pkg/src/x.ts');
      writeFileSync(join(root, 'pkg/src/x.ts'), 'export const x = 2;\n', 'utf8');
      const after = sourceProvenanceDigest(root, 'pkg/src/x.ts');
      expect(after).not.toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('is mtime-independent: same bytes rewritten with a future mtime keep the digest', () => {
    const root = scratchRoot({ 'pkg/src/x.ts': 'export const x = 1;\n' });
    try {
      const before = sourceProvenanceDigest(root, 'pkg/src/x.ts');
      // Re-write the SAME bytes (advances mtime) — the content-hash must not move,
      // unlike the former `sourceAge > testAge` suspicion which this replaces.
      writeFileSync(join(root, 'pkg/src/x.ts'), 'export const x = 1;\n', 'utf8');
      const after = sourceProvenanceDigest(root, 'pkg/src/x.ts');
      expect(after).toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('binds the path: identical bytes at different paths mint distinct digests', () => {
    const root = scratchRoot({
      'pkg/src/a.ts': 'export const x = 1;\n',
      'pkg/src/b.ts': 'export const x = 1;\n',
    });
    try {
      expect(sourceProvenanceDigest(root, 'pkg/src/a.ts')).not.toBe(
        sourceProvenanceDigest(root, 'pkg/src/b.ts'),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('generatorVersionDigest (generator-logic content-hash)', () => {
  // Copy the live generator source set into a scratch root so we can mutate a
  // generator file without touching the real repo.
  function generatorScratch(): string {
    const root = mkdtempSync(join(tmpdir(), 'czap-genver-'));
    for (const rel of GENERATOR_SOURCE_FILES) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      cpSync(join(REPO_ROOT, rel), abs);
    }
    return root;
  }

  it('matches the live repo digest when the generator set is copied byte-for-byte', () => {
    const root = generatorScratch();
    try {
      expect(generatorVersionDigest(root)).toBe(generatorVersionDigest(REPO_ROOT));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('changes when a generator-logic source changes (capsule sources byte-identical)', () => {
    const root = generatorScratch();
    try {
      const before = generatorVersionDigest(root);
      const harness = join(root, 'packages/core/src/harness/pure-transform.ts');
      writeFileSync(harness, `// generator-logic edit\n${'x'}`, 'utf8');
      expect(generatorVersionDigest(root)).not.toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('GENERATOR_SOURCE_FILES enrolls the WHOLE generator', () => {
  it('every listed generator file exists in the repo', () => {
    for (const rel of GENERATOR_SOURCE_FILES) {
      // Reading via the digest fn throws if any file is missing — assert no throw.
      expect(() => sourceProvenanceDigest(REPO_ROOT, rel)).not.toThrow();
    }
  });

  it('every live harness generator arm is enrolled (a new arm cannot escape invalidation)', () => {
    const harnessDir = resolve(REPO_ROOT, 'packages/core/src/harness');
    const liveArms = readdirSync(harnessDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
      .map((f) => `packages/core/src/harness/${f}`);
    const enrolled = new Set(GENERATOR_SOURCE_FILES);
    const missing = liveArms.filter((arm) => !enrolled.has(arm));
    expect(
      missing,
      `harness module(s) not enrolled in GENERATOR_SOURCE_FILES — a generator-logic ` +
        `change to these would NOT invalidate the corpus generatorVersion: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
