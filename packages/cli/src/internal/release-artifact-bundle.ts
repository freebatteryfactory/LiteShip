/**
 * Immutable release-artifact bundle.
 *
 * One frozen-head build packs the publishable fleet once. Consumer, hermetic,
 * package-author, and publish authorities all verify and consume this manifest
 * instead of silently repacking the workspace.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, rename, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { PACKAGES } from '@liteship/command';
import { IntegrityError } from '@liteship/error';
import { packedPackageIdentity, tarballManifestAddress } from '../ship-manifest.js';
import { spawnArgvCapture } from '../spawn-helpers.js';

export const RELEASE_ARTIFACT_BUNDLE_FILE = 'release-artifacts.json' as const;

export interface ReleaseArtifactRecord {
  readonly package: string;
  readonly version: string;
  readonly file: string;
  readonly sha256: string;
  readonly semanticAddress: {
    readonly displayId: string;
    readonly integrityDigest: string;
    readonly algo: 'sha256' | 'blake3';
  };
}

export interface ReleaseArtifactBundle {
  readonly schemaVersion: 1;
  readonly sourceCommit: string;
  readonly planId: `sha256:${string}`;
  readonly builder: {
    readonly workflow: string;
    readonly runId: string;
    readonly runAttempt: string;
    readonly platform: string;
    readonly node: string;
    readonly pnpm: string;
  };
  readonly packageCount: number;
  readonly artifacts: readonly ReleaseArtifactRecord[];
  readonly manifestDigest: string;
}

export interface VerifiedReleaseArtifactBundle {
  readonly manifest: ReleaseArtifactBundle;
  readonly tarballByPackage: ReadonlyMap<string, string>;
}

const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');

const manifestPayload = (input: Omit<ReleaseArtifactBundle, 'manifestDigest'>): string =>
  JSON.stringify({
    schemaVersion: input.schemaVersion,
    sourceCommit: input.sourceCommit,
    planId: input.planId,
    builder: input.builder,
    packageCount: input.packageCount,
    artifacts: input.artifacts,
  });

const packageSlug = (name: string): string => name.replace(/^@/, '').replaceAll('/', '-');

/** Pack arguments for the already-built release fleet; lifecycle rebuilds are forbidden here. */
export function releasePackArgv(outputDir: string): readonly string[] {
  return ['pack', '--pack-destination', outputDir, '--config.ignore-scripts=true'];
}

function readPackageVersion(root: string, dir: string): string {
  const parsed = JSON.parse(readFileSync(resolve(root, dir, 'package.json'), 'utf8')) as { version?: unknown };
  if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw IntegrityError('release-artifacts', `${dir}/package.json has no version`);
  }
  return parsed.version;
}

function parseBundle(value: unknown): ReleaseArtifactBundle {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw IntegrityError('release-artifacts', 'release artifact manifest must be an object');
  }
  const candidate = value as Partial<ReleaseArtifactBundle>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.sourceCommit !== 'string' ||
    !/^[0-9a-f]{40}$/i.test(candidate.sourceCommit) ||
    typeof candidate.planId !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(candidate.planId) ||
    typeof candidate.builder !== 'object' ||
    candidate.builder === null ||
    typeof candidate.packageCount !== 'number' ||
    !Array.isArray(candidate.artifacts) ||
    typeof candidate.manifestDigest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(candidate.manifestDigest)
  ) {
    throw IntegrityError('release-artifacts', 'release artifact manifest has an invalid envelope');
  }
  const builder = candidate.builder as Partial<ReleaseArtifactBundle['builder']>;
  if (
    [builder.workflow, builder.runId, builder.runAttempt, builder.platform, builder.node, builder.pnpm].some(
      (field) => typeof field !== 'string' || field.length === 0,
    )
  ) {
    throw IntegrityError('release-artifacts', 'release artifact builder identity is incomplete');
  }
  return candidate as ReleaseArtifactBundle;
}

/** Pack all 25 publishable packages exactly once and address the resulting bytes. */
export async function buildReleaseArtifactBundle(args: {
  readonly root: string;
  readonly outputDir: string;
  readonly sourceCommit: string;
  readonly planId: `sha256:${string}`;
  readonly builder: ReleaseArtifactBundle['builder'];
}): Promise<ReleaseArtifactBundle> {
  if (!/^[0-9a-f]{40}$/i.test(args.sourceCommit)) {
    throw IntegrityError('release-artifacts', `invalid source commit ${JSON.stringify(args.sourceCommit)}`);
  }
  if (!/^sha256:[0-9a-f]{64}$/u.test(args.planId)) {
    throw IntegrityError('release-artifacts', `invalid plan id ${JSON.stringify(args.planId)}`);
  }
  await mkdir(args.outputDir, { recursive: true });
  const existing = await readdir(args.outputDir);
  if (existing.length > 0) {
    throw IntegrityError('release-artifacts', `output directory must be empty: ${args.outputDir}`);
  }

  const artifacts: ReleaseArtifactRecord[] = [];
  for (const pkg of PACKAGES) {
    const version = readPackageVersion(args.root, pkg.dir);
    const expectedFile = `${packageSlug(pkg.name)}-${version}.tgz`;
    const before = new Set(await readdir(args.outputDir));
    const packed = await spawnArgvCapture('pnpm', releasePackArgv(args.outputDir), {
      cwd: resolve(args.root, pkg.dir),
    });
    if (packed.exitCode !== 0) {
      throw IntegrityError('release-artifacts', `pnpm pack failed for ${pkg.name}: ${packed.stderr.trim()}`);
    }
    const created = (await readdir(args.outputDir)).filter((file) => !before.has(file) && file.endsWith('.tgz'));
    if (created.length !== 1 || created[0] !== expectedFile) {
      throw IntegrityError(
        'release-artifacts',
        `${pkg.name} produced ${JSON.stringify(created)}; expected exactly ${expectedFile}`,
      );
    }
    const bytes = new Uint8Array(readFileSync(join(args.outputDir, expectedFile)));
    const semantic = tarballManifestAddress(bytes);
    artifacts.push({
      package: pkg.name,
      version,
      file: expectedFile,
      sha256: sha256(bytes),
      semanticAddress: {
        displayId: semantic.display_id,
        integrityDigest: semantic.integrity_digest,
        algo: semantic.algo,
      },
    });
  }

  const unsigned = {
    schemaVersion: 1 as const,
    sourceCommit: args.sourceCommit.toLowerCase(),
    planId: args.planId,
    builder: args.builder,
    packageCount: artifacts.length,
    artifacts,
  };
  const manifest: ReleaseArtifactBundle = {
    ...unsigned,
    manifestDigest: sha256(manifestPayload(unsigned)),
  };
  const finalPath = join(args.outputDir, RELEASE_ARTIFACT_BUNDLE_FILE);
  const temporaryPath = `${finalPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, finalPath);
  return manifest;
}

/** Verify the manifest and every tarball before any trust-bearing consumer uses it. */
export function verifyReleaseArtifactBundle(
  artifactDir: string,
  expectedSourceCommit?: string,
  expectedPlanId?: string,
): VerifiedReleaseArtifactBundle {
  const manifestPath = join(artifactDir, RELEASE_ARTIFACT_BUNDLE_FILE);
  if (!existsSync(manifestPath)) {
    throw IntegrityError('release-artifacts', `missing ${manifestPath}`);
  }
  const manifest = parseBundle(JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown);
  const { manifestDigest: _ignored, ...unsigned } = manifest;
  const expectedManifestDigest = sha256(manifestPayload(unsigned));
  if (manifest.manifestDigest !== expectedManifestDigest) {
    throw IntegrityError('release-artifacts', 'release artifact manifest digest mismatch');
  }
  if (expectedSourceCommit !== undefined && manifest.sourceCommit !== expectedSourceCommit.toLowerCase()) {
    throw IntegrityError(
      'release-artifacts',
      `bundle source ${manifest.sourceCommit} does not match expected ${expectedSourceCommit.toLowerCase()}`,
    );
  }
  if (expectedPlanId !== undefined && manifest.planId !== expectedPlanId) {
    throw IntegrityError(
      'release-artifacts',
      `bundle plan ${manifest.planId} does not match expected ${expectedPlanId}`,
    );
  }
  if (manifest.packageCount !== PACKAGES.length || manifest.artifacts.length !== PACKAGES.length) {
    throw IntegrityError(
      'release-artifacts',
      `bundle contains ${manifest.artifacts.length}/${manifest.packageCount} packages; expected ${PACKAGES.length}`,
    );
  }

  const expectedPackages = new Set(PACKAGES.map((pkg) => pkg.name));
  const seen = new Set<string>();
  const tarballByPackage = new Map<string, string>();
  for (const artifact of manifest.artifacts) {
    if (
      typeof artifact !== 'object' ||
      artifact === null ||
      typeof artifact.package !== 'string' ||
      typeof artifact.version !== 'string' ||
      typeof artifact.file !== 'string' ||
      typeof artifact.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(artifact.sha256) ||
      typeof artifact.semanticAddress?.displayId !== 'string' ||
      typeof artifact.semanticAddress?.integrityDigest !== 'string' ||
      (artifact.semanticAddress?.algo !== 'sha256' && artifact.semanticAddress?.algo !== 'blake3')
    ) {
      throw IntegrityError('release-artifacts', 'release artifact record has an invalid shape');
    }
    if (!expectedPackages.has(artifact.package) || seen.has(artifact.package)) {
      throw IntegrityError('release-artifacts', `unknown or duplicate package ${artifact.package}`);
    }
    if (basename(artifact.file) !== artifact.file || !artifact.file.endsWith('.tgz')) {
      throw IntegrityError('release-artifacts', `unsafe tarball path ${artifact.file}`);
    }
    const tarballPath = join(artifactDir, artifact.file);
    if (!existsSync(tarballPath)) {
      throw IntegrityError('release-artifacts', `missing tarball ${artifact.file}`);
    }
    const bytes = new Uint8Array(readFileSync(tarballPath));
    if (sha256(bytes) !== artifact.sha256) {
      throw IntegrityError('release-artifacts', `raw digest mismatch for ${artifact.package}`);
    }
    const identity = packedPackageIdentity(bytes);
    if (identity.name !== artifact.package || identity.version !== artifact.version) {
      throw IntegrityError(
        'release-artifacts',
        `${artifact.file} carries ${identity.name}@${identity.version}, expected ${artifact.package}@${artifact.version}`,
      );
    }
    const semantic = tarballManifestAddress(bytes);
    if (
      semantic.display_id !== artifact.semanticAddress.displayId ||
      semantic.integrity_digest !== artifact.semanticAddress.integrityDigest ||
      semantic.algo !== artifact.semanticAddress.algo
    ) {
      throw IntegrityError('release-artifacts', `semantic digest mismatch for ${artifact.package}`);
    }
    seen.add(artifact.package);
    tarballByPackage.set(artifact.package, tarballPath);
  }
  for (const pkg of expectedPackages) {
    if (!seen.has(pkg)) throw IntegrityError('release-artifacts', `missing package ${pkg}`);
  }
  return { manifest, tarballByPackage };
}
