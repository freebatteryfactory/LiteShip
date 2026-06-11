/**
 * Branch coverage for the browser host context (runtime-seams hotspot: 15%
 * branches). webmcp.test.ts only constructs the context; the MCP delegation
 * seam (renderScene → tools/call fetch, JSON-RPC error/isError arms, payload
 * defaulting) was never driven. fetch is stubbed — no network.
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createBrowserCommandContext, browserSafeCommandNames } from '@czap/command/host-browser';

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async () => ({ json: async () => body }));
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserCommandContext — local stubs', () => {
  it('defaults (no opts): file/asset/scene surfaces report unavailable, no renderScene', async () => {
    const context = createBrowserCommandContext();
    expect(context.renderScene).toBeUndefined();
    expect(context.fileExists('x')).toBe(false);
    expect(context.readFileBytes('x')).toBeNull();
    expect(context.loadAssetBytes!('x')).toBeNull();
    expect(await context.loadSceneModule!('x')).toBeNull();
    expect(await context.runVitest!({ paths: [] })).toEqual({
      exitCode: 1,
      stderrTail: 'vitest unavailable in browser host',
    });
    expect(await context.runAudioProjection!('onset', new ArrayBuffer(0))).toBe(0);
    expect(context.hostVersion!()).toBe('browser');
    expect(await context.spawnCapture!('ls', [])).toEqual({ exitCode: 1, stdout: '' });
    expect(await context.runSceneCompile!()).toBeUndefined();
  });

  it('browserSafeCommandNames lists the delegation-free registry subset', () => {
    expect(browserSafeCommandNames()).toEqual(expect.arrayContaining(['capsule.inspect', 'capsule.list', 'glossary']));
  });
});

describe('renderScene MCP delegation (fetch stubbed)', () => {
  const URL = 'http://localhost:9999/mcp';

  it('a successful tools/call projects frameCount and elapsedMs', async () => {
    const fetchMock = stubFetch({ result: { structuredContent: { frameCount: 24, elapsedMs: 130 } } });
    const context = createBrowserCommandContext({ mcpServerUrl: URL });
    const result = await context.renderScene!({ sceneId: 'intro' } as never);
    expect(result).toEqual({ frameCount: 24, elapsedMs: 130 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(URL);
    expect(JSON.parse((init as { body: string }).body)).toMatchObject({
      method: 'tools/call',
      params: { name: 'scene.render' },
    });
  });

  it('a payload missing the projection fields defaults both to 0', async () => {
    stubFetch({ result: { structuredContent: {} } });
    const context = createBrowserCommandContext({ mcpServerUrl: URL });
    expect(await context.renderScene!({} as never)).toEqual({ frameCount: 0, elapsedMs: 0 });
  });

  it('a null structuredContent defaults the whole payload', async () => {
    stubFetch({ result: {} });
    const context = createBrowserCommandContext({ mcpServerUrl: URL });
    expect(await context.renderScene!({} as never)).toEqual({ frameCount: 0, elapsedMs: 0 });
  });

  it('a JSON-RPC error response throws the delegation failure naming the server + remote payload', async () => {
    stubFetch({ error: { code: -32000, message: 'boom' } });
    const context = createBrowserCommandContext({ mcpServerUrl: URL });
    const failure = await context.renderScene!({} as never).then(
      () => undefined,
      (err: Error) => err.message,
    );
    expect(failure).toContain(`scene.render delegation to ${URL} failed`);
    expect(failure).toContain('"boom"');
    expect(failure).toContain('czap mcp --http=PORT');
  });

  it('result.isError throws the delegation failure too', async () => {
    stubFetch({ result: { isError: true, structuredContent: { frameCount: 1 } } });
    const context = createBrowserCommandContext({ mcpServerUrl: URL });
    await expect(context.renderScene!({} as never)).rejects.toThrow(`scene.render delegation to ${URL} failed`);
  });
});
