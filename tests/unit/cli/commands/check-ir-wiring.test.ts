/**
 * `liteship check gates --ir` / `--no-cache` CLI wiring (Slice B, B3 — Deliverable 1).
 *
 * Proves the CLI-ONLY IR-enriched path is wired to the production
 * `liteship check gates` subcommand: `--ir` routes to `runGauntletWithRepoIR` (the triangulated
 * cross-check + the B2 verdict cache), `--no-cache` threads the cache bypass, and
 * WITHOUT `--ir` the LEAN, IR-free path runs UNCHANGED (it never builds an IR —
 * the established lean-engine boundary the MCP server depends on).
 *
 * `runGauntletWithRepoIR` is passed through dispatch's injectable engine seam (the
 * defaulted `deps` arg on `run`) so the assertions pin the FLAG PLUMBING + the
 * receipt shape without paying for a real full-repo `ts.Program` build (proven
 * end-to-end separately in the audit cross-check suite). The lean path's handler is
 * injected (through the same dispatch deps seam) so we can assert the IR builder is
 * NEVER touched on that path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finding, type GauntletResult } from '@liteship/gauntlet';

const runGauntletWithRepoIRMock = vi.fn();

// The lean handler is INJECTED through dispatch's `deps.checkHandler` seam (NOT a
// @liteship/command module mock), threaded through `run` → `check` → the lean path,
// so we can assert the IR builder is NEVER touched on that path.
const handlerMock = vi.fn();

import { run as runDispatch } from '../../../../packages/cli/src/dispatch.js';

/** Dispatch with the IR engine + lean handler seams scripted — no real ts.Program build runs. */
const run = (argv: readonly string[]): Promise<number> =>
  runDispatch(argv, { runGauntletWithRepoIR: runGauntletWithRepoIRMock, checkHandler: handlerMock });

function captureStdout<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string }> {
  let stdout = '';
  const orig = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  return fn()
    .finally(() => {
      (process.stdout as unknown as { write: typeof orig }).write = orig;
    })
    .then((result) => ({ result, stdout }));
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
    command: 'check.gates',
    timestamp: '2026-01-01T00:00:00.000Z',
    exitCode: 0,
    payload: { ok: true, blocked: false, findingCount: 0, findings: [] },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('liteship check gates --ir — the CLI-only IR-enriched path', () => {
  it('routes to runGauntletWithRepoIR with the cache ARMED (no --no-cache)', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const { result, stdout } = await captureStdout(() => run(['check', 'gates', '--ir']));
    expect(result).toBe(0);
    expect(runGauntletWithRepoIRMock).toHaveBeenCalledTimes(1);
    // (repoRoot, now: Date, globs, { noCache, withSymbolReferences, withSupplyChain })
    const [, now, , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(now).toBeInstanceOf(Date);
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
    // The lean handler is NEVER touched on the IR path.
    expect(handlerMock).not.toHaveBeenCalled();
    // The receipt carries the SAME CheckPayload shape (ok/blocked/findingCount/findings).
    const receipt = JSON.parse(stdout.trim());
    expect(receipt).toMatchObject({
      command: 'check.gates',
      status: 'ok',
      ok: true,
      blocked: false,
      findingCount: 0,
      findings: [],
    });
  });

  it('--ir --no-cache threads the cache BYPASS through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--no-cache']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: true,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --symbols threads the symbol-evidenced oracle opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--symbols']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: true,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --supply-chain threads the avionics supply-chain opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--supply-chain']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: true,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --mutate threads the avionics mutation opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--mutate']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: true,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --simulate threads the avionics DST (simulation) opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--simulate']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: true,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --mcdc threads the avionics MC/DC opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--mcdc']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: true,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --taint threads the taint-flow opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--taint']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: true,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --proof threads the proof-propagation opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--proof']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: true,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --composition threads the composition-coverage opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--composition']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: true,
      withCapabilityGate: false,
      withSpineRelation: false,
    });
  });

  it('--ir --capability-gate threads the capability-link opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--capability-gate']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: true,
      withSpineRelation: false,
    });
  });

  it('--ir --spine-relation threads the spine-relation opt-in through to runGauntletWithRepoIR', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(okResult);
    const code = await captureStdout(() => run(['check', 'gates', '--ir', '--spine-relation']));
    expect(code.result).toBe(0);
    const [, , , cacheOpts] = runGauntletWithRepoIRMock.mock.calls[0]!;
    expect(cacheOpts).toEqual({
      noCache: false,
      withSymbolReferences: false,
      withSupplyChain: false,
      withMutate: false,
      withMcdc: false,
      withSimulate: false,
      withTaint: false,
      withProof: false,
      withComposition: false,
      withCapabilityGate: false,
      withSpineRelation: true,
    });
  });

  it('a bare --capability-gate (no --ir) stays on the lean path (no silent IR/Program run)', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates', '--capability-gate']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --spine-relation (no --ir) stays on the lean path (no silent IR/Program run)', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates', '--spine-relation']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The spine probe is a second ts.Program build — a bare --spine-relation must NEVER
    // silently trigger it off the lean path.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a blocked IR run exits 1 and the receipt mirrors the engine verdict', async () => {
    runGauntletWithRepoIRMock.mockReturnValue(blockedResult);
    const { result, stdout } = await captureStdout(() => run(['check', 'gates', '--ir']));
    expect(result).toBe(1);
    const receipt = JSON.parse(stdout.trim());
    expect(receipt.status).toBe('failed');
    expect(receipt.blocked).toBe(true);
    expect(receipt.findingCount).toBe(1);
  });
});

describe('liteship check gates (lean, no --ir) — explicit, never builds the IR', () => {
  it('runs the lean command handler and NEVER calls runGauntletWithRepoIR', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The MCP-safe boundary: the lean path never touches the IR builder.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --no-cache (no --ir) stays on the lean path (no silent IR run)', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates', '--no-cache']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --supply-chain (no --ir) stays on the lean path (no silent IR/SBOM run)', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates', '--supply-chain']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --mutate (no --ir) stays on the lean path (no silent IR/mutation run)', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates', '--mutate']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The mutation run mutates real source in place — a bare --mutate must NEVER
    // silently trigger it off the lean path.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a bare --simulate (no --ir) stays on the lean path (no silent IR/simulation run)', async () => {
    const { result } = await captureStdout(() => run(['check', 'gates', '--simulate']));
    expect(result).toBe(0);
    expect(handlerMock).toHaveBeenCalledTimes(1);
    // The DST corpus only runs on the IR path — a bare --simulate must NEVER silently
    // trigger the seeded-world replay off the lean path.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });
});
