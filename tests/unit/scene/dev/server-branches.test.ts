/**
 * Branch coverage for the scene-dev server bootstrap (runtime-seams hotspot:
 * 20% branches). The peer suite (server.test.ts) boots a REAL Vite server and
 * proves the live contract; this suite mocks `vite` so the arms a healthy
 * boot never takes are still proven: the watcher's change filter, the
 * resolvedUrls fallbacks, and the published-consumer player root.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as NodeFs from 'node:fs';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';

const { createServerMock, existsSyncMock } = vi.hoisted(() => ({
  createServerMock: vi.fn(),
  existsSyncMock: vi.fn(() => true),
}));
vi.mock('vite', () => ({ createServer: createServerMock }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof NodeFs>()),
  existsSync: existsSyncMock,
}));

import { startDevServer } from '../../../../packages/scene/src/dev/server.js';

interface FakeViteServer {
  listen: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  resolvedUrls: { local: string[] } | null;
  config: { server: { port?: number } };
  watcher: EventEmitter & { add: ReturnType<typeof vi.fn> };
  ws: { send: ReturnType<typeof vi.fn> };
}

function makeFakeServer(overrides: Partial<Pick<FakeViteServer, 'resolvedUrls' | 'config'>> = {}): FakeViteServer {
  const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });
  return {
    listen: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    resolvedUrls: { local: ['http://localhost:5173/'] },
    config: { server: { port: 5173 } },
    watcher,
    ws: { send: vi.fn() },
    ...overrides,
  };
}

/** Boot through the mock, wiring the liteship-scene-watch plugin like Vite would. */
async function boot(scenePath: string, fake: FakeViteServer) {
  createServerMock.mockImplementation(async (config: { plugins: Array<{ configureServer(s: unknown): void }> }) => {
    for (const plugin of config.plugins) plugin.configureServer(fake);
    return fake;
  });
  return startDevServer(scenePath);
}

beforeEach(() => {
  createServerMock.mockReset();
  existsSyncMock.mockReset();
  existsSyncMock.mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scene watcher change filter', () => {
  it('a change event for the watched scene (suffix match) emits liteship:scene-update', async () => {
    const fake = makeFakeServer();
    await boot('scenes/demo.ts', fake);
    expect(fake.watcher.add).toHaveBeenCalledWith(resolve('scenes/demo.ts'));

    fake.watcher.emit('change', '/abs/project/scenes/demo.ts');
    expect(fake.ws.send).toHaveBeenCalledWith({
      type: 'custom',
      event: 'liteship:scene-update',
      data: { sceneId: '/abs/project/scenes/demo.ts' },
    });
  });

  it('a change event matching by resolved path (not suffix) still emits', async () => {
    const fake = makeFakeServer();
    // Watch via a dotted relative form so `endsWith` misses but resolve() matches.
    await boot('./scenes/demo.ts', fake);

    fake.watcher.emit('change', resolve('scenes/demo.ts'));
    expect(fake.ws.send).toHaveBeenCalledTimes(1);
  });

  it('changes to unrelated files do not emit', async () => {
    const fake = makeFakeServer();
    await boot('scenes/demo.ts', fake);

    fake.watcher.emit('change', '/abs/project/scenes/other.ts');
    expect(fake.ws.send).not.toHaveBeenCalled();
  });
});

describe('url resolution arms', () => {
  it('prefers resolvedUrls.local and appends player.html', async () => {
    const handle = await boot('scenes/demo.ts', makeFakeServer());
    expect(handle.url).toBe('http://localhost:5173/player.html');
  });

  it('falls back to config.server.port when resolvedUrls is absent', async () => {
    const handle = await boot('scenes/demo.ts', makeFakeServer({ resolvedUrls: null, config: { server: { port: 4321 } } }));
    expect(handle.url).toBe('http://localhost:4321/player.html');
  });

  it('falls back to port 0 when neither resolvedUrls nor a port exists', async () => {
    const handle = await boot('scenes/demo.ts', makeFakeServer({ resolvedUrls: null, config: { server: {} } }));
    expect(handle.url).toBe('http://localhost:0/player.html');
  });
});

describe('player root + close', () => {
  it('uses the dist-consumer walk-back root when player.html is not adjacent', async () => {
    existsSyncMock.mockReturnValue(false);
    const fake = makeFakeServer();
    await boot('scenes/demo.ts', fake);
    const config = createServerMock.mock.calls[0]![0] as { root: string };
    // From src/dev the walk-back lands on src/dev again — the arm matters for
    // a published dist/dev/server.js, where it reaches the tarball's src/dev.
    expect(config.root.replace(/\\/g, '/')).toMatch(/src\/dev$/);
  });

  it('close() propagates to the vite server', async () => {
    const fake = makeFakeServer();
    const handle = await boot('scenes/demo.ts', fake);
    await handle.close();
    expect(fake.close).toHaveBeenCalledTimes(1);
  });
});
