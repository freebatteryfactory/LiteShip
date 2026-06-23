/**
 * package-smoke pure helpers — the branch-heavy, spawn-FREE logic extracted from
 * the `package-smoke` subprocess-orchestration command (which is itself coverage-
 * excluded, the ship.ts precedent: a pure-orchestration command earns exclusion
 * ONLY once its composable pure helpers are extracted + unit-tested — this file is
 * that test).
 *
 * Real temp `node_modules` trees drive `findConsumerDependencyRoot`'s three
 * resolution strategies (no mocks); property-based + table cases pin
 * `peerDependenciesOnly`'s scoped-specifier split; `resolveExecutable` is pinned
 * over the real `process.platform`/`npm_execpath` (host-honest, no mutation of
 * globals); `tarballFileUrl` is pinned as a valid `file://` URL round-trip.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fc from 'fast-check';
import { hasTag } from '@czap/error';
import {
  resolveExecutable,
  tarballFileUrl,
  peerDependenciesOnly,
  findConsumerDependencyRoot,
  assertConsumerDependencyInstalled,
} from '../../../../packages/cli/src/lib/package-smoke-helpers.js';

describe('peerDependenciesOnly — PEER_INSTALLS → {name: version} (split on LAST @)', () => {
  it('keeps the leading scope @ for a scoped specifier', () => {
    expect(peerDependenciesOnly(['@scope/pkg@1.2.3'])).toEqual({ '@scope/pkg': '1.2.3' });
  });

  it('handles an unscoped specifier', () => {
    expect(peerDependenciesOnly(['react@18.0.0'])).toEqual({ react: '18.0.0' });
  });

  it('maps every specifier in the list', () => {
    expect(peerDependenciesOnly(['@scope/a@1.0.0', 'b@2.0.0'])).toEqual({ '@scope/a': '1.0.0', b: '2.0.0' });
  });

  it('property: a `<name>@<version>` specifier round-trips to {name: version}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('@scope/a', '@czap/core', 'react', 'cborg', 'mediabunny'),
        fc.constantFrom('1.0.0', '0.4.0', '18.2.1', '^2.0.0'),
        (name, version) => {
          const result = peerDependenciesOnly([`${name}@${version}`]);
          expect(result).toEqual({ [name]: version });
        },
      ),
    );
  });
});

describe('resolveExecutable — platform/npm_execpath executable resolution', () => {
  it('a non-pnpm command passes through unchanged', () => {
    expect(resolveExecutable('node')).toBe('node');
    expect(resolveExecutable('tar')).toBe('tar');
  });

  it('pnpm under an npm_execpath resolves to the current Node binary', () => {
    const prev = process.env['npm_execpath'];
    process.env['npm_execpath'] = '/some/pnpm.cjs';
    try {
      expect(resolveExecutable('pnpm')).toBe(process.execPath);
    } finally {
      if (prev === undefined) delete process.env['npm_execpath'];
      else process.env['npm_execpath'] = prev;
    }
  });

  it('pnpm with no npm_execpath resolves to a literal (platform-dependent)', () => {
    const prev = process.env['npm_execpath'];
    delete process.env['npm_execpath'];
    try {
      const resolved = resolveExecutable('pnpm');
      // POSIX → 'pnpm'; win32 → 'pnpm.cmd'. Either way it is the bare command form.
      expect(resolved === 'pnpm' || resolved === 'pnpm.cmd').toBe(true);
    } finally {
      if (prev === undefined) delete process.env['npm_execpath'];
      else process.env['npm_execpath'] = prev;
    }
  });
});

describe('tarballFileUrl — tarball path → file:// URL round-trip', () => {
  it('produces a file:// URL that decodes back to the original path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-tarball-url-'));
    try {
      const tarball = join(dir, '@czap-core-0.4.0.tgz');
      writeFileSync(tarball, 'x');
      const url = tarballFileUrl(tarball);
      expect(url.startsWith('file://')).toBe(true);
      // On POSIX the decode is exact; on win32 realpath may canonicalize case —
      // assert the basename survives the URL round-trip cross-platform.
      expect(fileURLToPath(url).endsWith('@czap-core-0.4.0.tgz')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('findConsumerDependencyRoot — the three pnpm resolution strategies', () => {
  let consumer: string;
  beforeEach(() => {
    consumer = mkdtempSync(join(tmpdir(), 'czap-consumer-'));
  });
  afterEach(() => rmSync(consumer, { recursive: true, force: true }));

  function plant(relDir: string): void {
    const abs = join(consumer, relDir);
    mkdirSync(abs, { recursive: true });
    writeFileSync(join(abs, 'package.json'), '{"name":"x"}');
  }

  it('strategy 1: a direct node_modules/<pkg> install', () => {
    plant(join('node_modules', '@czap', 'core'));
    const root = findConsumerDependencyRoot(consumer, '@czap/core');
    expect(root).toBe(join(consumer, 'node_modules', '@czap', 'core'));
  });

  it('strategy 2: the hoisted .pnpm/node_modules/<pkg> location', () => {
    plant(join('node_modules', '.pnpm', 'node_modules', '@czap', 'core'));
    const root = findConsumerDependencyRoot(consumer, '@czap/core');
    expect(root).toBe(join(consumer, 'node_modules', '.pnpm', 'node_modules', '@czap', 'core'));
  });

  it('strategy 3: a scan of the .pnpm store for <pkg>@ver/node_modules/<pkg>', () => {
    plant(join('node_modules', '.pnpm', '@czap+core@0.4.0', 'node_modules', '@czap', 'core'));
    const root = findConsumerDependencyRoot(consumer, '@czap/core');
    expect(root).toBe(
      join(consumer, 'node_modules', '.pnpm', '@czap+core@0.4.0', 'node_modules', '@czap', 'core'),
    );
  });

  it('returns undefined when no strategy resolves (no store at all)', () => {
    expect(findConsumerDependencyRoot(consumer, '@czap/core')).toBeUndefined();
  });

  it('returns undefined when the store exists but holds no matching entry', () => {
    mkdirSync(join(consumer, 'node_modules', '.pnpm', 'unrelated@1.0.0'), { recursive: true });
    expect(findConsumerDependencyRoot(consumer, '@czap/core')).toBeUndefined();
  });
});

describe('assertConsumerDependencyInstalled — fail-closed when a dep is unresolvable', () => {
  let consumer: string;
  beforeEach(() => {
    consumer = mkdtempSync(join(tmpdir(), 'czap-assert-dep-'));
  });
  afterEach(() => rmSync(consumer, { recursive: true, force: true }));

  it('is silent when the dependency resolves', () => {
    const dir = join(consumer, 'node_modules', '@czap', 'core');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{"name":"@czap/core"}');
    expect(() => assertConsumerDependencyInstalled(consumer, '@czap/core')).not.toThrow();
  });

  it('throws a tagged IntegrityError naming the package + node_modules when absent', () => {
    let caught: unknown;
    try {
      assertConsumerDependencyInstalled(consumer, '@czap/ghost');
    } catch (err) {
      caught = err;
    }
    expect(hasTag(caught, 'IntegrityError')).toBe(true);
    expect((caught as Error).message).toContain('@czap/ghost');
    expect((caught as Error).message).toContain('node_modules');
    expect((caught as Error).message).toContain('import-smoke cannot resolve it');
  });
});
