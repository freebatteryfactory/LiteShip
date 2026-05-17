import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

type PackageSpec = {
  readonly dir: string;
  readonly name: string;
  readonly imports: readonly string[];
};

const ROOT = process.cwd();

/** Mirrors every publishable `@czap/*` scope under `packages/*` (see `pnpm-workspace.yaml`). */
const PACKAGES: readonly PackageSpec[] = [
  // _spine is type-only (no runtime); packed and overridden so consumers
  // can resolve `@czap/core`'s and `@czap/scene`'s declared dep on it
  // during `pnpm install`. No runtime `import()` smoke needed.
  { dir: 'packages/_spine', name: '@czap/_spine', imports: [] },
  {
    dir: 'packages/core',
    name: '@czap/core',
    imports: ['@czap/core', '@czap/core/testing', '@czap/core/harness'],
  },
  { dir: 'packages/quantizer', name: '@czap/quantizer', imports: ['@czap/quantizer', '@czap/quantizer/testing'] },
  { dir: 'packages/compiler', name: '@czap/compiler', imports: ['@czap/compiler'] },
  { dir: 'packages/web', name: '@czap/web', imports: ['@czap/web', '@czap/web/lite'] },
  { dir: 'packages/detect', name: '@czap/detect', imports: ['@czap/detect'] },
  { dir: 'packages/edge', name: '@czap/edge', imports: ['@czap/edge'] },
  { dir: 'packages/worker', name: '@czap/worker', imports: ['@czap/worker'] },
  { dir: 'packages/vite', name: '@czap/vite', imports: ['@czap/vite', '@czap/vite/html-transform'] },
  {
    dir: 'packages/astro',
    name: '@czap/astro',
    imports: [
      '@czap/astro',
      '@czap/astro/client-directives/satellite',
      '@czap/astro/client-directives/stream',
      '@czap/astro/client-directives/llm',
      '@czap/astro/client-directives/worker',
      '@czap/astro/client-directives/gpu',
      '@czap/astro/client-directives/wasm',
      '@czap/astro/middleware',
      '@czap/astro/runtime',
    ],
  },
  { dir: 'packages/remotion', name: '@czap/remotion', imports: ['@czap/remotion'] },
  { dir: 'packages/scene', name: '@czap/scene', imports: ['@czap/scene', '@czap/scene/dev'] },
  { dir: 'packages/assets', name: '@czap/assets', imports: ['@czap/assets', '@czap/assets/testing'] },
  { dir: 'packages/cli', name: '@czap/cli', imports: ['@czap/cli'] },
  { dir: 'packages/mcp-server', name: '@czap/mcp-server', imports: ['@czap/mcp-server'] },
];

const PEER_INSTALLS = [
  'effect@4.0.0-beta.32',
  'vite@8.0.0',
  'astro@6.0.0',
  'react@19.2.0',
  'react-dom@19.2.0',
  'remotion@4.0.440',
  'fast-check@4.7.0',
] as const;

function run(command: string, args: readonly string[], cwd: string): string {
  const executable =
    command === 'pnpm' && process.env['npm_execpath']
      ? process.execPath
      : process.platform === 'win32' && command === 'pnpm'
        ? 'pnpm.cmd'
        : command;
  const commandArgs = command === 'pnpm' && process.env['npm_execpath'] ? [process.env['npm_execpath'], ...args] : args;
  return execFileSync(executable, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

async function ensureNoWorkspaceProtocols(consumerDir: string, packageName: string): Promise<void> {
  const packageJsonPath = join(consumerDir, 'node_modules', ...packageName.split('/'), 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const entries = Object.entries(pkg[field] ?? {});
    for (const [dependency, version] of entries) {
      if (version.startsWith('workspace:')) {
        throw new Error(`${packageName} packed metadata still contains workspace protocol for ${dependency}: ${version}`);
      }
    }
  }
}

async function packPackage(cwd: string, tarballDir: string): Promise<string> {
  const before = new Set(await readdir(tarballDir));
  run('pnpm', ['pack', '--pack-destination', tarballDir], cwd);
  const after = await readdir(tarballDir);
  const created = after.filter((entry) => !before.has(entry) && entry.endsWith('.tgz'));
  if (created.length !== 1) {
    throw new Error(`Expected exactly one tarball from ${cwd}, found ${created.length}.`);
  }
  return join(tarballDir, created[0]!);
}

async function main(): Promise<void> {
  const scratch = await mkdtemp(join(tmpdir(), 'czap-package-smoke-'));
  const tarballDir = join(scratch, 'tarballs');
  const consumerDir = join(scratch, 'consumer');

  await mkdir(tarballDir, { recursive: true });
  await mkdir(consumerDir, { recursive: true });

  // Bracketed step prints so the failing step is identifiable from the CI log
  // alone when artifact download or auth-gated logs aren't reachable. Each
  // step gets a STEP/STEP-OK pair; the failing step's STEP-OK never prints.
  const step = (label: string): void => {
    console.log(`[package:smoke] ▸ ${label} (platform=${process.platform}, arch=${process.arch})`);
  };
  const stepOk = (label: string): void => {
    console.log(`[package:smoke] ✓ ${label}`);
  };

  try {
    const tarballs: string[] = [];
    const tarballByPackage = new Map<string, string>();

    step(`pack ${PACKAGES.length} packages via pnpm pack`);
    for (const pkg of PACKAGES) {
      const cwd = resolve(ROOT, pkg.dir);
      const tarball = await packPackage(cwd, tarballDir);
      tarballs.push(tarball);
      tarballByPackage.set(pkg.name, tarball);
    }
    stepOk(`packed ${PACKAGES.length} tarballs into ${tarballDir}`);

    step('build consumer package.json (dependencies + pnpm.overrides as file:// URLs)');
    const dependencies = Object.fromEntries([
      // pnpm accepts `file:<path>` specifiers, but on Windows a raw absolute
      // path like `file:C:\Users\runner\…\.tgz` is malformed (backslashes,
      // drive-letter colon collides with URL scheme parsing). pathToFileURL
      // produces a proper `file:///C:/Users/runner/…/.tgz` URL that pnpm
      // accepts on every platform.
      ...PACKAGES.map((pkg) => [pkg.name, pathToFileURL(tarballByPackage.get(pkg.name)!).href]),
      ...PEER_INSTALLS.map((specifier) => {
        const atIndex = specifier.lastIndexOf('@');
        return [specifier.slice(0, atIndex), specifier.slice(atIndex + 1)];
      }),
    ]);

    await writeFile(
      join(consumerDir, 'package.json'),
      JSON.stringify(
        {
          name: 'czap-package-smoke-consumer',
          private: true,
          type: 'module',
          dependencies,
          pnpm: {
            // Same pathToFileURL reason as the `dependencies` map at L135:
            // `file:C:\path` is malformed on Windows; pathToFileURL produces
            // `file:///C:/path` that pnpm accepts on every platform.
            overrides: Object.fromEntries(
              PACKAGES.map((pkg) => [pkg.name, pathToFileURL(tarballByPackage.get(pkg.name)!).href]),
            ),
          },
        },
        null,
        2,
      ),
    );
    // Diagnostic: print first @czap/* dep so the file:// URL shape is visible
    // in CI logs (Windows debugging when path encoding is the suspect).
    const sampleDep = dependencies[PACKAGES[0]!.name];
    stepOk(`consumer package.json written (sample dep: ${PACKAGES[0]!.name} → ${sampleDep})`);

    step(`pnpm install in consumer dir (${consumerDir})`);
    run('pnpm', ['install'], consumerDir);
    stepOk('pnpm install complete');

    step('verify no workspace: protocols leaked into installed package.json files');
    for (const pkg of PACKAGES) {
      await ensureNoWorkspaceProtocols(consumerDir, pkg.name);
    }
    stepOk('no workspace: protocols found');

    step(`import-smoke ${PACKAGES.flatMap((pkg) => pkg.imports).length} module specifiers via node smoke.mjs`);
    const smokeModule = `
const imports = ${JSON.stringify(PACKAGES.flatMap((pkg) => pkg.imports), null, 2)};
for (const specifier of imports) {
  const mod = await import(specifier);
  if (!mod || typeof mod !== 'object') {
    throw new Error(\`Import "\${specifier}" did not resolve to a module object.\`);
  }
}
`;
    await writeFile(join(consumerDir, 'smoke.mjs'), smokeModule);
    run('node', ['smoke.mjs'], consumerDir);
    stepOk('all imports resolved');

    step('pnpm exec czap describe --format=json (binstub resolution check)');
    run('pnpm', ['exec', 'czap', 'describe', '--format=json'], consumerDir);
    stepOk('czap binstub resolved and produced a describe receipt');

    console.log(`Package smoke passed for ${PACKAGES.length} packages.`);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
