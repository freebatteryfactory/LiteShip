import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fileToUri } from '../../packages/mcp-server/src/lsp/diagnostic.js';
import { handle, initialLspState, LITESHIP_CHECK_METHOD } from '../../packages/mcp-server/src/lsp/server.js';

type Phase = 'initial' | 'active' | 'shutdown';
type Operation = 'initialize' | 'check' | 'shutdown' | 'unknown';

const runner = async (): Promise<{ readonly findings: readonly []; readonly blocked: false }> => ({
  findings: [],
  blocked: false,
});

function request(operation: Operation, id: number): string {
  const method =
    operation === 'initialize'
      ? 'initialize'
      : operation === 'check'
        ? LITESHIP_CHECK_METHOD
        : operation === 'shutdown'
          ? 'shutdown'
          : 'textDocument/hover';
  return JSON.stringify({ jsonrpc: '2.0', id, method, params: operation === 'initialize' ? {} : undefined });
}

function responseCode(response: unknown): number | undefined {
  if (typeof response !== 'object' || response === null || !('error' in response)) return undefined;
  return (response as { error: { code: number } }).error.code;
}

describe('LSP lifecycle model', () => {
  it('matches the initialize/active/shutdown protocol for arbitrary request sequences', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.constantFrom<Operation>('initialize', 'check', 'shutdown', 'unknown'), {
        minLength: 1,
        maxLength: 40,
      }), async (operations) => {
        let phase: Phase = 'initial';
        let state = initialLspState();
        for (const [index, operation] of operations.entries()) {
          const step = await handle(request(operation, index + 1), state, runner);
          const code = responseCode(step.result.response);
          if (phase === 'initial') {
            if (operation === 'initialize') {
              expect(code).toBeUndefined();
              expect(step.state.initialized).toBe(true);
              phase = 'active';
            } else {
              expect(code).toBe(-32600);
              expect(step.state).toBe(state);
            }
          } else if (phase === 'active') {
            if (operation === 'check') {
              expect(code).toBeUndefined();
            } else if (operation === 'shutdown') {
              expect(code).toBeUndefined();
              expect(step.state.shuttingDown).toBe(true);
              phase = 'shutdown';
            } else if (operation === 'initialize') {
              expect(code).toBe(-32600);
              expect(step.state).toBe(state);
            } else {
              expect(code).toBe(-32601);
            }
          } else {
            expect(code).toBe(-32600);
            expect(step.state).toBe(state);
          }
          state = step.state;
        }
      }),
      { seed: 0x15_051_1fe, numRuns: 100 },
    );
  });

  it('workspace-rooted URI projection round-trips arbitrary nested Unicode segments', () => {
    const segment = fc.stringMatching(/^[A-Za-z0-9 _-]*[A-Za-z0-9é界][A-Za-z0-9 _é界-]*$/u);
    fc.assert(
      fc.property(
        fc.constantFrom('file:///home/eassa/LiteShip/', 'file:///C:/Users/Eassa/LiteShip/'),
        fc.array(segment, { minLength: 1, maxLength: 5 }),
        (root, segments) => {
          const relative = segments.join('/');
          const uri = fileToUri(relative, root);
          const decoded = decodeURIComponent(new URL(uri).pathname);
          const rootPath = decodeURIComponent(new URL(root).pathname);
          expect(decoded).toBe(`${rootPath}${relative}`);
        },
      ),
      { seed: 0x15_052_1fe, numRuns: 120 },
    );
  });
});
