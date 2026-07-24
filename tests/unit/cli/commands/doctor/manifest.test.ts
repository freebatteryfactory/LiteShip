/**
 * doctor/manifest — the read-only filesystem readers. Every function here is
 * a pure read that speaks the {@link Readout} vocabulary so a corrupt file is
 * reported (`unreadable`), never collapsed into `absent`. Tests run against
 * synthetic temp fixtures — a crafted package.json / installed manifest /
 * astro+wrangler config — never the live environment, for determinism.
 *
 * THE LAWS:
 *  - the absent/ok/unreadable trichotomy is honored: a missing file is
 *    `absent`, a present-but-corrupt file is `unreadable`, never conflated.
 *  - loadEngineMinima/loadBuiltPackages degrade to safe defaults / empty,
 *    never throw, on a missing or malformed root manifest.
 *  - hasDep checks declared deps first, then falls back to the installed
 *    node_modules manifest.
 *  - findWorkspaceRoot walks up to the pnpm-workspace.yaml marker, else
 *    returns `start`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import {
  findAstroConfig,
  findWorkspaceRoot,
  hasDep,
  loadBuiltPackages,
  loadEngineMinima,
  readCwdPackageJson,
  readInstalledVersion,
  readWranglerConfig,
} from '../../../../../packages/cli/src/commands/doctor/manifest.js';

const tmps: string[] = [];
function mkTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-doctor-manifest-'));
  tmps.push(dir);
  return dir;
}
afterEach(() => {
  while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
});

function writePkg(dir: string, pkg: unknown): void {
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify(pkg));
}

function writeInstalled(dir: string, name: string, manifest: string): void {
  const pkgDir = resolve(dir, 'node_modules', name);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(resolve(pkgDir, 'package.json'), manifest);
}

describe('doctor/manifest — findWorkspaceRoot()', () => {
  it('walks up to the directory holding pnpm-workspace.yaml', () => {
    const root = mkTmp();
    writeFileSync(resolve(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    const sub = resolve(root, 'packages', 'core');
    mkdirSync(sub, { recursive: true });
    expect(findWorkspaceRoot(sub)).toBe(root);
  });

  it('returns `start` unchanged when no marker exists above it', () => {
    const lone = mkTmp();
    // Tmpdir has no ancestor pnpm-workspace.yaml on a clean runner; the walk
    // hits the filesystem root and returns start.
    expect(findWorkspaceRoot(lone)).toBe(lone);
  });
});

describe('doctor/manifest — loadEngineMinima()', () => {
  it('returns the declared engine majors', () => {
    const dir = mkTmp();
    writePkg(dir, { name: 'x', engines: { node: '>=24', pnpm: '^11.0.0' } });
    expect(loadEngineMinima(dir)).toEqual({ node: 24, pnpm: 11 });
  });

  it('falls back to safe defaults when package.json is absent', () => {
    expect(loadEngineMinima(mkTmp())).toEqual({ node: 22, pnpm: 10 });
  });

  it('falls back to defaults when engines are partially/un-declared', () => {
    const dir = mkTmp();
    writePkg(dir, { name: 'x', engines: { node: '>=25' } });
    expect(loadEngineMinima(dir)).toEqual({ node: 25, pnpm: 10 });
  });

  it('falls back to defaults (no throw) on a corrupt manifest', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), '{ not json');
    expect(loadEngineMinima(dir)).toEqual({ node: 22, pnpm: 10 });
  });
});

describe('doctor/manifest — loadBuiltPackages()', () => {
  it('extracts the package list out of the root tsconfig references', () => {
    const dir = mkTmp();
    writeFileSync(
      resolve(dir, 'tsconfig.json'),
      JSON.stringify({
        references: [{ path: './packages/core' }, { path: './packages/cli' }, { path: './packages/edge' }],
      }),
    );
    expect(loadBuiltPackages(dir)).toEqual(['core', 'cli', 'edge']);
  });

  it('returns [] when tsconfig.json is absent', () => {
    expect(loadBuiltPackages(mkTmp())).toEqual([]);
  });

  it('returns [] when there are no references', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));
    expect(loadBuiltPackages(dir)).toEqual([]);
  });

  it('counts only ./packages/<name> references (ignores tools/, external, and nested paths)', () => {
    const dir = mkTmp();
    writeFileSync(
      resolve(dir, 'tsconfig.json'),
      JSON.stringify({
        references: [{ path: './packages/core' }, { path: './tools/foo' }, { path: '../other' }],
      }),
    );
    expect(loadBuiltPackages(dir)).toEqual(['core']);
  });
});

describe('doctor/manifest — readCwdPackageJson()', () => {
  it('returns ok with the parsed manifest', () => {
    const dir = mkTmp();
    writePkg(dir, { name: 'app', version: '1.0.0' });
    const r = readCwdPackageJson(dir);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.value['name']).toBe('app');
  });

  it('returns absent when no package.json exists', () => {
    expect(readCwdPackageJson(mkTmp())).toEqual({ kind: 'absent' });
  });

  it('returns unreadable (with the parse error) on a corrupt manifest', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), '{ bad json');
    const r = readCwdPackageJson(dir);
    expect(r.kind).toBe('unreadable');
    if (r.kind === 'unreadable') expect(r.detail.length).toBeGreaterThan(0);
  });
});

describe('doctor/manifest — readInstalledVersion()', () => {
  it('returns ok with the installed version', () => {
    const dir = mkTmp();
    writeInstalled(dir, 'astro', JSON.stringify({ version: '6.0.5' }));
    expect(readInstalledVersion(dir, 'astro')).toEqual({ kind: 'ok', value: '6.0.5' });
  });

  it('resolves a scoped package path', () => {
    const dir = mkTmp();
    writeInstalled(dir, '@astrojs/cloudflare', JSON.stringify({ version: '13.1.0' }));
    expect(readInstalledVersion(dir, '@astrojs/cloudflare')).toEqual({ kind: 'ok', value: '13.1.0' });
  });

  it('returns absent when the package is not in node_modules', () => {
    expect(readInstalledVersion(mkTmp(), 'astro')).toEqual({ kind: 'absent' });
  });

  it('returns absent when the installed manifest has no version field', () => {
    const dir = mkTmp();
    writeInstalled(dir, 'astro', JSON.stringify({ name: 'astro' }));
    expect(readInstalledVersion(dir, 'astro')).toEqual({ kind: 'absent' });
  });

  it('returns unreadable on a corrupt installed manifest', () => {
    const dir = mkTmp();
    writeInstalled(dir, 'astro', '<<not json>>');
    const r = readInstalledVersion(dir, 'astro');
    expect(r.kind).toBe('unreadable');
  });
});

describe('doctor/manifest — hasDep()', () => {
  it('true when declared in dependencies', () => {
    expect(hasDep({ dependencies: { astro: '^6' } }, mkTmp(), 'astro')).toBe(true);
  });

  it('true when declared in devDependencies', () => {
    expect(hasDep({ devDependencies: { wrangler: '^4' } }, mkTmp(), 'wrangler')).toBe(true);
  });

  it('falls back to the installed manifest when not declared (line 96 path)', () => {
    const dir = mkTmp();
    writeInstalled(dir, 'astro', JSON.stringify({ version: '6.0.0' }));
    // Not declared in the manifest, but present in node_modules.
    expect(hasDep({}, dir, 'astro')).toBe(true);
  });

  it('false when neither declared nor installed', () => {
    expect(hasDep({}, mkTmp(), 'astro')).toBe(false);
  });

  it('handles a null manifest by checking node_modules only', () => {
    const dir = mkTmp();
    writeInstalled(dir, 'astro', JSON.stringify({ version: '6.0.0' }));
    expect(hasDep(null, dir, 'astro')).toBe(true);
    expect(hasDep(null, mkTmp(), 'astro')).toBe(false);
  });
});

describe('doctor/manifest — findAstroConfig()', () => {
  it('finds the first present astro.config.* by precedence (line 104 path)', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'astro.config.ts'), 'export default {};');
    expect(findAstroConfig(dir)).toBe(resolve(dir, 'astro.config.ts'));
  });

  it('prefers astro.config.mjs over the other extensions', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'astro.config.mjs'), 'export default {};');
    writeFileSync(resolve(dir, 'astro.config.ts'), 'export default {};');
    expect(findAstroConfig(dir)).toBe(resolve(dir, 'astro.config.mjs'));
  });

  it('returns null when no astro config exists', () => {
    expect(findAstroConfig(mkTmp())).toBeNull();
  });
});

describe('doctor/manifest — readWranglerConfig()', () => {
  it('reads the first present wrangler config by precedence (line 114 path)', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'wrangler.toml'), 'name = "app"\n');
    const r = readWranglerConfig(dir);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.value).toContain('name = "app"');
  });

  it('prefers wrangler.jsonc over .json and .toml', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'wrangler.jsonc'), '{ "name": "jsonc" }');
    writeFileSync(resolve(dir, 'wrangler.toml'), 'name = "toml"\n');
    const r = readWranglerConfig(dir);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.value).toContain('jsonc');
  });

  it('returns absent when no wrangler config exists', () => {
    expect(readWranglerConfig(mkTmp())).toEqual({ kind: 'absent' });
  });
});
