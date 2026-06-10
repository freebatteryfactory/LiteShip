/**
 * Unit tests for `czap doctor --target cloudflare` focused host profile.
 */
import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { doctor } from '../../../../packages/cli/src/commands/doctor.js';
import * as spawnLib from '../../../../packages/cli/src/lib/spawn.js';
import { captureCli } from '../../../integration/cli/capture.js';

function writeCloudflareSandbox(base: string, extra?: { wrangler?: boolean; astroConfig?: boolean }): void {
  writeFileSync(
    join(base, 'package.json'),
    JSON.stringify({
      name: 'cf-test-app',
      dependencies: {
        astro: '^6.0.0',
        '@astrojs/cloudflare': '^13.0.0',
      },
      devDependencies: {
        wrangler: '^4.0.0',
      },
    }),
  );
  mkdirSync(join(base, 'node_modules', 'astro'), { recursive: true });
  writeFileSync(join(base, 'node_modules', 'astro', 'package.json'), JSON.stringify({ version: '6.0.5' }));
  mkdirSync(join(base, 'node_modules', '@astrojs', 'cloudflare'), { recursive: true });
  writeFileSync(
    join(base, 'node_modules', '@astrojs', 'cloudflare', 'package.json'),
    JSON.stringify({ version: '13.0.0' }),
  );
  mkdirSync(join(base, 'node_modules', 'wrangler'), { recursive: true });
  writeFileSync(join(base, 'node_modules', 'wrangler', 'package.json'), JSON.stringify({ version: '4.0.0' }));
  writeFileSync(join(base, 'node_modules', '.modules.yaml'), 'storeDir: .\n');

  if (extra?.wrangler !== false) {
    writeFileSync(
      join(base, 'wrangler.jsonc'),
      JSON.stringify({
        name: 'cf-test',
        compatibility_date: '2026-06-08',
        compatibility_flags: ['nodejs_compat'],
        kv_namespaces: [{ binding: 'CZAP_BOUNDARY_CACHE', id: 'test-id', preview_id: 'preview-id' }],
      }),
    );
  }

  if (extra?.astroConfig !== false) {
    writeFileSync(
      join(base, 'astro.config.mjs'),
      `import cloudflare from '@astrojs/cloudflare';
export default { output: 'server', adapter: cloudflare() };`,
    );
  }
}

describe('doctor --target cloudflare', () => {
  it('records target in the receipt and runs cloudflare probes only', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-cf-'));
    try {
      writeCloudflareSandbox(tmp);
      const spawnSpy = vi.spyOn(spawnLib, 'spawnArgvCapture').mockImplementation(async (cmd, args) => {
        if (cmd === 'wrangler' && args[0] === '--version') {
          return { exitCode: 0, stdout: '4.0.0\n', stderr: '', timedOut: false };
        }
        if (cmd === 'pnpm' && args[0] === '--version') {
          return { exitCode: 0, stdout: '10.0.0\n', stderr: '', timedOut: false };
        }
        return { exitCode: 1, stdout: '', stderr: '', timedOut: false };
      });

      const { stdout } = await captureCli(() => doctor({ pretty: false, target: 'cloudflare', cwd: tmp }));
      spawnSpy.mockRestore();

      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(receipt.target).toBe('cloudflare');
      const ids = new Set<string>(receipt.checks.map((c: { id: string }) => c.id));
      expect(ids).toContain('cloudflare.astro');
      expect(ids).toContain('cloudflare.adapter');
      expect(ids).toContain('cloudflare.wrangler');
      expect(ids).toContain('cloudflare.config');
      expect(ids).toContain('cloudflare.output');
      expect(ids).toContain('cloudflare.csp');
      expect(ids.has('core.built')).toBe(false);
      expect(ids.has('playwright.installed')).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('warns when wrangler config is absent', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-cf-nowrangler-'));
    try {
      writeCloudflareSandbox(tmp, { wrangler: false });
      vi.spyOn(spawnLib, 'spawnArgvCapture').mockImplementation(async (cmd, args) => {
        if (cmd === 'wrangler') return { exitCode: 0, stdout: '4.0.0\n', stderr: '', timedOut: false };
        if (cmd === 'pnpm') return { exitCode: 0, stdout: '10.0.0\n', stderr: '', timedOut: false };
        return { exitCode: 1, stdout: '', stderr: '', timedOut: false };
      });

      const { stdout } = await captureCli(() => doctor({ pretty: false, target: 'cloudflare', cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const cfg = receipt.checks.find((c: { id: string }) => c.id === 'cloudflare.config');
      expect(cfg.status).toBe('warn');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('a corrupt package.json reports unreadable, not a bogus missing-dependency fail', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-cf-corrupt-'));
    try {
      writeCloudflareSandbox(tmp);
      writeFileSync(join(tmp, 'package.json'), '{ this is not json');
      const { stdout } = await captureCli(() => doctor({ pretty: false, target: 'cloudflare', cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const astro = receipt.checks.find((c: { id: string }) => c.id === 'cloudflare.astro');
      // Diagnosis, not misdiagnosis: the manifest exists but cannot be parsed.
      expect(astro.status).toBe('warn');
      expect(astro.detail).toMatch(/package\.json unreadable: /);
      const adapter = receipt.checks.find((c: { id: string }) => c.id === 'cloudflare.adapter');
      expect(adapter.status).toBe('warn');
      expect(adapter.detail).toMatch(/package\.json unreadable: /);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('a corrupt INSTALLED manifest reports unreadable, not "not resolved"', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-cf-corrupt-installed-'));
    try {
      writeCloudflareSandbox(tmp);
      writeFileSync(join(tmp, 'node_modules', 'astro', 'package.json'), '<<not json>>');
      const { stdout } = await captureCli(() => doctor({ pretty: false, target: 'cloudflare', cwd: tmp }));
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const astro = receipt.checks.find((c: { id: string }) => c.id === 'cloudflare.astro');
      expect(astro.status).toBe('warn');
      expect(astro.detail).toMatch(/installed astro manifest unreadable: /);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('a corrupt installed wrangler manifest (no CLI on PATH) reports unreadable', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'czap-doctor-cf-corrupt-wrangler-'));
    try {
      writeCloudflareSandbox(tmp);
      writeFileSync(join(tmp, 'node_modules', 'wrangler', 'package.json'), '!!!');
      const spawnSpy = vi.spyOn(spawnLib, 'spawnArgvCapture').mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: '',
        timedOut: false,
      });
      const { stdout } = await captureCli(() => doctor({ pretty: false, target: 'cloudflare', cwd: tmp }));
      spawnSpy.mockRestore();
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      const wrangler = receipt.checks.find((c: { id: string }) => c.id === 'cloudflare.wrangler');
      expect(wrangler.status).toBe('warn');
      expect(wrangler.detail).toMatch(/installed manifest unreadable: /);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('omits cloudflare probes without --target', async () => {
    const { stdout } = await captureCli(() => doctor({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.target).toBeUndefined();
    const ids = new Set<string>(receipt.checks.map((c: { id: string }) => c.id));
    expect(ids.has('cloudflare.astro')).toBe(false);
  });
});
