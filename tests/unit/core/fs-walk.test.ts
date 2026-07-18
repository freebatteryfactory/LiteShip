/**
 * fs-walk owner pins — the Node-only recursive walker that subsumes the ~15
 * hand-rolled `readdirSync` walkers ([DUP] Wave 7): skip-dirs, suffix/extension
 * filters, deterministic name-sorted ordering, absolute returns, and
 * symlink-cycle safety (a self-referencing link must terminate, never loop).
 *
 * Imports through the NEW `@czap/core/fs-walk` subpath — the Node-only leaf is
 * deliberately absent from the browser-safe main index.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { walkFiles } from '@czap/core/fs-walk';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'czap-fs-walk-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write `content` to `root/rel`, creating parent directories. */
function file(rel: string, content = ''): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

/** The walk result as sorted, root-relative POSIX ids (stable for assertions). */
function relIds(paths: readonly string[]): string[] {
  return paths.map((p) => relative(root, p).replace(/\\/g, '/'));
}

describe('walkFiles — filters + ordering', () => {
  it('prunes skip-dirs (array or Set form) and returns everything else', () => {
    file('a.ts');
    file('node_modules/x.ts');
    file('src/b.ts');

    expect(relIds(walkFiles(root, { skipDirs: ['node_modules'] }))).toEqual(['a.ts', 'src/b.ts']);
    expect(relIds(walkFiles(root, { skipDirs: new Set(['node_modules']) }))).toEqual(['a.ts', 'src/b.ts']);
  });

  it('keeps only files matching a suffix filter', () => {
    file('foo.test.ts');
    file('bar.ts');
    file('baz.test.ts');
    file('qux.js');

    expect(relIds(walkFiles(root, { suffixes: ['.test.ts'] }))).toEqual(['baz.test.ts', 'foo.test.ts']);
  });

  it('keeps only files matching an extension filter (leading dot optional)', () => {
    file('bar.ts');
    file('baz.test.ts');
    file('qux.js');

    expect(relIds(walkFiles(root, { extensions: ['ts'] }))).toEqual(['bar.ts', 'baz.test.ts']);
    expect(relIds(walkFiles(root, { extensions: ['.js'] }))).toEqual(['qux.js']);
  });

  it('returns absolute paths in a deterministic, name-sorted depth-first order', () => {
    file('z.ts');
    file('a.ts');
    file('m/c.ts');

    const result = walkFiles(root);
    expect(result.every((p) => isAbsolute(p))).toBe(true);
    // Entries visited name-sorted at each level: a.ts < m (descend → c.ts) < z.ts.
    expect(relIds(result)).toEqual(['a.ts', 'm/c.ts', 'z.ts']);
    // Re-walking is byte-stable.
    expect(walkFiles(root)).toEqual(result);
  });

  it('walks every file when no filter is given and skips an unreadable/empty subtree gracefully', () => {
    file('one.ts');
    mkdirSync(join(root, 'empty-dir'), { recursive: true });
    expect(relIds(walkFiles(root))).toEqual(['one.ts']);
  });
});

describe('walkFiles — symlink handling', () => {
  it('does not follow symlinked directories by default', () => {
    file('self/f.ts');
    symlinkSync(join(root, 'self'), join(root, 'self', 'loop'), 'dir');

    // Default (followSymlinks: false): the link is skipped, f.ts collected once.
    expect(relIds(walkFiles(root))).toEqual(['self/f.ts']);
  });

  it('is cycle-safe when following a self-referencing symlink (must not infinite-loop)', () => {
    file('self/f.ts');
    // self/loop -> self : a directory symlink pointing back at its own parent.
    symlinkSync(join(root, 'self'), join(root, 'self', 'loop'), 'dir');

    // The realpath visited-set collapses the cycle: the walk terminates and f.ts
    // is collected exactly once instead of recursing forever.
    const result = relIds(walkFiles(root, { followSymlinks: true }));
    expect(result).toEqual(['self/f.ts']);
  });
});
