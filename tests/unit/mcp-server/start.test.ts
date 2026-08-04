import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { start, type StartDeps } from '../../../packages/mcp-server/src/start.js';

// No module mock: `start` takes its two transports as an injected `deps` bundle
// (defaulting to the real Node transports), so the dispatch is driven with plain
// scripted stand-ins — the same parameter-injection seam `runStdio(input, output)`
// uses for its streams.
describe('MCP start dispatch', () => {
  // Typed at the seam they are injected into: `ReturnType<typeof vi.fn>` is the
  // erased `Mock<Constructable | Procedure>`, which carries neither transport's
  // parameter list nor its handle return, so a stand-in that does not honour
  // `StartDeps` could not be caught here.
  let startStdio: Mock<StartDeps['startStdio']>;
  let startHttp: Mock<StartDeps['startHttp']>;
  let deps: StartDeps;
  const stdioHandle = { transport: 'stdio' as const, done: Promise.resolve(), stop: vi.fn(async () => undefined) };
  const httpHandle = { transport: 'http' as const, done: Promise.resolve(), stop: vi.fn(async () => undefined) };

  beforeEach(() => {
    startStdio = vi.fn(async () => stdioHandle);
    startHttp = vi.fn(async (_bind: number | string) => httpHandle);
    deps = { startStdio, startHttp };
  });

  it('dispatches to stdio and returns its explicit lifecycle handle', async () => {
    await expect(start({}, deps)).resolves.toBe(stdioHandle);
    expect(startStdio).toHaveBeenCalledTimes(1);
    expect(startHttp).not.toHaveBeenCalled();
  });

  it('dispatches to HTTP with the bind string and returns its explicit lifecycle handle', async () => {
    await expect(start({ http: ':3838' }, deps)).resolves.toBe(httpHandle);
    expect(startHttp).toHaveBeenCalledTimes(1);
    expect(startHttp).toHaveBeenCalledWith(':3838');
    expect(startStdio).not.toHaveBeenCalled();
  });

  it('accepts a plain port number for http and forwards it to runHttp', async () => {
    await start({ http: 3838 }, deps);
    expect(startHttp).toHaveBeenCalledTimes(1);
    expect(startHttp).toHaveBeenCalledWith(3838);
    expect(startStdio).not.toHaveBeenCalled();
  });
});
