/**
 * The verdict-cache READ FAULT-DISCRIMINATION law (Slice B, B2 — the host half), in an
 * isolated module that mocks `node:fs` so a non-best-effort read error (a real disk
 * fault, e.g. EIO) can be forced after the `existsSync` check passes.
 *
 * THE LAW: a read failure whose errno is one of the sanctioned best-effort codes
 * (ENOENT / EACCES / EISDIR / EPERM — a perms issue or a delete/replace race) is a
 * designed MISS → re-run, the SAFE direction. A read failure with NO recognized code
 * (EIO — a genuine hardware/VM fault) is NOT silently degraded into a miss that masks
 * it: it surfaces as a tagged {@link IoError} so the caller sees the real failure
 * rather than a phantom cache miss. Both the gauntlet verdict cache and the mutant
 * verdict cache carry the identical discrimination; both arms are proven here.
 *
 * The mock lives in its OWN file (a module mock is file-scoped) so the sibling suite's
 * real-fs round-trips are never disturbed.
 *
 * @module
 */
import { describe, it, expect, vi } from 'vitest';
import { hasTag } from '@czap/error';

/** A read error carrying a chosen errno `code`, mirroring `NodeJS.ErrnoException`. */
function fsError(code: string): Error {
  const err = new Error(`forced ${code}`);
  (err as Error & { code: string }).code = code;
  return err;
}

const existsSyncMock = vi.fn();
const readFileSyncMock = vi.fn();

vi.mock('node:fs', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, existsSync: existsSyncMock, readFileSync: readFileSyncMock };
});

const { makeFsVerdictCache, makeFsMutantVerdictCache } = await import(
  '../../../../packages/cli/src/lib/gauntlet-verdict-cache.js'
);

describe('verdict-cache read fault discrimination — a sanctioned errno is a MISS, an EIO is a tagged throw', () => {
  it('EACCES/EISDIR/ENOENT/EPERM each read as a sound MISS (null), never a throw', () => {
    const cache = makeFsVerdictCache('/anywhere');
    for (const code of ['ENOENT', 'EACCES', 'EISDIR', 'EPERM']) {
      existsSyncMock.mockReturnValue(true); // the file "exists" at the check
      readFileSyncMock.mockImplementation(() => {
        throw fsError(code);
      });
      expect(cache.read('k')).toBeNull(); // a recognized best-effort code ⇒ MISS
    }
  });

  it('an EIO (a real disk fault, no recognized code) surfaces as a tagged IoError, never a phantom miss', () => {
    const cache = makeFsVerdictCache('/anywhere');
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockImplementation(() => {
      throw fsError('EIO');
    });
    let err: unknown;
    try {
      cache.read('k');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(hasTag(err, 'IoError')).toBe(true); // the fault is surfaced, not masked
  });

  it('a read error with NO code at all is still surfaced as a tagged IoError (unknown ⇒ loud)', () => {
    const cache = makeFsVerdictCache('/anywhere');
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockImplementation(() => {
      throw new Error('codeless fault'); // no .code ⇒ falls through to the throw arm
    });
    let err: unknown;
    try {
      cache.read('k');
    } catch (e) {
      err = e;
    }
    expect(hasTag(err, 'IoError')).toBe(true);
  });
});

describe('MUTANT verdict-cache read fault discrimination — the identical law on the mutant store', () => {
  it('a sanctioned errno (EACCES) is a MISS; an EIO is a tagged IoError', () => {
    const cache = makeFsMutantVerdictCache('/anywhere');

    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockImplementation(() => {
      throw fsError('EACCES');
    });
    expect(cache.read('m')).toBeNull(); // recognized ⇒ MISS

    readFileSyncMock.mockImplementation(() => {
      throw fsError('EIO');
    });
    let err: unknown;
    try {
      cache.read('m');
    } catch (e) {
      err = e;
    }
    expect(hasTag(err, 'IoError')).toBe(true); // unrecognized ⇒ surfaced
  });
});
