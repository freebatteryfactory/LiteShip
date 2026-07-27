/** Deterministic video probe success/fault simulation through the injected host seam. */

import { describe, expect, it } from 'vitest';
import { hasTag } from '@liteship/error';
import {
  decodeVideoWithHost,
  type VideoDecodeHost,
  type VideoProbeResult,
} from '../../../../packages/assets/src/decoders/video.js';

const MP4_HEADER = new Uint8Array([
  0x00, 0x00, 0x00, 0x10, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
]).buffer;
const WEBM_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0xa3, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81]).buffer;

function hostFor(
  probeResult: VideoProbeResult,
  overrides: Partial<VideoDecodeHost> = {},
): { readonly host: VideoDecodeHost; readonly events: string[] } {
  const events: string[] = [];
  return {
    events,
    host: {
      createTempDir: () => {
        events.push('create');
        return '/tmp/video-probe';
      },
      probeFilePath: (directory) => `${directory}/input.bin`,
      writeProbeFile: (_path, bytes) => events.push(`write:${bytes.byteLength}`),
      probe: () => {
        events.push('probe');
        return probeResult;
      },
      cleanup: () => events.push('cleanup'),
      ...overrides,
    },
  };
}

function success(data: unknown): VideoProbeResult {
  return { kind: 'success', stdout: JSON.stringify(data) };
}

describe('decodeVideoWithHost', () => {
  it('projects bounded success metadata and always cleans up', () => {
    const { host, events } = hostFor(
      success({
        format: { format_name: 'mov,mp4,m4a', duration: '2.5' },
        streams: [
          { codec_type: 'audio', codec_name: 'aac' },
          { codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, r_frame_rate: '30000/1001' },
        ],
      }),
    );
    expect(decodeVideoWithHost(MP4_HEADER, undefined, host)).toEqual({
      container: 'mov,mp4,m4a',
      codec: 'h264',
      width: 1920,
      height: 1080,
      durationSec: 2.5,
      fps: expect.closeTo(29.97, 2),
    });
    expect(events).toEqual(['create', 'write:16', 'probe', 'cleanup']);
  });

  it.each([
    ['mp4', MP4_HEADER, 'mp4'],
    ['webm', WEBM_HEADER, 'webm'],
  ] as const)('uses structural %s sniffing only when the probe is unavailable', (_name, bytes, container) => {
    const { host } = hostFor({ kind: 'unavailable', detail: 'ENOENT' });
    expect(decodeVideoWithHost(bytes, undefined, host)).toEqual({ container });
  });

  it('refuses rejected media instead of laundering it through header sniffing', () => {
    const { host } = hostFor({ kind: 'rejected', status: 1, stderr: 'invalid data' });
    expect(() => decodeVideoWithHost(MP4_HEADER, undefined, host)).toThrow(/ffprobe rejected/);
  });

  it('classifies timeout separately and still cleans up', () => {
    const { host, events } = hostFor({ kind: 'timeout', detail: '10s deadline' });
    expect(() => decodeVideoWithHost(MP4_HEADER, undefined, host)).toThrow(/timed out/);
    expect(events.at(-1)).toBe('cleanup');
  });

  it.each([
    ['malformed JSON', '{', /malformed JSON/],
    ['negative duration', JSON.stringify({ format: { duration: '-1' } }), /duration/],
    [
      'zero frame denominator',
      JSON.stringify({ streams: [{ codec_type: 'video', r_frame_rate: '30/0' }] }),
      /frame rate/,
    ],
    ['non-positive width', JSON.stringify({ streams: [{ codec_type: 'video', width: 0 }] }), /width/],
  ] as const)('refuses %s from the probe', (_name, stdout, expected) => {
    const { host } = hostFor({ kind: 'success', stdout });
    expect(() => decodeVideoWithHost(MP4_HEADER, undefined, host)).toThrow(expected);
  });

  it('bounds probe output', () => {
    const { host } = hostFor({ kind: 'success', stdout: 'x'.repeat(1_048_577) });
    expect(() => decodeVideoWithHost(MP4_HEADER, undefined, host)).toThrow(/output exceeds/);
  });

  it('wraps write failure with source identity and still cleans up', () => {
    const { host, events } = hostFor(success({}), {
      writeProbeFile: () => {
        events.push('write-failed');
        throw new Error('disk full');
      },
    });
    expect(() => decodeVideoWithHost(MP4_HEADER, 'clip.mp4', host)).toThrow(/clip\.mp4.*disk full/);
    expect(events.at(-1)).toBe('cleanup');
  });

  it('surfaces cleanup failure after an otherwise successful probe', () => {
    const { host } = hostFor(success({ format: { format_name: 'mp4' } }), {
      cleanup: () => {
        throw new Error('locked');
      },
    });
    expect(() => decodeVideoWithHost(MP4_HEADER, undefined, host)).toThrow(/failed to remove probe directory/);
  });

  it('aggregates primary and cleanup failures so neither sibling is lost', () => {
    const { host } = hostFor(
      { kind: 'rejected', status: 1, stderr: 'bad media' },
      {
        cleanup: () => {
          throw new Error('locked');
        },
      },
    );
    try {
      decodeVideoWithHost(MP4_HEADER, undefined, host);
      throw new Error('expected AggregateError');
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      if (error instanceof AggregateError) {
        expect(error.errors.some((entry) => hasTag(entry, 'ValidationError'))).toBe(true);
        expect(error.errors.some((entry) => hasTag(entry, 'IoError'))).toBe(true);
      }
    }
  });
});
