import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCapsuleManifestPath } from '@czap/command/host';

describe('getCapsuleManifestPath', () => {
  let workDir: string;
  const prev = process.env.CZAP_CAPSULE_MANIFEST;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'czap-manifest-path-'));
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
    else process.env.CZAP_CAPSULE_MANIFEST = prev;
    rmSync(workDir, { recursive: true, force: true });
  });

  it('defaults to reports/capsule-manifest.json under cwd', () => {
    delete process.env.CZAP_CAPSULE_MANIFEST;
    expect(getCapsuleManifestPath(workDir)).toBe(join(workDir, 'reports/capsule-manifest.json'));
  });

  it('honors CZAP_CAPSULE_MANIFEST relative to cwd', () => {
    process.env.CZAP_CAPSULE_MANIFEST = 'custom/manifest.json';
    expect(getCapsuleManifestPath(workDir)).toBe(join(workDir, 'custom/manifest.json'));
  });

  it('trims whitespace on CZAP_CAPSULE_MANIFEST', () => {
    process.env.CZAP_CAPSULE_MANIFEST = '  alt.json  ';
    expect(getCapsuleManifestPath(workDir)).toBe(join(workDir, 'alt.json'));
  });
});
