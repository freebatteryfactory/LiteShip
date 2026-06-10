/**
 * CUT D9b-2 — `czap audit` is a real handler-backed command wired through the A1
 * registry via the injected `runAudit` capability. Proves: the descriptor +
 * schemas + handler classification; that the handler calls `context.runAudit`
 * and degrades to a structured failure without it; that @czap/command and
 * @czap/mcp-server never take a build edge on @czap/audit; and that the CLI
 * adapter loads explicit profiles (.json/.mjs), defaults in-repo, and never
 * shells out to `pnpm run audit`.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { auditCommand, commandRegistry, mcpExposedDescriptors, type CommandContext } from '@czap/command';
import { audit } from '../../../packages/cli/src/commands/audit.js';
import { AUDIT_WARNING_FLOOR, collectWarningInventory } from '../../../scripts/lib/audit-floor.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? tsFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

async function captureStdout<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string }> {
  let stdout = '';
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  try {
    const result = await fn();
    return { result, stdout };
  } finally {
    (process.stdout as unknown as { write: typeof orig }).write = orig;
  }
}

async function captureStdio<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string; stderr: string }> {
  let stderr = '';
  const orig = process.stderr.write.bind(process.stderr);
  (process.stderr as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  try {
    const { result, stdout } = await captureStdout(fn);
    return { result, stdout, stderr };
  } finally {
    (process.stderr as unknown as { write: typeof orig }).write = orig;
  }
}

/** Build a synthetic @acme/ repo and an explicit profile file; return both paths. */
function acmeFixture(profileExt: 'json' | 'mjs'): { root: string; profilePath: string } {
  const root = mkdtempSync(join(tmpdir(), 'czap-d9b2-'));
  fixtures.push(root);
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/core/package.json': JSON.stringify({
      name: '@acme/core',
      exports: { '.': { development: './src/index.ts' } },
    }),
    'packages/core/src/index.ts': 'export const coreThing = 1;\n',
    'packages/app/package.json': JSON.stringify({
      name: '@acme/app',
      dependencies: { '@acme/core': 'workspace:*' },
      exports: { '.': { development: './src/index.ts' } },
    }),
    'packages/app/src/index.ts': "import { coreThing } from '@acme/core';\nexport const appThing = coreThing + 1;\n",
  };
  const emptySurface = {
    astroPackage: '',
    astroClientDirectives: [],
    astroRuntimeFiles: [],
    viteVirtualModules: [],
    knownCapabilityNotes: [],
  };
  const topology = {
    '@acme/app': { allowedInternalImports: ['@acme/core'], kind: 'layered' },
    '@acme/core': { allowedInternalImports: [], kind: 'core' },
  };
  if (profileExt === 'json') {
    files['czap.profile.json'] = JSON.stringify({
      repoRoot: root,
      internalPackagePrefix: '@acme/',
      packageTopology: topology,
      dynamicImportExemptions: [],
      surfacePolicy: emptySurface,
    });
  } else {
    files['czap.profile.mjs'] =
      `export default ${JSON.stringify({ repoRoot: root, internalPackagePrefix: '@acme/', packageTopology: topology, dynamicImportExemptions: [], surfacePolicy: emptySurface })};\n`;
  }
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return { root, profilePath: resolve(root, `czap.profile.${profileExt}`) };
}

describe('D9b-2 — the audit descriptor is a registry handler, not MCP-exposed', () => {
  it('is registered as executionKind handler with input + output schemas', () => {
    const entry = commandRegistry.get('audit');
    expect(entry?.descriptor.executionKind).toBe('handler');
    expect(entry?.handler).toBeTypeOf('function');
    expect(entry?.descriptor.inputSchema.properties).toHaveProperty('profile');
    expect(entry?.descriptor.outputSchema?.properties).toHaveProperty('errorCount');
  });

  it('is NOT mcp-exposed and absent from the MCP tool set', () => {
    expect(commandRegistry.get('audit')?.descriptor.annotations?.mcpExposed).not.toBe(true);
    expect(mcpExposedDescriptors().map((d) => d.name)).not.toContain('audit');
  });
});

describe('D9b-2 — the handler is engine-agnostic (context.runAudit injection)', () => {
  it('calls context.runAudit and maps the summary into the result payload', async () => {
    let called = false;
    const ctx: CommandContext = {
      runAudit: async ({ profilePath }) => {
        called = true;
        expect(profilePath).toBe('./p.json');
        return {
          errorCount: 0,
          warningCount: 2,
          infoCount: 5,
          findingCount: 7,
          suppressedCount: 1,
          passFindingCounts: { structure: 1, integrity: 1, surface: 0 },
          repoRoot: '/x',
          profileSource: 'file',
        };
      },
    };
    const result = await auditCommand.handler({ name: 'audit', args: { profile: './p.json' } }, ctx);
    expect(called).toBe(true);
    expect(result.status).toBe('ok');
    expect((result.payload as { warningCount: number }).warningCount).toBe(2);
  });

  it('degrades to a structured failure when runAudit is absent (no untyped throw)', async () => {
    const result = await auditCommand.handler({ name: 'audit', args: {} }, {});
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(2);
    expect((result.payload as { error?: string }).error).toMatch(/runAudit/);
  });

  it('reports a nonzero exit when the engine finds errors', async () => {
    const ctx: CommandContext = {
      runAudit: async () => ({
        errorCount: 3,
        warningCount: 0,
        infoCount: 0,
        findingCount: 3,
        suppressedCount: 0,
        passFindingCounts: { structure: 3, integrity: 0, surface: 0 },
        repoRoot: '/x',
        profileSource: 'default',
      }),
    };
    const result = await auditCommand.handler({ name: 'audit', args: {} }, ctx);
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(1);
  });
});

describe('D9b-2 — @czap/command + @czap/mcp-server never take the engine edge', () => {
  it('no @czap/command source imports @czap/audit', () => {
    for (const file of tsFiles(resolve(REPO, 'packages/command/src'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/from\s*['"]@czap\/audit['"]/);
    }
  });

  it('no @czap/mcp-server source imports @czap/audit, and its manifest does not depend on it', () => {
    for (const file of tsFiles(resolve(REPO, 'packages/mcp-server/src'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/@czap\/audit/);
    }
    const pkg = JSON.parse(readFileSync(resolve(REPO, 'packages/mcp-server/package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['@czap/audit']).toBeUndefined();
  });
});

describe('D9b-2 — czap audit (CLI adapter)', () => {
  it('does not spawn pnpm run audit (no shell-out; engine runs in-process)', () => {
    const src = readFileSync(resolve(REPO, 'packages/cli/src/commands/audit.ts'), 'utf8');
    expect(src).not.toMatch(/pnpm run audit/);
    expect(src).not.toMatch(/spawn|child_process|execFile/);
    expect(src).toContain('runAuditPasses');
  });

  it('runs against the default profile in-repo and emits a well-formed receipt', async () => {
    const { result, stdout } = await captureStdout(() => audit({ pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.command).toBe('audit');
    expect(receipt.status).toBe('ok');
    expect(receipt.errorCount).toBe(0);
    expect(receipt.warningCount).toBe(0); // artifact-independent three-pass engine floor (zero since the advisory cleanup)
    expect(collectWarningInventory()).toEqual(AUDIT_WARNING_FLOOR);
    expect(receipt.profileSource).toBe('default');
    expect(result).toBe(0);
    // Full three-pass engine over the real repo: blows the 10s default under
    // parallel vitest load on a busy machine. Honest work, explicit budget.
  }, scaledTimeout(60_000));

  it('loads an explicit .json profile and audits the @acme/ fixture tree', async () => {
    const { root, profilePath } = acmeFixture('json');
    const { result, stdout } = await captureStdout(() => audit({ profile: profilePath, cwd: root, pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.errorCount).toBe(0);
    expect(receipt.profileSource).toBe('file');
    expect(receipt.repoRoot.replace(/\\/g, '/')).toBe(root.replace(/\\/g, '/'));
    expect(result).toBe(0);
  });

  it('loads an explicit .mjs profile only by the named path', async () => {
    const { root, profilePath } = acmeFixture('mjs');
    const { stdout } = await captureStdout(() => audit({ profile: profilePath, cwd: root, pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.profileSource).toBe('file');
  });

  it('fails clearly on a missing/invalid profile path (no walk-up, no silent default)', async () => {
    const code = await audit({ profile: './does-not-exist.json', cwd: REPO, pretty: false });
    expect(code).toBe(1);
  });

  it('--findings includes the shaped findings array; the default receipt stays findings-free', async () => {
    const { root, profilePath } = acmeFixture('json');

    const withFindings = await captureStdout(() =>
      audit({ profile: profilePath, cwd: root, findings: true, pretty: false }),
    );
    const receipt = JSON.parse(withFindings.stdout.trim().split('\n').pop()!);
    expect(Array.isArray(receipt.findings)).toBe(true);
    expect(receipt.findings.length).toBe(receipt.findingCount);
    for (const finding of receipt.findings as Array<Record<string, unknown>>) {
      expect(finding).toMatchObject({
        id: expect.any(String),
        section: expect.any(String),
        rule: expect.any(String),
        severity: expect.stringMatching(/^(error|warning|info)$/),
        title: expect.any(String),
        summary: expect.any(String),
      });
    }

    // Receipt-shape stability: without the flag, no findings key at all.
    const without = await captureStdout(() => audit({ profile: profilePath, cwd: root, pretty: false }));
    const plainReceipt = JSON.parse(without.stdout.trim().split('\n').pop()!);
    expect('findings' in plainReceipt).toBe(false);
  });

  it('--consumer and --profile are mutually exclusive (structured failure)', async () => {
    const { root, profilePath } = acmeFixture('json');
    const code = await audit({ profile: profilePath, consumer: true, cwd: root, pretty: false });
    expect(code).toBe(1);
  });

  it('--consumer builds the installed-package profile (profileSource: consumer)', async () => {
    const { root } = acmeFixture('json');
    const { result, stdout } = await captureStdout(() => audit({ consumer: true, cwd: root, pretty: false }));
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.profileSource).toBe('consumer');
    // Nothing from the czap topology is installed in the fixture: zero
    // packages, and the unshipped host surface is pruned, not error-spammed.
    expect(receipt.errorCount).toBe(0);
    expect(receipt.status).toBe('ok');
    expect(result).toBe(0);
  });

  it('--findings with --pretty writes per-finding stderr lines with locations', async () => {
    const { root, profilePath } = acmeFixture('json');
    // A default export produces a located warning finding for the pretty lane.
    writeFileSync(
      resolve(root, 'packages/core/src/extra.ts'),
      'const defaultThing = 1;\nexport default defaultThing;\n',
      'utf8',
    );
    const { stdout, stderr } = await captureStdio(() =>
      audit({ profile: profilePath, cwd: root, findings: true, pretty: true }),
    );
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.warningCount).toBeGreaterThanOrEqual(1);
    expect(stderr).toMatch(/audit: \d+ error\(s\)/);
    expect(stderr).toMatch(/\[warning\] packages\/core\/src\/extra\.ts:\d+:\d+ default-export — /);
  });
});
