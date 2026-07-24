import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { PACKAGES } from '@liteship/command';
import {
  RELEASE_ARTIFACT_BUNDLE_FILE,
  releasePackArgv,
  verifyReleaseArtifactBundle,
  type ReleaseArtifactBundle,
} from '../../../packages/cli/src/lib/release-artifact-bundle.js';
import { tarballManifestAddress } from '../../../packages/cli/src/ship-manifest.js';
import { loadReleaseArtifactWorkspace } from '../../journey/harness.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const sha256 = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');

function writeAscii(target: Buffer, offset: number, width: number, value: string): void {
  target.write(value.slice(0, width), offset, width, 'ascii');
}

function octal(value: number, width: number): string {
  return value.toString(8).padStart(width - 1, '0') + '\0';
}

/** Minimal deterministic ustar archive containing only package/package.json. */
function packedManifest(name: string, version: string): Uint8Array {
  const body = Buffer.from(JSON.stringify({ name, version }), 'utf8');
  const header = Buffer.alloc(512);
  writeAscii(header, 0, 100, 'package/package.json');
  writeAscii(header, 100, 8, octal(0o644, 8));
  writeAscii(header, 108, 8, octal(0, 8));
  writeAscii(header, 116, 8, octal(0, 8));
  writeAscii(header, 124, 12, octal(body.length, 12));
  writeAscii(header, 136, 12, octal(0, 12));
  header.fill(0x20, 148, 156);
  header[156] = '0'.charCodeAt(0);
  writeAscii(header, 257, 6, 'ustar\0');
  writeAscii(header, 263, 2, '00');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeAscii(header, 148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return new Uint8Array(gzipSync(Buffer.concat([header, body, padding, Buffer.alloc(1024)]), { mtime: 0 }));
}

function fixture(sourceCommit = 'a'.repeat(40)): { dir: string; manifest: ReleaseArtifactBundle } {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-release-bundle-'));
  roots.push(dir);
  const artifacts = PACKAGES.map((pkg) => {
    const packageJson = JSON.parse(readFileSync(resolve(pkg.dir, 'package.json'), 'utf8')) as { version: string };
    const bytes = packedManifest(pkg.name, packageJson.version);
    const file = `${pkg.name.replace(/^@/, '').replaceAll('/', '-')}-${packageJson.version}.tgz`;
    writeFileSync(join(dir, file), bytes);
    const semantic = tarballManifestAddress(bytes);
    return {
      package: pkg.name,
      version: packageJson.version,
      file,
      sha256: sha256(bytes),
      semanticAddress: {
        displayId: semantic.display_id,
        integrityDigest: semantic.integrity_digest,
        algo: semantic.algo,
      },
    };
  });
  const unsigned = {
    schemaVersion: 1 as const,
    sourceCommit,
    planId: `sha256:${'c'.repeat(64)}` as `sha256:${string}`,
    builder: {
      workflow: 'CI',
      runId: '123',
      runAttempt: '1',
      platform: 'linux-x64',
      node: 'v22.0.0',
      pnpm: '10.0.0',
    },
    packageCount: artifacts.length,
    artifacts,
  };
  const manifest: ReleaseArtifactBundle = {
    ...unsigned,
    manifestDigest: sha256(JSON.stringify(unsigned)),
  };
  writeFileSync(join(dir, RELEASE_ARTIFACT_BUNDLE_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  return { dir, manifest };
}

describe('immutable release artifact bundle', () => {
  it('packs the already-built fleet without rerunning lifecycle compilers', () => {
    expect(releasePackArgv('/release/tarballs')).toEqual([
      'pack',
      '--pack-destination',
      '/release/tarballs',
      '--config.ignore-scripts=true',
    ]);
  });

  it('verifies all 25 exact tarballs and binds the source commit', () => {
    const { dir, manifest } = fixture();
    const verified = verifyReleaseArtifactBundle(dir, manifest.sourceCommit);
    expect(verified.tarballByPackage.size).toBe(25);
    expect(verified.manifest.manifestDigest).toBe(manifest.manifestDigest);
  });

  it('gives consumer journeys the verified frozen fleet without repacking it', () => {
    const { dir, manifest } = fixture();
    const packed = loadReleaseArtifactWorkspace(dir, manifest.sourceCommit, manifest.planId);
    expect(packed.tarballDir).toBe(resolve(dir));
    expect(packed.tarballByName.size).toBe(25);
    expect(packed.tarballByName.get('liteship')).toBe(
      join(dir, manifest.artifacts.find((artifact) => artifact.package === 'liteship')!.file),
    );
  });

  it('fails closed when one verified tarball changes', () => {
    const { dir, manifest } = fixture();
    writeFileSync(join(dir, manifest.artifacts[0]!.file), Buffer.from('tampered'));
    expect(() => verifyReleaseArtifactBundle(dir, manifest.sourceCommit)).toThrow(/raw digest mismatch/);
  });

  it('refuses a bundle from a foreign source commit', () => {
    const { dir } = fixture();
    expect(() => verifyReleaseArtifactBundle(dir, 'b'.repeat(40))).toThrow(/does not match expected/);
  });

  it('refuses a bundle addressed to another evidence plan', () => {
    const { dir } = fixture();
    expect(() => verifyReleaseArtifactBundle(dir, 'a'.repeat(40), `sha256:${'d'.repeat(64)}`)).toThrow(
      /does not match expected/,
    );
  });

  it('refuses a manifest edit even when every tarball is untouched', () => {
    const { dir, manifest } = fixture();
    const edited = { ...manifest, packageCount: 24 };
    writeFileSync(join(dir, RELEASE_ARTIFACT_BUNDLE_FILE), JSON.stringify(edited));
    expect(() => verifyReleaseArtifactBundle(dir)).toThrow(/manifest digest mismatch/);
  });
});
