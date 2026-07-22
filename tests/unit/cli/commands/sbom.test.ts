/**
 * `liteship sbom` adapter — the in-process orchestration of the supply-chain
 * analyzer into a deterministic, content-addressed SBOM receipt.
 *
 * The heavy analyzer (`analyzeLockfile` / `buildSbom` / `checkSbomCompleteness`)
 * and the workspace reader are passed through `sbom`'s injectable `deps` seam so
 * these assertions pin the ADAPTER's in-process logic — the workspace guard, the
 * missing-lockfile guard, the lockfile-parse fail-closed path, the receipt
 * projection (status / content address / counts / violation flattening), and the
 * exit-code mapping — without paying for a real pnpm-lock.yaml parse or writing a
 * real artifact. The artifact write is intercepted at the `node:fs` boundary so no
 * file lands in the repo (TWO-CLOCK: the receipt's timestamp is a wallClock
 * boundary, asserted ISO-shaped, never compared by value).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureCli } from '../../../integration/cli/capture.js';

const isLiteShipWorkspaceMock = vi.fn();
const readWorkspacePackagesMock = vi.fn();
const analyzeLockfileMock = vi.fn();
const buildSbomMock = vi.fn();
const checkSbomCompletenessMock = vi.fn();

/** The workspace-reader + supply-chain-analyzer seam injected into every `sbom` call. */
const sbomDeps = {
  isLiteShipWorkspace: isLiteShipWorkspaceMock,
  readWorkspacePackages: readWorkspacePackagesMock,
  analyzeLockfile: analyzeLockfileMock,
  buildSbom: buildSbomMock,
  checkSbomCompleteness: checkSbomCompletenessMock,
};

const { existsSyncMock, readFileSyncMock, writeFileSyncMock, mkdirSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
}));
vi.mock('node:fs', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
    writeFileSync: writeFileSyncMock,
    mkdirSync: mkdirSyncMock,
  };
});

import { sbom } from '../../../../packages/cli/src/commands/sbom.js';

/** A lockfile-facts double with the violation set under test. */
function lockfileFacts(violations: { code: string; subject: string }[]) {
  return {
    lockfile: { lockfileVersion: '9.0', packages: [] },
    facts: { lockfileVersion: '9.0', packageCount: 7, violations },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: a healthy LiteShip workspace with a present lockfile.
  isLiteShipWorkspaceMock.mockReturnValue(true);
  readWorkspacePackagesMock.mockReturnValue([
    { name: '@liteship/core', version: '0.4.0', private: false, importerPath: 'packages/core' },
  ]);
  existsSyncMock.mockReturnValue(true);
  readFileSyncMock.mockReturnValue('lockfileVersion: 9.0\n');
  writeFileSyncMock.mockReturnValue(undefined);
  mkdirSyncMock.mockReturnValue(undefined);
  analyzeLockfileMock.mockImplementation(() => lockfileFacts([]));
  buildSbomMock.mockReturnValue({
    sbom: { components: [{ purl: 'pkg:npm/@liteship/core@0.4.0' }, { purl: 'pkg:npm/cborg@4.0.0' }] },
    serialized: '{"bomFormat":"CycloneDX"}',
    address: 'fnv1a:deadbeef',
  });
  checkSbomCompletenessMock.mockReturnValue({ violations: [] });
});
afterEach(() => vi.restoreAllMocks());

function lastReceipt(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout.trim().split('\n').pop()!) as Record<string, unknown>;
}

describe('liteship sbom — workspace + lockfile guards (exit 1, emitError, no artifact write)', () => {
  it('refuses a non-LiteShip workspace before reading anything', async () => {
    isLiteShipWorkspaceMock.mockReturnValue(false);
    const { exit, stderr } = await captureCli(async () => sbom([], sbomDeps));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as { command: string; code: string; error: string };
    expect(event.command).toBe('sbom');
    expect(event.code).toBe('cli/workspace-required');
    expect(event.error).toContain('not a LiteShip workspace');
    // Guard returned before any lockfile read or artifact write.
    expect(readFileSyncMock).not.toHaveBeenCalled();
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it('refuses a missing pnpm-lock.yaml (exit 1) and names the absent path', async () => {
    existsSyncMock.mockReturnValue(false);
    const { exit, stderr } = await captureCli(async () => sbom([], sbomDeps));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as { code: string; error: string };
    expect(event.code).toBe('cli/workspace-required');
    expect(event.error).toContain('pnpm-lock.yaml not found');
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });
});

describe('liteship sbom — lockfile parse fails LOUD (no partial SBOM over a half-parsed lock)', () => {
  it('surfaces a tagged ParseError message verbatim', async () => {
    const parseError = Object.assign(new Error('unreadable lockfile shape at line 3'), { _tag: 'ParseError' });
    analyzeLockfileMock.mockImplementation(() => {
      throw parseError;
    });
    const { exit, stderr } = await captureCli(async () => sbom([], sbomDeps));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as { code: string; error: string };
    expect(event.code).toBe('cli/config-invalid');
    expect(event.error).toBe('unreadable lockfile shape at line 3');
    // A parse fault must NEVER write a partial SBOM artifact.
    expect(buildSbomMock).not.toHaveBeenCalled();
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it('wraps a non-tagged throw with the lockfile-parse prefix (never a bare rethrow)', async () => {
    analyzeLockfileMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const { exit, stderr } = await captureCli(async () => sbom([], sbomDeps));
    expect(exit).toBe(1);
    const event = JSON.parse(stderr.trim().split('\n').pop()!) as { error: string };
    expect(event.error).toContain('lockfile parse failed');
    expect(event.error).toContain('boom');
  });
});

describe('liteship sbom — clean run emits a deterministic, content-addressed receipt (exit 0)', () => {
  it('writes the reviewable artifact and projects the SBOM receipt shape', async () => {
    const { exit, stdout } = await captureCli(async () => sbom([], sbomDeps));
    expect(exit).toBe(0);

    // The serialized SBOM was written to the canonical artifact path.
    expect(mkdirSyncMock).toHaveBeenCalledTimes(1);
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const [, written] = writeFileSyncMock.mock.calls[0]!;
    expect(written).toBe('{"bomFormat":"CycloneDX"}');

    const receipt = lastReceipt(stdout);
    expect(receipt).toMatchObject({
      status: 'ok',
      command: 'sbom',
      artifact_path: 'reports/sbom.json',
      component_count: 2,
      lockfile_package_count: 7,
      violations: [],
    });
    // Content address is a ContentAddress-branded string over the analyzer's digest.
    expect(typeof receipt['content_address']).toBe('string');
    expect(String(receipt['content_address'])).toBe('fnv1a:deadbeef');
    // TWO-CLOCK: the timestamp is a wallClock ISO boundary (shape, not value).
    expect(receipt['timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('is deterministic: two runs over the same lockfile emit the same content address + component count', async () => {
    const first = await captureCli(async () => sbom([], sbomDeps));
    const second = await captureCli(async () => sbom([], sbomDeps));
    const a = lastReceipt(first.stdout);
    const b = lastReceipt(second.stdout);
    expect(a['content_address']).toEqual(b['content_address']);
    expect(a['component_count']).toEqual(b['component_count']);
    expect(a['lockfile_package_count']).toEqual(b['lockfile_package_count']);
  });
});

describe('liteship sbom — a non-hermetic supply chain fails (exit 1) with flattened violations', () => {
  it('merges lockfile-policy + SBOM-completeness violations into {code,subject} and exits 1', async () => {
    analyzeLockfileMock.mockImplementation(() => lockfileFacts([{ code: 'unpinned-dependency', subject: 'left-pad' }]));
    checkSbomCompletenessMock.mockReturnValue({
      violations: [{ code: 'incomplete-sbom', subject: '@liteship/web', detail: 'ignored field' }],
    });
    const { exit, stdout } = await captureCli(async () => sbom([], sbomDeps));
    expect(exit).toBe(1);
    const receipt = lastReceipt(stdout);
    expect(receipt['status']).toBe('failed');
    // Both sources flattened to the {code, subject} projection (detail dropped).
    expect(receipt['violations']).toEqual([
      { code: 'unpinned-dependency', subject: 'left-pad' },
      { code: 'incomplete-sbom', subject: '@liteship/web' },
    ]);
    // The artifact is still written — the SBOM is reviewable even when non-hermetic.
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
  });
});
