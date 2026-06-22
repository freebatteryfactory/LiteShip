/**
 * `czap check --ir` / `--no-cache` CLI wiring (Slice B, B3 — Deliverable 1).
 *
 * Proves the CLI-ONLY IR-enriched path is wired to the production `czap check`
 * subcommand: `--ir` routes to `runGauntletWithRepoIR` (the triangulated
 * cross-check + the B2 verdict cache), `--no-cache` threads the cache bypass, and
 * WITHOUT `--ir` the LEAN, IR-free path runs UNCHANGED (it never builds an IR —
 * the established lean-engine boundary the MCP server depends on).
 *
 * `runGauntletWithRepoIR` is mocked so the assertions pin the FLAG PLUMBING + the
 * receipt shape without paying for a real full-repo `ts.Program` build (proven
 * end-to-end separately in the audit cross-check suite). The lean path's handler is
 * likewise mocked so we can assert the IR builder is NEVER touched on that path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finding, type GauntletResult } from '@czap/gauntlet';

const { runGauntletWithRepoIRMock } = vi.hoisted(() => ({ runGauntletWithRepoIRMock: vi.fn() }));
vi.mock('../../../../packages/cli/src/lib/repo-ir-gauntlet.js', () => ({
  runGauntletWithRepoIR: runGauntletWithRepoIRMock,
}));

const { handlerMock } = vi.hoisted(() => ({ handlerMock: vi.fn() }));
vi.mock('@czap/command', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, checkCommand: { handler: handlerMock } };
});

import { run } from '../../../../packages/cli/src/dispatch.js';

function captureStdout<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string }> {
  let stdout = '';
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: unknown }).write = ((c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  });
  return fn().finally(() => {
    (process.stdout as unknown as { write: typeof orig }).write = orig;
  }).then((result) => ({ result, stdout }));
}

const okResult: GauntletResult = { findings: [], outcomes: [], blocked: false };
const blockedResult: GauntletResult = {
  findings: [finding({ ruleId: 'r/x', severity: 'error', level: 'L2', title: 'boom', detail: 'd' })],
  outcomes: [],
  blocked: true,
};

beforeEach(() => {
  runGauntletWithRepoIRMock.mockReset();
  handlerMock.mockReset();
  handlerMock.mockResolvedValue({
    status: 'ok',
    command: 'check',
    timestamp: '2026-01-01T00:00:00.000Z',
    exitCode: 0,
    payload: { ok: true, blocked: false, findingCount: 0, findings: [] },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('czap check --ir — the CLI-only IR-enriched path', () => {
  it('routes to runGauntletWithRepoIR with the cache ARMED (no --no-cache)', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const { result, stdout } = await captureStdout(() => run(['check', '--ir']));
    expect(result).toBe(0);
    expect(runGauntletWithRepoIRMock).toHaveBeenCalledTimes(1);
    // (repoRoot, now: Date, globs, { noCache, withSymbolReferences, withSupplyChain })
    const [, now, , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(now).toBeInstanceOf(Date);
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: false, withTaint: false, withProof: false, withComposition: false });
    // The lean handler is NEVER touched on the IR path.
    expect(handlerMock).not.toHaveBeenCalled();
    // The receipt carries the SAME CheckPayload shape (ok/blocked/findingCount/findings).
    const receipt = JSON.parse(stdout.trim());
    expect(receipt).toMatchObject({ command: 'check', status: 'ok', ok: true, blocked: false, findingCount: 0, findings: [] });
  });

  it('--ir --no-cache threads the cache BYPASS through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--no-cache']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: true, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: false, withTaint: false, withProof: false, withComposition: false });
  });

  it('--ir --symbols threads the symbol-evidenced oracle opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--symbols']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: true, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: false, withTaint: false, withProof: false, withComposition: false });
  });

  it('--ir --supply-chain threads the avionics supply-chain opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--supply-chain']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: true, withMutate: false, withMcdc: false, withSimulate: false, withTaint: false, withProof: false, withComposition: false });
  });

  it('--ir --mutate threads the avionics mutation opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--mutate']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: true, withMcdc: false, withSimulate: false, withTaint: false, withProof: false, withComposition: false });
  });

  it('--ir --simulate threads the avionics DST (simulation) opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--simulate']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: true, withTaint: false, withProof: false, withComposition: false });
  });

  it('--ir --mcdc threads the avionics MC/DC opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--mcdc']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: true, withSimulate: false, withTaint: false, withProof: false, withComposition: false });
  });

  it('--ir --taint threads the taint-flow opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--taint']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: false, withTaint: true, withProof: false, withComposition: false });
  });

  it('--ir --proof threads the proof-propagation opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--proof']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: false, withTaint: false, withProof: true, withComposition: false });
  });

  it('--ir --composition threads the composition-coverage opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', '--ir', '--composition']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({ noCache: false, withSymbolReferences: false, withSupplyChain: false, withMutate: false, withMcdc: false, withSimulate: false, withTaint: false, withProof: false, withComposition: true });
  });

  it('a blocked IR run exits 1 and the receipt mirrors the engine verdict', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(blockedResult);
    const { result, stdout } = await captureStdout(() => run(['check', '--ir']));
    expect(result).toBe(1);
    const receipt = JSON.parse(stdout.trim());
    expect(receipt.status).toBe('failed');
    expect(receipt.blocked).toBe(true);
    expect(receipt.findingCount).toBe(1);
  });
});

describe('czap check (lean, no --ir) — UNCHANGED, never builds the IR', () => {
  it('runs the lean command handler and NEVER calls runGauntletWithRepoIR', async () => {
    const { result } = await captureStdout(() => run(['check']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The MCP-safe boundary: the lean path never touches the IR builder.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --no-cache (no --ir) stays on the lean path (no silent IR run)', async () => {
    const { result } = await captureStdout(() => run(['check', '--no-cache']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --supply-chain (no --ir) stays on the lean path (no silent IR/SBOM run)', async () => {
    const { result } = await captureStdout(() => run(['check', '--supply-chain']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --mutate (no --ir) stays on the lean path (no silent IR/mutation run)', async () => {
    const { result } = await captureStdout(() => run(['check', '--mutate']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The mutation run mutates real source in place — a bare --mutate must NEVER
    // silently trigger it off the lean path.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --simulate (no --ir) stays on the lean path (no silent IR/simulation run)', async () => {
    const { result } = await captureStdout(() => run(['check', '--simulate']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The DST corpus only runs on the IR path — a bare --simulate must NEVER silently
    // trigger the seeded-world replay off the lean path.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });
});
