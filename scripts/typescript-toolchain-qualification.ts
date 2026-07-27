/**
 * Host runner for the TypeScript 6 API / TypeScript 7 native qualification.
 *
 * Runs only in the Linux release authority. The semantic fold lives in
 * `scripts/lib/typescript-toolchain-qualification.ts`; this file owns process,
 * filesystem, wall-clock, and peak-RSS observation.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnArgvCaptureWithEnv } from '../packages/command/src/host/launcher.js';
import {
  TYPESCRIPT_TOOLCHAIN_CONTRACT,
  qualificationDigest,
  qualifyTypeScriptToolchains,
  resolveNativeTypeScriptWorkers,
  type DeclarationGraphNode,
  type EmittedPackageSurface,
  type TypeScriptDiagnosticIdentity,
  type TypeScriptQualificationRun,
  type TypeScriptToolchainObservation,
  type TypeScriptToolchainRole,
} from './lib/typescript-toolchain-qualification.js';

interface PackageMetadata {
  readonly name: string;
  readonly version: string;
  readonly bin?: Readonly<Record<string, string>>;
}

interface MeasuredProcess {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly wallMs: number;
  readonly peakRssBytes: number;
}

const ROOT = resolve('.');
const FIXTURE = resolve(TYPESCRIPT_TOOLCHAIN_CONTRACT.fixture);
const TIME = '/usr/bin/time';
const RSS_MARKER = '__LITESHIP_MAX_RSS_KB__:';

function normalizedBytes(path: string): string {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

function filesRecursively(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  visit(root);
  return files;
}

function fixtureDigest(): `sha256:${string}` {
  return qualificationDigest(
    filesRecursively(FIXTURE).map((path) => ({
      path: relative(FIXTURE, path).replaceAll('\\', '/'),
      bytes: normalizedBytes(path),
    })),
  );
}

function packageMetadata(dependency: string): PackageMetadata {
  const path = resolve('node_modules', dependency, 'package.json');
  return JSON.parse(readFileSync(path, 'utf8')) as PackageMetadata;
}

async function runMeasured(
  command: string,
  args: readonly string[],
  envAdditions: Readonly<Record<string, string>>,
): Promise<MeasuredProcess> {
  if (process.platform !== 'linux' || !existsSync(TIME)) {
    throw new Error('TypeScript dual-toolchain qualification requires Linux /usr/bin/time peak-RSS authority.');
  }
  const started = performance.now();
  const result = await spawnArgvCaptureWithEnv(TIME, ['-f', `${RSS_MARKER}%M`, command, ...args], {
    cwd: ROOT,
    envAdditions,
  });
  const marker = new RegExp(`${RSS_MARKER}(\\d+)`, 'u').exec(result.stderr);
  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr.replace(new RegExp(`(?:^|\\r?\\n)${RSS_MARKER}\\d+\\r?\\n?`, 'gu'), '\n'),
    wallMs: performance.now() - started,
    peakRssBytes: Number(marker?.[1] ?? 0) * 1024,
  };
}

function parseDiagnostics(output: string, fixtureRoot: string): readonly TypeScriptDiagnosticIdentity[] {
  const diagnostics: TypeScriptDiagnosticIdentity[] = [];
  const pattern = /^(.+?)\((\d+),(\d+)\):\s+(?:error|warning)\s+TS(\d+):/gmu;
  for (const match of output.matchAll(pattern)) {
    const file = match[1];
    if (file === undefined) continue;
    diagnostics.push({
      code: Number(match[4]),
      file: relative(fixtureRoot, resolve(file)).replaceAll('\\', '/'),
      line: Number(match[2]),
      column: Number(match[3]),
    });
  }
  return diagnostics.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.code - right.code,
  );
}

function declarationGraph(outputRoot: string): readonly DeclarationGraphNode[] {
  if (!existsSync(outputRoot)) return [];
  return filesRecursively(outputRoot)
    .filter((path) => path.endsWith('.d.ts'))
    .map((path) => {
      const bytes = normalizedBytes(path);
      const dependencies = [...bytes.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/gu)]
        .map((match) => match[2]!)
        .sort();
      return {
        path: relative(outputRoot, path).replaceAll('\\', '/'),
        digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` as const,
        dependencies,
      };
    });
}

function emittedPackageSurfaces(outputRoot: string): readonly EmittedPackageSurface[] {
  const entry = join(outputRoot, 'index.d.ts');
  if (!existsSync(entry)) return [];
  const bytes = normalizedBytes(entry);
  return [
    {
      specifier: 'typescript-dual-toolchain-fixture',
      declaration: basename(entry),
      digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    },
  ];
}

async function observeRun(input: {
  readonly bin: string;
  readonly fixtureRoot: string;
  readonly outputRoot: string;
  readonly buildInfo: string;
  readonly workers: number;
}): Promise<TypeScriptQualificationRun> {
  mkdirSync(input.outputRoot, { recursive: true });
  const result = await runMeasured(
    input.bin,
    [
      '--project',
      join(input.fixtureRoot, 'tsconfig.json'),
      '--outDir',
      input.outputRoot,
      '--tsBuildInfoFile',
      input.buildInfo,
      '--pretty',
      'false',
    ],
    { GOMAXPROCS: String(input.workers) },
  );
  return {
    exitCode: result.exitCode,
    diagnostics: parseDiagnostics(`${result.stdout}\n${result.stderr}`, input.fixtureRoot),
    declarationGraph: declarationGraph(input.outputRoot),
    emittedPackageSurfaces: emittedPackageSurfaces(input.outputRoot),
    metrics: { wallMs: result.wallMs, peakRssBytes: result.peakRssBytes },
  };
}

async function observeToolchain(input: {
  readonly role: TypeScriptToolchainRole;
  readonly dependency: string;
  readonly workers: number;
  readonly fixtureDigest: `sha256:${string}`;
  readonly tempRoot: string;
}): Promise<TypeScriptToolchainObservation> {
  const metadata = packageMetadata(input.dependency);
  const expectedBin = TYPESCRIPT_TOOLCHAIN_CONTRACT[input.role].bin;
  const relativeBin = metadata.bin?.[expectedBin];
  if (relativeBin === undefined) {
    throw new Error(`${input.dependency} does not expose the required ${expectedBin} bin.`);
  }
  const packageRoot = dirname(resolve('node_modules', input.dependency, 'package.json'));
  const bin = resolve(packageRoot, relativeBin);
  const versionResult = await spawnArgvCaptureWithEnv(bin, ['--version']);
  const implementationVersion = /Version\s+(\S+)/u.exec(`${versionResult.stdout}\n${versionResult.stderr}`)?.[1];
  if (versionResult.exitCode !== 0 || implementationVersion === undefined) {
    throw new Error(`${input.dependency}/${expectedBin} did not report a compiler version.`);
  }
  const fixtureRoot = join(input.tempRoot, input.role, 'fixture');
  cpSync(FIXTURE, fixtureRoot, { recursive: true });
  const outputRoot = join(input.tempRoot, input.role, 'out');
  const buildInfo = join(input.tempRoot, input.role, 'qualification.tsbuildinfo');
  const cold = await observeRun({ bin, fixtureRoot, outputRoot, buildInfo, workers: input.workers });
  const warm = await observeRun({ bin, fixtureRoot, outputRoot, buildInfo, workers: input.workers });
  return {
    role: input.role,
    dependency: input.dependency,
    packageName: metadata.name,
    version: metadata.version,
    implementationVersion,
    bin: expectedBin,
    fixtureDigest: input.fixtureDigest,
    requestedWorkers: input.workers,
    cold,
    warm,
  };
}

async function main(): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'liteship-typescript-qualification-'));
  try {
    const digest = fixtureDigest();
    const workerPolicy = resolveNativeTypeScriptWorkers({
      ci: process.env['CI'] === 'true',
      requested: process.env['LITESHIP_NATIVE_TSC_WORKERS'],
    });
    const compatibility = await observeToolchain({
      role: 'compatibility',
      dependency: TYPESCRIPT_TOOLCHAIN_CONTRACT.compatibility.dependency,
      workers: 1,
      fixtureDigest: digest,
      tempRoot,
    });
    const native = await observeToolchain({
      role: 'native',
      dependency: TYPESCRIPT_TOOLCHAIN_CONTRACT.native.dependency,
      workers: workerPolicy.requested,
      fixtureDigest: digest,
      tempRoot,
    });
    const report = qualifyTypeScriptToolchains({
      fixtureDigest: digest,
      nativeWorkerCeiling: workerPolicy.ceiling,
      compatibility,
      native,
    });
    mkdirSync(resolve('reports'), { recursive: true });
    writeFileSync(
      resolve('reports', 'typescript-toolchain-qualification.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    for (const finding of report.findings) {
      process.stderr.write(`[${finding.code}] ${finding.message}\n`);
    }
    process.stdout.write(
      `TypeScript dual-toolchain qualification ${report.ok ? 'passed' : 'failed'} (${report.reportId}); report written to reports/typescript-toolchain-qualification.json.\n`,
    );
    if (!report.ok) process.exitCode = 1;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

await main();
