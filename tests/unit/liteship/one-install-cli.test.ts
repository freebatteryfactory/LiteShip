// @vitest-environment node
/**
 * One-install executable law.
 *
 * Both supported package managers install a synthetic packed `liteship` facade
 * as the consumer's only LiteShip dependency. The facade uses the real shipped
 * bin shim and delegates to a packed transitive @liteship/cli fixture. The CLI
 * implementation deliberately publishes no competing bin entry, so the command
 * owner is deterministic under npm flattening as well as pnpm isolation. This pins
 * the package-manager behavior the full packed journey exercises without public
 * hoisting or a direct CLI dependency.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { tarballFileUrl } from '../../../packages/cli/src/lib/package-smoke-helpers.js';
import { spawnArgvCapture } from '../../../scripts/lib/spawn.js';
import { runPnpm } from '../../../scripts/support/pnpm-process.js';
import { scaledTimeout } from '../../../vitest.shared.js';

type Manager = 'npm' | 'pnpm';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
let scratch: string;
let scratchRoot: string;
let facadeTarball: string;
let noBinFacadeTarball: string;
let cliTarball: string;
let mcpServerTarball: string;

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
  scratchRoot = mkdtempSync(join(tmpdir(), 'liteship-one-install-'));
  // Plant the Windows CI spelling that npm/pnpm must open literally. This is
  // intentionally part of every real install below, not a string-only fixture.
  scratch = join(scratchRoot, 'RUNNER~1');
  mkdirSync(scratch);
  const packages = join(scratch, 'packages');
  const tarballs = join(scratch, 'tarballs');
  const cli = join(packages, 'cli');
  const mcpServer = join(packages, 'mcp-server');
  const facade = join(packages, 'liteship');
  const noBinFacade = join(packages, 'liteship-no-bin');
  mkdirSync(join(facade, 'bin'), { recursive: true });
  mkdirSync(noBinFacade, { recursive: true });
  mkdirSync(join(cli, 'bin'), { recursive: true });
  mkdirSync(mcpServer, { recursive: true });
  mkdirSync(tarballs, { recursive: true });

  writeJson(join(cli, 'package.json'), {
    name: '@liteship/cli',
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  });
  writeFileSync(
    join(cli, 'index.js'),
    [
      "export async function run(args, deps = {}) {",
      "  if (args[0] === 'mcp') { const server = await deps.importMcpServer(); await server.start(); return 0; }",
      "  if (args[0] === 'lsp') { const server = await deps.importMcpServer(); await server.runLspStdio(); return 0; }",
      "  process.stdout.write(JSON.stringify({ owner: '@liteship/cli', args }) + '\\n');",
      "  return 0;",
      "}",
      "",
    ].join('\n'),
  );
  writeFileSync(
    join(cli, 'bin/liteship.mjs'),
    "#!/usr/bin/env node\nimport { run } from '../index.js';\nprocess.exit(await run(process.argv.slice(2)));\n",
  );
  cliTarball = await pack(cli, tarballs);

  writeJson(join(mcpServer, 'package.json'), {
    name: '@liteship/mcp-server',
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  });
  writeFileSync(
    join(mcpServer, 'index.js'),
    [
      "export async function start() { process.stdout.write(JSON.stringify({ owner: '@liteship/mcp-server', command: 'mcp' }) + '\\n'); }",
      "export async function runLspStdio() { process.stdout.write(JSON.stringify({ owner: '@liteship/mcp-server', command: 'lsp' }) + '\\n'); }",
      "",
    ].join('\n'),
  );
  mcpServerTarball = await pack(mcpServer, tarballs);

  writeJson(join(facade, 'package.json'), {
    name: 'liteship',
    version: '1.0.0',
    type: 'module',
    bin: { liteship: './bin/liteship.mjs' },
    files: ['bin'],
    dependencies: { '@liteship/cli': '^1.0.0', '@liteship/mcp-server': '^1.0.0' },
  });
  copyFileSync(resolve(ROOT, 'packages/liteship/bin/liteship.mjs'), join(facade, 'bin/liteship.mjs'));
  facadeTarball = await pack(facade, tarballs);

  writeJson(join(noBinFacade, 'package.json'), {
    name: 'liteship',
    version: '1.0.1',
    type: 'module',
    dependencies: { '@liteship/cli': '^1.0.0' },
  });
  noBinFacadeTarball = await pack(noBinFacade, tarballs);
});

afterAll(() => {
  if (scratchRoot) rmSync(scratchRoot, { recursive: true, force: true });
});

async function prove(manager: Manager): Promise<void> {
  const consumer = join(scratch, `consumer-${manager}`);
  mkdirSync(consumer, { recursive: true });
  const cliOverride = tarballFileUrl(cliTarball);
  const mcpServerOverride = tarballFileUrl(mcpServerTarball);
  const manifest: Record<string, unknown> = {
    name: `one-install-${manager}`,
    private: true,
    dependencies: { liteship: tarballFileUrl(facadeTarball) },
  };
  const overrides = {
    '@liteship/cli': cliOverride,
    '@liteship/mcp-server': mcpServerOverride,
  };
  if (manager === 'pnpm') manifest['pnpm'] = { overrides };
  else manifest['overrides'] = overrides;
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

  for (const command of ['mcp', 'lsp'] as const) {
    const serverInvocation =
      manager === 'pnpm'
        ? await runPnpm(['exec', 'liteship', command], { cwd: consumer, env: { FORCE_COLOR: '0' } })
        : await runNpm(['exec', '--', 'liteship', command], consumer);
    const serverCode = 'code' in serverInvocation ? serverInvocation.code : serverInvocation.exitCode;
    expect(serverCode, serverInvocation.stderr || serverInvocation.stdout).toBe(0);
    expect(JSON.parse(serverInvocation.stdout.trim())).toEqual({
      owner: '@liteship/mcp-server',
      command,
    });
  }
}

describe('liteship facade executable — one direct dependency', () => {
  for (const manager of ['pnpm', 'npm'] as const) {
    it(
      `${manager} links the facade-owned bin and resolves CLI, MCP, and LSP through facade dependencies`,
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

  it('the CLI implementation manifest cannot compete for the facade-owned command name', () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'packages/cli/package.json'), 'utf8')) as {
      readonly bin?: Readonly<Record<string, string>>;
    };
    expect(manifest.bin).toBeUndefined();
  });

  it(
    'pnpm default isolation does not expose a transitive-only CLI bin at the application root',
    { timeout: scaledTimeout(45_000) },
    async () => {
      const consumer = join(scratch, 'consumer-pnpm-no-facade-bin');
      mkdirSync(consumer, { recursive: true });
      writeJson(join(consumer, 'package.json'), {
        name: 'one-install-negative-control',
        private: true,
        dependencies: { liteship: tarballFileUrl(noBinFacadeTarball) },
        pnpm: { overrides: { '@liteship/cli': tarballFileUrl(cliTarball) } },
      });

      const install = await runPnpm(['install', '--prefer-offline'], {
        cwd: consumer,
        env: { FORCE_COLOR: '0' },
      });
      expect(install.code, install.stderr || install.stdout).toBe(0);

      const binDir = join(consumer, 'node_modules', '.bin');
      expect(existsSync(join(binDir, 'liteship'))).toBe(false);
      expect(existsSync(join(binDir, 'liteship.cmd'))).toBe(false);
    },
  );
});
