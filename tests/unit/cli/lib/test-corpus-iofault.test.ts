/**
 * The TEST-CORPUS read FAULT-DISCRIMINATION law (`packages/cli/src/lib/test-corpus.ts`),
 * in an isolated module that mocks `node:fs` so a read fault can be INJECTED with a
 * chosen errno — platform-independent by construction.
 *
 * THE LAW: a `readdirSync` failure whose errno is ENOENT is a designed tolerance (a repo
 * without that test tier is valid → the root is skipped, never throws). A read failure
 * with ANY OTHER errno (EACCES, EIO — a perms or hardware/VM fault) is NOT silently
 * swallowed as a missing tier: it PROPAGATES so the caller sees the real failure rather
 * than a phantom-empty corpus (a silent swallow would under-report the corpus).
 *
 * WHY A MOCK, NOT A REAL CONDITION. The prior sibling test created a real
 * platform-dependent condition (a FILE where a directory is expected → `readdirSync`
 * throws ENOTDIR) — but the errno + behaviour differ across macos/windows, so the test
 * passed on linux and FAILED elsewhere. Injecting the fault with a chosen `code` pins
 * the LAW (errno-discrimination), never a platform's incidental behaviour.
 *
 * The mock lives in its OWN file (a module mock is file-scoped) so the sibling suite's
 * real-fs corpus walks are never disturbed.
 *
 * @module
 */
import { describe, it, expect, vi } from 'vitest';

/** A read error carrying a chosen errno `code`, mirroring `NodeJS.ErrnoException`. */
function fsError(code: string): Error {
  const err = new Error(`forced ${code}`);
  (err as Error & { code: string }).code = code;
  return err;
}

const { readdirSyncMock } = vi.hoisted(() => ({ readdirSyncMock: vi.fn() }));
vi.mock('node:fs', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, readdirSync: readdirSyncMock };
});

const { collectRepoTestFiles } = await import('../../../../packages/cli/src/lib/test-corpus.js');

describe('test-corpus read fault discrimination — ENOENT is a tolerated skip, any other errno propagates', () => {
  // Each test sets a FRESH `mockImplementation`, fully overriding the prior one (no
  // mockReset — resetting a mocked module export detaches the binding from the loaded
  // module, so the next mockImplementation would not take effect).

  it('an ENOENT (a missing tier) is SKIPPED, never thrown — the empty corpus is returned', () => {
    // Every scanned root readdir throws ENOENT (the tier is absent) → all skipped.
    readdirSyncMock.mockImplementation(() => {
      throw fsError('ENOENT');
    });
    expect(collectRepoTestFiles('/anywhere')).toEqual([]);
  });

  it('a non-ENOENT read fault (EACCES) PROPAGATES — never a silent swallow into an empty corpus', () => {
    readdirSyncMock.mockImplementation(() => {
      throw fsError('EACCES');
    });
    expect(() => collectRepoTestFiles('/anywhere')).toThrow(/forced EACCES/);
  });

  it('a non-ENOENT read fault (EIO — a real disk fault) PROPAGATES, never masked as a missing tier', () => {
    readdirSyncMock.mockImplementation(() => {
      throw fsError('EIO');
    });
    expect(() => collectRepoTestFiles('/anywhere')).toThrow(/forced EIO/);
  });

  it('a read error with NO code at all still PROPAGATES (unknown ⇒ loud, never a skip)', () => {
    readdirSyncMock.mockImplementation(() => {
      throw new Error('codeless fault'); // no .code ⇒ not ENOENT ⇒ rethrown
    });
    expect(() => collectRepoTestFiles('/anywhere')).toThrow(/codeless fault/);
  });
});
