import { describe, it, expect, vi, beforeEach } from 'vitest';

import { start, type StartDeps } from '../../../packages/mcp-server/src/start.js';

// No module mock: `start` takes its two transports as an injected `deps` bundle
// (defaulting to the real Node transports), so the dispatch is driven with plain
// scripted stand-ins — the same parameter-injection seam `runStdio(input, output)`
// uses for its streams.
describe('MCP start dispatch', () => {
  let runStdio: ReturnType<typeof vi.fn>;
  let runHttp: ReturnType<typeof vi.fn>;
  let deps: StartDeps;

  beforeEach(() => {
    runStdio = vi.fn(async () => undefined);
    runHttp = vi.fn(async (_bind: number | string) => undefined);
    deps = { runStdio, runHttp };
  });

  it('dispatches to runStdio when no http option is provided', async () => {
    await start({}, deps);
    expect(runStdio).toHaveBeenCalledTimes(1);
    expect(runHttp).not.toHaveBeenCalled();
  });

  it('dispatches to runHttp with the bind string when http option is provided', async () => {
    await start({ http: ':3838' }, deps);
    expect(runHttp).toHaveBeenCalledTimes(1);
    expect(runHttp).toHaveBeenCalledWith(':3838');
    expect(runStdio).not.toHaveBeenCalled();
  });

  it('accepts a plain port number for http and forwards it to runHttp', async () => {
    await start({ http: 3838 }, deps);
    expect(runHttp).toHaveBeenCalledTimes(1);
    expect(runHttp).toHaveBeenCalledWith(3838);
    expect(runStdio).not.toHaveBeenCalled();
  });
});
