import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, symlinkSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

type PackageSpec = {
  readonly dir: string;
  readonly name: string;
  readonly imports: readonly string[];
};

const ROOT = process.cwd();

/** Tarball path → `file://` URL for pnpm `dependencies` / `pnpm.overrides`. */
function tarballFileUrl(absolutePath: string): string {
  // Windows CI profiles often live under 8.3 short paths (`RUNNER~1`). pathToFileURL
  // percent-encodes `~` as `%7E`; pnpm then looks for a path that does not exist.
  const resolved = process.platform === 'win32' ? realpathSync.native(absolutePath) : absolutePath;
  return pathToFileURL(resolved).href;
}

/**
 * Scratch root for pack/install smoke. On Windows use a repo-local dir so we never
 * depend on `%TEMP%` short paths; POSIX keeps `os.tmpdir()` to avoid writing under
 * the workspace on dev machines.
 */
async function createScratchDir(): Promise<string> {
  if (process.platform === 'win32') {
    const base = join(ROOT, 'node_modules', '.cache', 'package-smoke');
    await mkdir(base, { recursive: true });
    return mkdtemp(join(base, 'run-'));
  }
  return mkdtemp(join(tmpdir(), 'czap-package-smoke-'));
}

/** Mirrors every publishable `@czap/*` scope under `packages/*` (see `pnpm-workspace.yaml`). */
const PACKAGES: readonly PackageSpec[] = [
  // _spine is type-only (no runtime); packed and overridden so consumers
  // can resolve `@czap/core`'s and `@czap/scene`'s declared dep on it
  // during `pnpm install`. No runtime `import()` smoke needed.
  { dir: 'packages/_spine', name: '@czap/_spine', imports: [] },
  { dir: 'packages/canonical', name: '@czap/canonical', imports: ['@czap/canonical'] },
  { dir: 'packages/genui', name: '@czap/genui', imports: ['@czap/genui'] },
  { dir: 'packages/core', name: '@czap/core', imports: ['@czap/core', '@czap/core/testing', '@czap/core/harness'] },
  { dir: 'packages/quantizer', name: '@czap/quantizer', imports: ['@czap/quantizer', '@czap/quantizer/testing'] },
  { dir: 'packages/compiler', name: '@czap/compiler', imports: ['@czap/compiler'] },
  { dir: 'packages/web', name: '@czap/web', imports: ['@czap/web', '@czap/web/lite'] },
  { dir: 'packages/detect', name: '@czap/detect', imports: ['@czap/detect'] },
  { dir: 'packages/edge', name: '@czap/edge', imports: ['@czap/edge'] },
  { dir: 'packages/cloudflare', name: '@czap/cloudflare', imports: ['@czap/cloudflare'] },
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
  // The verb / orchestration layer (P4). `.` is the pure graph-walk core;
  // `./ffmpeg` is the node-only headless byte-encode backend (child_process).
  { dir: 'packages/stage', name: '@czap/stage', imports: ['@czap/stage', '@czap/stage/ffmpeg'] },
  { dir: 'packages/assets', name: '@czap/assets', imports: ['@czap/assets', '@czap/assets/testing'] },
  { dir: 'packages/audit', name: '@czap/audit', imports: ['@czap/audit'] },
  // Shared command registry (CUT A1) — the dispatch layer @czap/cli and
  // @czap/mcp-server both consume. `./host` carries the Node-only manifest helpers.
  { dir: 'packages/command', name: '@czap/command', imports: ['@czap/command', '@czap/command/host'] },
  { dir: 'packages/cli', name: '@czap/cli', imports: ['@czap/cli'] },
  { dir: 'packages/mcp-server', name: '@czap/mcp-server', imports: ['@czap/mcp-server'] },
  // The unscoped scaffolder — consumed via `npm create liteship` (bin), but
  // its main entry exports the scaffold function; smoke verifies it resolves.
  { dir: 'packages/create-liteship', name: 'create-liteship', imports: ['create-liteship'] },
  // The unscoped umbrella — manifest-level deps on every @czap/* scope,
  // zero source imports; smoke verifies its own entrypoint resolves.
  { dir: 'packages/liteship', name: 'liteship', imports: ['liteship'] },
];

const PEER_INSTALLS = [
  'effect@4.0.0-beta.32',
  'vite@8.0.0',
  'astro@6.0.0',
  'react@19.2.0',
  'react-dom@19.2.0',
  'remotion@4.0.440',
  'fast-check@4.7.0',
  // @czap/audit's runtime deps — the engine parses + globs the target repo.
  'typescript@5.9.3',
  'fast-glob@3.3.3',
] as const;

function resolveExecutable(command: string): string {
  if (command === 'pnpm' && process.env['npm_execpath']) {
    return process.execPath;
  }
  if (process.platform === 'win32' && command === 'pnpm') {
    return 'pnpm.cmd';
  }
  return command;
}

function run(command: string, args: readonly string[], cwd: string): string {
  const executable = resolveExecutable(command);
  const commandArgs = command === 'pnpm' && process.env['npm_execpath'] ? [process.env['npm_execpath'], ...args] : args;
  return execFileSync(executable, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

/** Read `package/package.json` from a `pnpm pack` tarball (layout-stable on every OS). */
function readPackedManifest(tarballPath: string): {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
} {
  const raw = execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], { encoding: 'utf8' });
  return JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
}

/** Expand a `pnpm pack` tarball into `node_modules/@czap/<name>/` (Windows-safe). */
function extractPackedPackage(tarballPath: string, destinationDir: string): void {
  mkdirSync(destinationDir, { recursive: true });
  execFileSync('tar', ['-xzf', tarballPath, '-C', destinationDir, '--strip-components=1'], { stdio: 'inherit' });
}

function peerDependenciesOnly(): Record<string, string> {
  return Object.fromEntries(
    PEER_INSTALLS.map((specifier) => {
      const atIndex = specifier.lastIndexOf('@');
      return [specifier.slice(0, atIndex), specifier.slice(atIndex + 1)];
    }),
  );
}

/** npm deps declared in packed manifests (e.g. mediabunny, cborg) — not installed by tar extract alone. */
function collectPackedExternalDependencies(tarballByPackage: Map<string, string>): Record<string, string> {
  const peers = peerDependenciesOnly();
  const external: Record<string, string> = {};
  for (const pkg of PACKAGES) {
    const manifest = readPackedManifest(tarballByPackage.get(pkg.name)!);
    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      for (const [name, version] of Object.entries(manifest[field] ?? {})) {
        if (name.startsWith('@czap/') || version.startsWith('workspace:') || name in peers) {
          continue;
        }
        external[name] = version;
      }
    }
  }
  return external;
}

/** Hoisted pnpm often keeps packages only under `node_modules/.pnpm/<pkg>@ver/node_modules/<pkg>`. */
function findConsumerDependencyRoot(consumerDir: string, packageName: string): string | undefined {
  const segments = packageName.split('/');
  const direct = join(consumerDir, 'node_modules', ...segments);
  if (existsSync(join(direct, 'package.json'))) {
    return direct;
  }

  const hoisted = join(consumerDir, 'node_modules', '.pnpm', 'node_modules', ...segments);
  if (existsSync(join(hoisted, 'package.json'))) {
    return hoisted;
  }

  const store = join(consumerDir, 'node_modules', '.pnpm');
  if (!existsSync(store)) {
    return undefined;
  }

  const folderPrefix = `${packageName.replace('/', '+')}@`;
  for (const entry of readdirSync(store)) {
    if (!entry.startsWith(folderPrefix)) {
      continue;
    }
    const candidate = join(store, entry, 'node_modules', ...segments);
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return undefined;
}

function assertConsumerDependencyInstalled(consumerDir: string, packageName: string): void {
  if (!findConsumerDependencyRoot(consumerDir, packageName)) {
    throw new Error(
      `${packageName} missing from ${join(consumerDir, 'node_modules')} after install — import-smoke cannot resolve it.`,
    );
  }
}

/**
 * Tar-extracted `@czap/*` trees live under nested `node_modules/`. Node resolves
 * bare imports from the importing file upward; pnpm's default linker often leaves
 * mediabunny/cborg only at the consumer root. Mirror them beside each package
 * that declares them so `import 'mediabunny'` from `@czap/web/dist/...` works.
 */
function linkHoistedDepsBesidePackedPackages(
  consumerDir: string,
  tarballByPackage: Map<string, string>,
  externalDeps: Record<string, string>,
): void {
  const peers = peerDependenciesOnly();
  const linkable = new Set([...Object.keys(externalDeps), ...Object.keys(peers)]);

  for (const pkg of PACKAGES) {
    const manifest = readPackedManifest(tarballByPackage.get(pkg.name)!);
    const pkgDir = join(consumerDir, 'node_modules', ...pkg.name.split('/'));
    const nestedRoot = join(pkgDir, 'node_modules');

    for (const field of ['dependencies', 'optionalDependencies'] as const) {
      for (const name of Object.keys(manifest[field] ?? {})) {
        if (!linkable.has(name)) {
          continue;
        }
        const source = findConsumerDependencyRoot(consumerDir, name);
        const target = join(nestedRoot, ...name.split('/'));
        if (!source || existsSync(join(target, 'package.json'))) {
          continue;
        }
        mkdirSync(dirname(target), { recursive: true });
        if (process.platform === 'win32') {
          // Junction symlinks are brittle on GHA Windows (ENOENT when the
          // hoisted store path and nested @czap/*/node_modules layout diverge).
          // A recursive copy matches Linux symlink semantics for import-smoke.
          cpSync(source, target, { recursive: true });
        } else {
          symlinkSync(source, target, 'dir');
        }
      }
    }
  }
}

function ensureNoWorkspaceProtocolsInTarball(tarballPath: string, packageName: string): void {
  const pkg = readPackedManifest(tarballPath);

  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    const entries = Object.entries(pkg[field] ?? {});
    for (const [dependency, version] of entries) {
      if (version.startsWith('workspace:')) {
        throw new Error(
          `${packageName} packed metadata still contains workspace protocol for ${dependency}: ${version}`,
        );
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
  const scratch = await createScratchDir();
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

    if (process.platform === 'win32') {
      const externalDeps = collectPackedExternalDependencies(tarballByPackage);

      // Install peers + packed externals before extracting @czap/* tarballs. If the
      // scoped trees land first, pnpm treats their package.json deps as already
      // materialized and skips hoisting cborg/mediabunny to the consumer root.
      await writeFile(
        join(consumerDir, 'package.json'),
        JSON.stringify(
          {
            name: 'czap-package-smoke-consumer',
            private: true,
            type: 'module',
            dependencies: { ...peerDependenciesOnly(), ...externalDeps },
          },
          null,
          2,
        ),
      );
      stepOk(
        `consumer package.json written (peers + packed externals: ${Object.keys(externalDeps).join(', ') || 'none'})`,
      );

      await writeFile(join(consumerDir, '.npmrc'), ['node-linker=hoisted', 'public-hoist-pattern[]=*', ''].join('\n'));
      stepOk('consumer .npmrc written (hoisted linker)');

      // Consumer scratch lives under the repo; without --ignore-workspace pnpm
      // treats this as a workspace root install and never materializes cborg/mediabunny here.
      step(`pnpm install consumer dependencies in ${consumerDir}`);
      run('pnpm', ['install', '--ignore-workspace'], consumerDir);
      stepOk('pnpm install complete');

      for (const name of Object.keys(externalDeps)) {
        assertConsumerDependencyInstalled(consumerDir, name);
      }
      stepOk(`verified externals on disk: ${Object.keys(externalDeps).join(', ') || 'none'}`);

      step(`materialize ${PACKAGES.length} packed @czap/* trees under consumer node_modules (Windows)`);
      for (const pkg of PACKAGES) {
        const dest = join(consumerDir, 'node_modules', ...pkg.name.split('/'));
        extractPackedPackage(tarballByPackage.get(pkg.name)!, dest);
      }
      stepOk(`extracted ${PACKAGES.length} @czap/* packages into node_modules`);

      step('link hoisted peers/externals beside tar-extracted @czap/* packages (Windows)');
      linkHoistedDepsBesidePackedPackages(consumerDir, tarballByPackage, externalDeps);
      stepOk('nested node_modules links materialized');
    } else {
      step('build consumer package.json (dependencies + pnpm.overrides as file:// URLs)');
      const dependencies = Object.fromEntries([
        // pnpm accepts `file:<path>` specifiers, but on Windows a raw absolute
        // path like `file:C:\Users\runner\…\.tgz` is malformed (backslashes,
        // drive-letter colon collides with URL scheme parsing). pathToFileURL
        // produces a proper `file:///C:/Users/runner/…/.tgz` URL that pnpm
        // accepts on every platform.
        ...PACKAGES.map((pkg) => [pkg.name, tarballFileUrl(tarballByPackage.get(pkg.name)!)]),
        ...Object.entries(peerDependenciesOnly()),
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
              overrides: Object.fromEntries(
                PACKAGES.map((pkg) => [pkg.name, tarballFileUrl(tarballByPackage.get(pkg.name)!)]),
              ),
            },
          },
          null,
          2,
        ),
      );
      const sampleDep = dependencies[PACKAGES[0]!.name];
      stepOk(`consumer package.json written (sample dep: ${PACKAGES[0]!.name} → ${sampleDep})`);

      step(`pnpm install in consumer dir (${consumerDir})`);
      run('pnpm', ['install'], consumerDir);
      stepOk('pnpm install complete');
    }

    step('verify no workspace: protocols leaked into packed tarball manifests');
    for (const pkg of PACKAGES) {
      ensureNoWorkspaceProtocolsInTarball(tarballByPackage.get(pkg.name)!, pkg.name);
    }
    stepOk('no workspace: protocols found in packed manifests');

    step(`import-smoke ${PACKAGES.flatMap((pkg) => pkg.imports).length} module specifiers via node smoke.mjs`);
    const smokeModule = `
const imports = ${JSON.stringify(
      PACKAGES.flatMap((pkg) => pkg.imports),
      null,
      2,
    )};
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

    step('czap describe --format=json (binstub resolution check)');
    if (process.platform === 'win32') {
      // Tar-extracted @czap/cli has no node_modules/.bin shim; run the packed bin directly.
      const czapBin = join(consumerDir, 'node_modules', '@czap', 'cli', 'bin', 'czap.mjs');
      run('node', [czapBin, 'describe', '--format=json'], consumerDir);
    } else {
      run('pnpm', ['exec', 'czap', 'describe', '--format=json'], consumerDir);
    }
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
