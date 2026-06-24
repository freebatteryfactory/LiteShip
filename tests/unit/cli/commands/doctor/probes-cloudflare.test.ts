/**
 * doctor/probes-cloudflare — the host-focused `--target cloudflare` probes
 * plus the `liteship.pnpm` consumer-context probe. Each probe reads synthetic
 * temp fixtures (a crafted package.json / installed manifest / wrangler +
 * astro config) and the one spawn-bearing probe (`probeCloudflareWrangler`)
 * has its subprocess injected. No live environment, no real network.
 *
 * THE LAWS (per probe — the absent/declared/installed/version ladder):
 *  - astro: missing ⇒ fail; declared-but-unresolved ⇒ warn; < 6 ⇒ fail;
 *    >= 6 ⇒ ok; corrupt manifest ⇒ warn-unreadable (never a bogus missing).
 *  - adapter: missing ⇒ fail; < 13 ⇒ warn; >= 13 ⇒ ok.
 *  - wrangler: CLI version wins over the installed pkg version; a timeout ⇒
 *    warn; absent both ⇒ warn; < 4 ⇒ warn.
 *  - config: absent ⇒ warn (optional); missing flags ⇒ warn-with-the-list;
 *    all present ⇒ ok.
 *  - output: no config ⇒ warn; missing output/adapter ⇒ warn-with-the-list;
 *    both ⇒ ok.
 *  - csp: always an ok advisory (doctor can't read deployed headers).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import * as spawnLib from '../../../../../packages/cli/src/lib/spawn.js';
import {
  probeCloudflareAdapter,
  probeCloudflareAstro,
  probeCloudflareConfig,
  probeCloudflareCsp,
  probeCloudflareOutput,
  probeCloudflareWrangler,
  probeLiteshipPnpm,
} from '../../../../../packages/cli/src/commands/doctor/probes-cloudflare.js';

const tmps: string[] = [];
function mkTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'czap-doctor-cf-'));
  tmps.push(dir);
  return dir;
}
afterEach(() => {
  vi.restoreAllMocks();
  while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
});

function writePkg(dir: string, pkg: unknown): void {
  writeFileSync(resolve(dir, 'package.json'), JSON.stringify(pkg));
}
function writeInstalled(dir: string, name: string, version: string): void {
  const d = resolve(dir, 'node_modules', name);
  mkdirSync(d, { recursive: true });
  writeFileSync(resolve(d, 'package.json'), JSON.stringify({ version }));
}

describe('doctor/probes-cloudflare — probeCloudflareAstro()', () => {
  it('ok when a >= 6 astro is installed', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { astro: '^6' } });
    writeInstalled(dir, 'astro', '6.0.5');
    expect(probeCloudflareAstro(dir)).toMatchObject({ status: 'ok', detail: '6.0.5' });
  });

  it('fail when astro is not declared or installed', () => {
    const dir = mkTmp();
    writePkg(dir, {});
    expect(probeCloudflareAstro(dir)).toMatchObject({ status: 'fail' });
  });

  it('fail when the installed major is < 6', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { astro: '^5' } });
    writeInstalled(dir, 'astro', '5.9.0');
    const r = probeCloudflareAstro(dir);
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('need >= 6');
  });

  it('warn (not fail) when package.json is unreadable', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), '{ bad');
    const r = probeCloudflareAstro(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/package\.json unreadable/);
  });

  it('warn when declared but the installed manifest is absent', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { astro: '^6' } });
    const r = probeCloudflareAstro(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/not resolved in node_modules/);
  });

  it('warn when the installed astro manifest is unreadable', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { astro: '^6' } });
    const d = resolve(dir, 'node_modules', 'astro');
    mkdirSync(d, { recursive: true });
    writeFileSync(resolve(d, 'package.json'), '<<bad>>');
    const r = probeCloudflareAstro(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/installed astro manifest unreadable/);
  });

  it('fail when the installed version is unparseable (major null)', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { astro: '^6' } });
    writeInstalled(dir, 'astro', 'garbage');
    expect(probeCloudflareAstro(dir).status).toBe('fail');
  });
});

describe('doctor/probes-cloudflare — probeCloudflareAdapter()', () => {
  it('ok when a >= 13 adapter is installed', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { '@astrojs/cloudflare': '^13' } });
    writeInstalled(dir, '@astrojs/cloudflare', '13.0.0');
    expect(probeCloudflareAdapter(dir)).toMatchObject({ status: 'ok', detail: '13.0.0' });
  });

  it('fail when the adapter is missing', () => {
    const dir = mkTmp();
    writePkg(dir, {});
    expect(probeCloudflareAdapter(dir)).toMatchObject({ status: 'fail' });
  });

  it('warn when the installed major is < 13', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { '@astrojs/cloudflare': '^12' } });
    writeInstalled(dir, '@astrojs/cloudflare', '12.5.0');
    const r = probeCloudflareAdapter(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('v13+');
  });

  it('warn when package.json is unreadable', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'package.json'), '{ bad');
    expect(probeCloudflareAdapter(dir)).toMatchObject({ status: 'warn' });
  });

  it('warn when declared but not resolved in node_modules', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { '@astrojs/cloudflare': '^13' } });
    expect(probeCloudflareAdapter(dir).detail).toMatch(/not resolved in node_modules/);
  });

  it('warn when the installed adapter manifest is unreadable', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { '@astrojs/cloudflare': '^13' } });
    const d = resolve(dir, 'node_modules', '@astrojs', 'cloudflare');
    mkdirSync(d, { recursive: true });
    writeFileSync(resolve(d, 'package.json'), '<<bad>>');
    expect(probeCloudflareAdapter(dir).detail).toMatch(/adapter manifest unreadable/);
  });
});

describe('doctor/probes-cloudflare — probeCloudflareWrangler()', () => {
  it('ok using the CLI version when wrangler answers on PATH', async () => {
    const dir = mkTmp();
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 0,
      stdout: '4.2.1\n',
      stderr: '',
      timedOut: false,
    });
    const r = await probeCloudflareWrangler(dir);
    expect(r).toMatchObject({ status: 'ok', detail: '4.2.1' });
  });

  it('warn on a CLI timeout', async () => {
    const dir = mkTmp();
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 124,
      stdout: '',
      stderr: '',
      timedOut: true,
    });
    const r = await probeCloudflareWrangler(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/no response within/);
  });

  it('warn when neither CLI nor node_modules has wrangler', async () => {
    const dir = mkTmp();
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({ exitCode: 1, stdout: '', stderr: '', timedOut: false });
    const r = await probeCloudflareWrangler(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/not on PATH and not in node_modules/);
  });

  it('falls back to the installed pkg version when the CLI is absent', async () => {
    const dir = mkTmp();
    writeInstalled(dir, 'wrangler', '4.0.0');
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({ exitCode: 1, stdout: '', stderr: '', timedOut: false });
    const r = await probeCloudflareWrangler(dir);
    expect(r).toMatchObject({ status: 'ok', detail: '4.0.0' });
  });

  it('warn when the CLI is absent and the installed manifest is unreadable', async () => {
    const dir = mkTmp();
    const d = resolve(dir, 'node_modules', 'wrangler');
    mkdirSync(d, { recursive: true });
    writeFileSync(resolve(d, 'package.json'), '!!!');
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({ exitCode: 1, stdout: '', stderr: '', timedOut: false });
    const r = await probeCloudflareWrangler(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/installed manifest unreadable/);
  });

  it('warn when the version is < 4', async () => {
    const dir = mkTmp();
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
      exitCode: 0,
      stdout: '3.9.0\n',
      stderr: '',
      timedOut: false,
    });
    const r = await probeCloudflareWrangler(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('recommend >= 4');
  });

  it('treats a rejected spawn (null) like an absent CLI', async () => {
    const dir = mkTmp();
    vi.spyOn(spawnLib, 'spawnArgvCapture').mockRejectedValue(new Error('spawn ENOENT'));
    const r = await probeCloudflareWrangler(dir);
    expect(r.status).toBe('warn');
  });
});

describe('doctor/probes-cloudflare — probeCloudflareConfig()', () => {
  it('ok when all bindings + compatibility flags are present', () => {
    const dir = mkTmp();
    writeFileSync(
      resolve(dir, 'wrangler.jsonc'),
      JSON.stringify({
        compatibility_date: '2026-06-08',
        compatibility_flags: ['nodejs_compat'],
        kv_namespaces: [{ binding: 'CZAP_BOUNDARY_CACHE' }],
      }),
    );
    expect(probeCloudflareConfig(dir)).toMatchObject({ status: 'ok' });
  });

  it('warn when no wrangler config exists (optional)', () => {
    const r = probeCloudflareConfig(mkTmp());
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/no wrangler/);
  });

  it('warn listing each missing flag/binding', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'wrangler.toml'), 'name = "app"\n');
    const r = probeCloudflareConfig(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('compatibility_date');
    expect(r.detail).toContain('nodejs_compat');
    expect(r.detail).toContain('kv_namespaces');
  });

  it('accepts the CZAP_BOUNDARY_CACHE alias for the kv binding', () => {
    const dir = mkTmp();
    writeFileSync(
      resolve(dir, 'wrangler.toml'),
      'compatibility_date = "2026-06-08"\ncompatibility_flags = ["nodejs_compat"]\n# CZAP_BOUNDARY_CACHE\n',
    );
    expect(probeCloudflareConfig(dir)).toMatchObject({ status: 'ok' });
  });
});

describe('doctor/probes-cloudflare — probeCloudflareOutput()', () => {
  it('warn when no astro.config.* is found', () => {
    const r = probeCloudflareOutput(mkTmp());
    expect(r.status).toBe('warn');
    expect(r.detail).toMatch(/no astro\.config/);
  });

  it('ok when output: server + cloudflare adapter are both present', () => {
    const dir = mkTmp();
    writeFileSync(
      resolve(dir, 'astro.config.mjs'),
      `import cloudflare from '@astrojs/cloudflare';\nexport default { output: 'server', adapter: cloudflare() };`,
    );
    expect(probeCloudflareOutput(dir)).toMatchObject({ status: 'ok' });
  });

  it('warn listing the missing pieces when output is set but adapter is not', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'astro.config.mjs'), `export default { output: 'server' };`);
    const r = probeCloudflareOutput(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('adapter: cloudflare()');
    expect(r.detail).not.toContain('output: server');
  });

  it('warn listing both when neither is present', () => {
    const dir = mkTmp();
    writeFileSync(resolve(dir, 'astro.config.mjs'), `export default {};`);
    const r = probeCloudflareOutput(dir);
    expect(r.status).toBe('warn');
    expect(r.detail).toContain('output: server');
    expect(r.detail).toContain('adapter: cloudflare()');
  });
});

describe('doctor/probes-cloudflare — probeCloudflareCsp()', () => {
  it('is always an ok advisory', () => {
    const r = probeCloudflareCsp();
    expect(r).toMatchObject({ id: 'cloudflare.csp', status: 'ok' });
    expect(r.detail).toContain('advisory');
    expect(r.hint).toBeDefined();
  });
});

describe('doctor/probes-cloudflare — probeLiteshipPnpm()', () => {
  it('returns null when the host manifest is absent (probe skipped)', () => {
    expect(probeLiteshipPnpm(mkTmp())).toBeNull();
  });

  it('returns null when liteship is not declared', () => {
    const dir = mkTmp();
    writePkg(dir, { name: 'app' });
    expect(probeLiteshipPnpm(dir)).toBeNull();
  });

  it('returns null under a non-pnpm-strict layout (no node_modules/.pnpm)', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { liteship: '0.1.5' } });
    mkdirSync(resolve(dir, 'node_modules'), { recursive: true });
    expect(probeLiteshipPnpm(dir)).toBeNull();
  });

  it('ok when the @czap scope is resolvable beside liteship', () => {
    const dir = mkTmp();
    writePkg(dir, { dependencies: { liteship: '0.1.5' } });
    mkdirSync(resolve(dir, 'node_modules', '.pnpm'), { recursive: true });
    mkdirSync(resolve(dir, 'node_modules', '@czap'), { recursive: true });
    expect(probeLiteshipPnpm(dir)).toMatchObject({ id: 'liteship.pnpm', status: 'ok' });
  });

  it('warn (with the literal pnpm add remedy) under pnpm-strict without hoisted @czap/*', () => {
    const dir = mkTmp();
    writePkg(dir, { devDependencies: { liteship: '0.1.5' } });
    mkdirSync(resolve(dir, 'node_modules', '.pnpm'), { recursive: true });
    const r = probeLiteshipPnpm(dir);
    expect(r).toMatchObject({ status: 'warn' });
    expect(r?.hint).toContain('pnpm add @czap/core @czap/astro');
  });
});
