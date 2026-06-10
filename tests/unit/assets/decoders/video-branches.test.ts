/**
 * Deterministic branch coverage for the video decoder (runtime-seams
 * hotspot: 47% branches). The peer suite (video.test.ts) runs against the
 * real machine, where ffprobe may or may not exist — so the ffprobe SUCCESS
 * arms (stream projection, duration, fps fraction) were only covered on
 * machines that happened to have it. This suite mocks spawnSync so every
 * arm is proven on every machine.
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

const { spawnSyncMock } = vi.hoisted(() => ({ spawnSyncMock: vi.fn() }));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  spawnSync: spawnSyncMock,
}));

import { videoDecoder } from '../../../../packages/assets/src/decoders/video.js';

const MP4_HEADER = new Uint8Array([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
]).buffer;

const WEBM_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0xa3, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81]).buffer;

const probeResult = (data: unknown) => ({ status: 0, stdout: JSON.stringify(data) });

afterEach(() => {
  spawnSyncMock.mockReset();
});

describe('videoDecoder — ffprobe success arms (spawn mocked)', () => {
  it('projects container, codec, dimensions, duration, and fractional fps', async () => {
    spawnSyncMock.mockReturnValue(
      probeResult({
        format: { format_name: 'mov,mp4,m4a', duration: '2.5' },
        streams: [
          { codec_type: 'audio', codec_name: 'aac' },
          { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30000/1001' },
        ],
      }),
    );
    const decoded = await videoDecoder(MP4_HEADER);
    expect(decoded.container).toBe('mov,mp4,m4a');
    expect(decoded.codec).toBe('h264');
    expect(decoded.width).toBe(1920);
    expect(decoded.height).toBe(1080);
    expect(decoded.durationSec).toBe(2.5);
    expect(decoded.fps).toBeCloseTo(29.97, 2);
  });

  it('an integer r_frame_rate (no denominator) is used as-is', async () => {
    spawnSyncMock.mockReturnValue(
      probeResult({
        format: { format_name: 'matroska,webm' },
        streams: [{ codec_type: 'video', codec_name: 'vp9', r_frame_rate: '25' }],
      }),
    );
    const decoded = await videoDecoder(WEBM_HEADER);
    expect(decoded.fps).toBe(25);
  });

  it('missing format_name falls back to the header sniff; no streams → undefined fields', async () => {
    spawnSyncMock.mockReturnValue(probeResult({}));
    const decoded = await videoDecoder(MP4_HEADER);
    expect(decoded.container).toBe('mp4');
    expect(decoded.codec).toBeUndefined();
    expect(decoded.durationSec).toBeUndefined();
    expect(decoded.fps).toBeUndefined();
  });

  it('audio-only streams leave the video projections undefined', async () => {
    spawnSyncMock.mockReturnValue(
      probeResult({
        format: { format_name: 'mp3' },
        streams: [{ codec_type: 'audio', codec_name: 'mp3' }],
      }),
    );
    const decoded = await videoDecoder(WEBM_HEADER);
    expect(decoded.container).toBe('mp3');
    expect(decoded.codec).toBeUndefined();
    expect(decoded.width).toBeUndefined();
  });
});

describe('videoDecoder — ffprobe unavailable (nonzero status)', () => {
  it.each([
    ['mp4 (ftyp signature)', MP4_HEADER, 'mp4'],
    ['webm (EBML magic)', WEBM_HEADER, 'webm'],
    ['unknown bytes', new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0, 0, 0, 0, 0, 0, 0, 0]).buffer, 'unknown'],
  ])('sniffs %s', async (_label, bytes, expected) => {
    spawnSyncMock.mockReturnValue({ status: 1, stdout: '' });
    const decoded = await videoDecoder(bytes);
    expect(decoded.container).toBe(expected);
  });
});
