// PROVES-CHECK: check/gates
// PROVES-CHECK-EXECUTION: pnpm run check:gates
import { afterEach, describe, expect, it, vi } from 'vitest';
import { noBareThrowGate, runGates } from '@liteship/gauntlet';
import { createNodeCommandContext } from '@liteship/command/host';
import { check } from '../../../../packages/cli/src/commands/check.js';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Drive the exact public lean gate route while changing only the host's fact
 * world. The real command handler, real gate engine, earned-authority ratchet,
 * receipt fold, and process status all remain in the production path.
 */
async function runExactRoute(
  context: 'red' | 'green',
): Promise<{ readonly status: number; readonly receipt: unknown }> {
  let stdout = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  });

  const gateContext = noBareThrowGate.fixtures![context].context;
  const status = await check(
    { cwd: process.cwd(), gates: true, json: true },
    {
      createCommandContext: (cwd) =>
        createNodeCommandContext({
          cwd,
          overrides: {
            runGauntlet: async () => runGates([noBareThrowGate], gateContext),
          },
        }),
    },
  );
  return { status, receipt: JSON.parse(stdout.trim()) as unknown };
}

describe('check/gates exact negative-control route', () => {
  it('turns the real gate red into the exact public command failure receipt', async () => {
    const result = await runExactRoute('red');
    expect(result.status).toBe(1);
    expect(result.receipt).toMatchObject({
      status: 'failed',
      command: 'check.gates',
      ok: false,
      blocked: true,
    });
  });

  it('keeps the same public route green over the gate green fixture', async () => {
    const result = await runExactRoute('green');
    expect(result.status).toBe(0);
    expect(result.receipt).toMatchObject({
      status: 'ok',
      command: 'check.gates',
      ok: true,
      blocked: false,
    });
  });
});
