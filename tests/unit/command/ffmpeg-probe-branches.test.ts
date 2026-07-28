/**
 * Deterministic branch coverage for the ffmpeg render probe (runtime-seams
 * hotspot: 15% branches). The peer suite (ffmpeg-probe.test.ts) probes the
 * REAL machine, so which arms it covers depends on what is installed. This
 * suite mocks spawnSync and the os-release read so every failure arm and
 * every distro hint is proven everywhere.
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import type * as NodeFs from 'node:fs';

const { spawnSyncMock, existsSyncMock, readFileSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn(),
  existsSyncMock: vi.fn(() => false),
  readFileSyncMock: vi.fn((): string => ''),
}));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  spawnSync: spawnSyncMock,
}));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof NodeFs>()),
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
}));

import {
  probeFfmpegRender,
  ffmpegRenderCapable,
  ffmpegProbeTimedOut,
} from '../../../packages/command/src/host/ffmpeg-probe.js';

const versionOk = { status: 0, stdout: 'ffmpeg version 7.0', stderr: '' };

function timeoutError(): Error {
  return Object.assign(new Error('spawnSync ffmpeg ETIMEDOUT'), { code: 'ETIMEDOUT' });
}

function withOsRelease(contents: string | null): void {
  if (contents === null) {
    existsSyncMock.mockReturnValue(false);
  } else {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockReturnValue(contents);
  }
}

afterEach(() => {
  spawnSyncMock.mockReset();
  existsSyncMock.mockReset();
  existsSyncMock.mockReturnValue(false);
  readFileSyncMock.mockReset();
  readFileSyncMock.mockReturnValue('');
  delete process.env.LITESHIP_FFMPEG_PROBE_TIMEOUT_MS;
});

describe('probeFfmpegRender — failure arms (spawn mocked)', () => {
  it('spawn error (binary missing) reports not-on-PATH with a platform hint', () => {
    withOsRelease('ID=ubuntu\n');
    spawnSyncMock.mockReturnValue({ error: new Error('ENOENT'), status: null });
    const probe = probeFfmpegRender();
    expect(probe.ok).toBe(false);
    expect(probe.detail).toBe('ffmpeg not on PATH');
    expect(probe.hint).toBe('sudo apt-get install -y ffmpeg');
  });

  it('nonzero version status reports the probe failure with the status code', () => {
    withOsRelease('ID=fedora\n');
    spawnSyncMock.mockReturnValue({ status: 127, stderr: '' });
    const probe = probeFfmpegRender();
    expect(probe.ok).toBe(false);
    expect(probe.detail).toBe('ffmpeg version probe failed (status 127)');
    expect(probe.hint).toMatch(/dnf swap ffmpeg-free ffmpeg/);
  });

  it('libx264 missing (Unknown encoder stderr) yields the distro-specific swap hint', () => {
    withOsRelease('ID=fedora\nPRETTY_NAME="Fedora Linux 44"\n');
    spawnSyncMock
      .mockReturnValueOnce(versionOk)
      .mockReturnValueOnce({ status: 1, stderr: "Unknown encoder 'libx264'" });
    const probe = probeFfmpegRender();
    expect(probe.ok).toBe(false);
    expect(probe.detail).toBe('ffmpeg present but libx264 encoder unavailable');
    expect(probe.hint).toMatch(/dnf swap ffmpeg-free ffmpeg/);
  });

  it('libx264 missing on debian-family points at apt', () => {
    withOsRelease('ID=debian\n');
    spawnSyncMock
      .mockReturnValueOnce(versionOk)
      .mockReturnValueOnce({ status: 1, stderr: 'Unknown encoder "libx264"' });
    expect(probeFfmpegRender().hint).toMatch(/apt-get install -y ffmpeg/);
  });

  it('libx264 missing with no recognizable distro falls back to the generic hint', () => {
    withOsRelease(null);
    spawnSyncMock
      .mockReturnValueOnce(versionOk)
      .mockReturnValueOnce({ status: 1, stderr: "Unknown encoder 'libx264'" });
    expect(probeFfmpegRender().hint).toMatch(/full ffmpeg build with libx264/);
  });

  it('an unrelated encode failure reports the status, generic platform hint', () => {
    withOsRelease(null);
    spawnSyncMock.mockReturnValueOnce(versionOk).mockReturnValueOnce({ status: 69, stderr: 'pipe burst' });
    const probe = probeFfmpegRender();
    expect(probe.detail).toBe('libx264 encode probe failed (status 69)');
    expect(probe.hint).toMatch(/Install ffmpeg with libx264 support/);
  });

  it('encode killed by signal (status null, no stderr) reports unknown status', () => {
    withOsRelease(null);
    spawnSyncMock.mockReturnValueOnce(versionOk).mockReturnValueOnce({ status: null, stderr: undefined });
    expect(probeFfmpegRender().detail).toBe('libx264 encode probe failed (status unknown)');
  });

  it('an unreadable /etc/os-release degrades to the generic hint (read throws)', () => {
    existsSyncMock.mockReturnValue(true);
    readFileSyncMock.mockImplementation(() => {
      throw new Error('EACCES');
    });
    spawnSyncMock.mockReturnValue({ error: new Error('ENOENT'), status: null });
    expect(probeFfmpegRender().hint).toMatch(/Install ffmpeg with libx264 support/);
  });
});

describe('probeFfmpegRender — bounded execution (scar for CI run 30382383876)', () => {
  it('passes a finite timeout to both probe subprocesses', () => {
    spawnSyncMock.mockReturnValueOnce(versionOk).mockReturnValueOnce({ status: 0, stderr: '' });
    probeFfmpegRender();
    expect(spawnSyncMock).toHaveBeenCalledTimes(2);
    for (const call of spawnSyncMock.mock.calls) {
      const options = call[2] as { timeout?: number };
      expect(options.timeout).toBe(10_000);
    }
  });

  it('classifies a hung version probe as a timeout, not a missing binary', () => {
    withOsRelease('ID=ubuntu\n');
    spawnSyncMock.mockReturnValue({ error: timeoutError(), status: null, signal: 'SIGTERM' });
    const probe = probeFfmpegRender();
    expect(probe.ok).toBe(false);
    expect(probe.detail).toBe('ffmpeg version probe timed out after 10000ms');
    expect(probe.hint).toMatch(/instead of reinstalling/u);
    expect(ffmpegProbeTimedOut(probe)).toBe(true);
  });

  it('classifies a hung libx264 encode probe as a timeout', () => {
    spawnSyncMock
      .mockReturnValueOnce(versionOk)
      .mockReturnValueOnce({ error: timeoutError(), status: null, signal: 'SIGTERM' });
    const probe = probeFfmpegRender();
    expect(probe.ok).toBe(false);
    expect(probe.detail).toBe('libx264 encode probe timed out after 10000ms');
    expect(ffmpegProbeTimedOut(probe)).toBe(true);
  });

  it('does not classify ordinary failures as timeouts', () => {
    spawnSyncMock.mockReturnValue({ error: new Error('ENOENT'), status: null });
    expect(ffmpegProbeTimedOut(probeFfmpegRender())).toBe(false);

    spawnSyncMock.mockReset();
    spawnSyncMock.mockReturnValueOnce(versionOk).mockReturnValueOnce({ status: 1, stderr: 'pipe burst' });
    expect(ffmpegProbeTimedOut(probeFfmpegRender())).toBe(false);
  });

  it('honors an explicit LITESHIP_FFMPEG_PROBE_TIMEOUT_MS budget override', () => {
    process.env.LITESHIP_FFMPEG_PROBE_TIMEOUT_MS = '1234';
    spawnSyncMock.mockReturnValue({ error: timeoutError(), status: null, signal: 'SIGTERM' });
    const probe = probeFfmpegRender();
    expect((spawnSyncMock.mock.calls[0]?.[2] as { timeout?: number }).timeout).toBe(1234);
    expect(probe.detail).toBe('ffmpeg version probe timed out after 1234ms');
  });

  it('refuses a malformed probe-budget override instead of running unbounded', () => {
    process.env.LITESHIP_FFMPEG_PROBE_TIMEOUT_MS = 'soon';
    expect(() => probeFfmpegRender()).toThrow(/positive integer/u);
  });
});

describe('probeFfmpegRender — success arm', () => {
  it('a clean libx264 encode reports ok and capability', () => {
    spawnSyncMock.mockReturnValueOnce(versionOk).mockReturnValueOnce({ status: 0, stderr: '' });
    const probe = probeFfmpegRender();
    expect(probe).toEqual({ ok: true, detail: 'libx264 encode probe ok' });

    spawnSyncMock.mockReset();
    spawnSyncMock.mockReturnValueOnce(versionOk).mockReturnValueOnce({ status: 0, stderr: '' });
    expect(ffmpegRenderCapable()).toBe(true);
  });
});
