// @vitest-environment node
/**
 * One-install executable law.
 *
 * Both supported package managers install a synthetic packed `liteship` facade
 * as the consumer's only LiteShip dependency. The facade uses the real shipped
 * bin shim and delegates to a packed transitive @liteship/cli fixture. This pins
 * the package-manager behavior the full packed journey exercises without public
 * hoisting or a direct CLI dependency.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { runPnpm } from '../../../scripts/support/pnpm-process.js';
import { scaledTimeout } from '../../../vitest.shared.js';

type Manager = 'npm' | 'pnpm';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
let scratch: string;
let facadeTarball: string;
let cliTarball: string;

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Prefer npm bundled beside Node; fall back to PATH on toolchains that lay it out differently. */
async function runNpm(args: readonly string[], cwd: string) {
  const bundled = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  return existsSync(bundled)
    ? spawnArgvCapture(process.execPath, [bundled, ...args], { cwd })
    : spawnArgvCapture('npm', args, { cwd });
}

async function pack(packageDir: string, destination: string): Promise<string> {
  const result = await runNpm(['pack', '--ignore-scripts', '--pack-destination', destination], packageDir);
  expect(result.exitCode, result.stderr || result.stdout).toBe(0);
  const name = result.stdout
    .trim()
    .split(/\r?\n/)
    .findLast((line) => line.endsWith('.tgz'));
  expect(name, result.stdout).toBeDefined();
  return join(destination, name!);
}

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'liteship-one-install-'));
  const packages = join(scratch, 'packages');
  const tarballs = join(scratch, 'tarballs');
  const cli = join(packages, 'cli');
  const facade = join(packages, 'liteship');
  mkdirSync(join(facade, 'bin'), { recursive: true });
  mkdirSync(cli, { recursive: true });
  mkdirSync(tarballs, { recursive: true });

  writeJson(join(cli, 'package.json'), {
    name: '@liteship/cli',
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  });
  writeFileSync(
    join(cli, 'index.js'),
    "export async function run(args) { process.stdout.write(JSON.stringify({ owner: '@liteship/cli', args }) + '\\n'); return 0; }\n",
  );
  cliTarball = await pack(cli, tarballs);

  writeJson(join(facade, 'package.json'), {
    name: 'liteship',
    version: '1.0.0',
    type: 'module',
    bin: { liteship: './bin/liteship.mjs' },
    files: ['bin'],
    dependencies: { '@liteship/cli': '^1.0.0' },
  });
  copyFileSync(resolve(ROOT, 'packages/liteship/bin/liteship.mjs'), join(facade, 'bin/liteship.mjs'));
  facadeTarball = await pack(facade, tarballs);
});

afterAll(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

async function prove(manager: Manager): Promise<void> {
  const consumer = join(scratch, `consumer-${manager}`);
  mkdirSync(consumer, { recursive: true });
  const cliOverride = pathToFileURL(cliTarball).href;
  const manifest: Record<string, unknown> = {
    name: `one-install-${manager}`,
    private: true,
    dependencies: { liteship: pathToFileURL(facadeTarball).href },
  };
  if (manager === 'pnpm') manifest['pnpm'] = { overrides: { '@liteship/cli': cliOverride } };
  else manifest['overrides'] = { '@liteship/cli': cliOverride };
  writeJson(join(consumer, 'package.json'), manifest);

  const install =
    manager === 'pnpm'
      ? await runPnpm(['install', '--prefer-offline'], { cwd: consumer, env: { FORCE_COLOR: '0' } })
      : await runNpm(['install', '--prefer-offline', '--no-audit', '--no-fund'], consumer);
  const installCode = 'code' in install ? install.code : install.exitCode;
  expect(installCode, install.stderr || install.stdout).toBe(0);

  const binDir = join(consumer, 'node_modules', '.bin');
  expect(existsSync(join(binDir, 'liteship')) || existsSync(join(binDir, 'liteship.cmd'))).toBe(true);

  const invocation =
    manager === 'pnpm'
      ? await runPnpm(['exec', 'liteship', 'proof'], { cwd: consumer, env: { FORCE_COLOR: '0' } })
      : await runNpm(['exec', '--', 'liteship', 'proof'], consumer);
  const invocationCode = 'code' in invocation ? invocation.code : invocation.exitCode;
  expect(invocationCode, invocation.stderr || invocation.stdout).toBe(0);
  expect(JSON.parse(invocation.stdout.trim())).toEqual({ owner: '@liteship/cli', args: ['proof'] });
}

describe('liteship facade executable — one direct dependency', () => {
  for (const manager of ['pnpm', 'npm'] as const) {
    it(
      `${manager} links the facade-owned bin and it delegates to the transitive CLI`,
      { timeout: scaledTimeout(45_000) },
      async () => prove(manager),
    );
  }

  it('the real facade manifest ships the executable and bin directory', () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'packages/liteship/package.json'), 'utf8')) as {
      readonly bin?: Readonly<Record<string, string>>;
      readonly files?: readonly string[];
    };
    expect(manifest.bin).toEqual({ liteship: './bin/liteship.mjs' });
    expect(manifest.files).toContain('bin');
  });
});
