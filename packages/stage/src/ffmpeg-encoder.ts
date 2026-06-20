/**
 * Headless ffmpeg {@link FrameEncoder} — the NODE backend of the byte-encode
 * seam. Renders each per-frame {@link CompositeState} to a deterministic RGBA
 * buffer, pipes the raw frames through `ffmpeg` stdin, and reads back a real
 * `.mp4` (ISO-BMFF, H.264/yuv420p) byte stream.
 *
 * This module is NODE-ONLY (`node:child_process`, `node:fs`) and is deliberately
 * NOT imported by `dual-export.ts` (stage's pure graph-walk core). It is
 * INJECTED at the call site — `exportVideoEncoded(graph, ffmpegFrameEncoder())`.
 * The browser counterpart is `@czap/web`'s WebCodecs `captureVideo`; both are
 * real backends of the one {@link FrameEncoder} shape.
 *
 * ffmpeg is a standard dev/CI binary, not a hard dependency: {@link ffmpegEncodeAvailable}
 * probes for it (and for libx264) so callers can env-gate honestly — an
 * absent codec yields a clear skip, never a fake "it encoded".
 *
 * @module
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CompositeState } from '@czap/core';
import { compositeStateToRgba } from '@czap/core';
import { HostCapabilityError, IoError, ValidationError } from '@czap/error';
import type { EncodedVideo, FrameEncoder, VideoEncodeConfig } from './dual-export.js';

// ---------------------------------------------------------------------------
// Capability probe — never fake; let the caller env-gate on a real answer
// ---------------------------------------------------------------------------

/** Result of {@link probeFfmpegEncode}: whether ffmpeg+libx264 can really encode. */
export interface FfmpegEncodeProbe {
  readonly ok: boolean;
  readonly detail: string;
  readonly hint?: string;
}

/**
 * Probe `ffmpeg` (+ libx264) exactly the way {@link ffmpegFrameEncoder} uses it.
 * Fast (sub-second), safe at test-module init. Returns a real verdict so a
 * caller can `test.skip` honestly when the codec is absent.
 */
export function probeFfmpegEncode(bin = 'ffmpeg'): FfmpegEncodeProbe {
  const version = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0) {
    return {
      ok: false,
      detail: version.error ? 'ffmpeg not on PATH' : `ffmpeg version probe failed (status ${version.status})`,
      hint: platformHint(),
    };
  }

  const encode = spawnSync(
    bin,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=64x64:d=0.1',
      '-c:v',
      'libx264',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  );
  if (encode.status === 0) {
    return { ok: true, detail: 'libx264 encode probe ok' };
  }
  const stderr = (encode.stderr ?? '').trim();
  const libx264Missing = /Unknown encoder ['"]?libx264/i.test(stderr);
  return {
    ok: false,
    detail: libx264Missing
      ? 'ffmpeg present but libx264 encoder unavailable'
      : `libx264 encode probe failed (status ${encode.status ?? 'unknown'})`,
    hint: platformHint(),
  };
}

/** True when a real ffmpeg+libx264 encode of the headless video path will work. */
export function ffmpegEncodeAvailable(bin = 'ffmpeg'): boolean {
  return probeFfmpegEncode(bin).ok;
}

function platformHint(): string {
  let os = '';
  if (existsSync('/etc/os-release')) {
    try {
      os = readFileSync('/etc/os-release', 'utf8');
    } catch {
      os = '';
    }
  }
  if (/ubuntu|debian/i.test(os)) return 'sudo apt-get install -y ffmpeg';
  if (/fedora|nobara/i.test(os)) return 'sudo dnf swap ffmpeg-free ffmpeg --allowerasing';
  return 'Install ffmpeg with libx264 support.';
}

// ---------------------------------------------------------------------------
// Frame → RGBA: the ONE shared painter (`@czap/core`'s `compositeStateToRgba`).
// The command ffmpeg render backend uses the SAME function, so a given
// CompositeState yields byte-identical pixels on either headless path.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The ffmpeg FrameEncoder
// ---------------------------------------------------------------------------

/** Options for {@link ffmpegFrameEncoder}. */
export interface FfmpegEncoderOptions {
  /** ffmpeg binary name/path. Default: `'ffmpeg'`. */
  readonly bin?: string;
}

function writeStdin(stream: NodeJS.WritableStream, buf: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      stream.off('error', onError);
      stream.off('drain', onDrain);
    };
    const onError = (err: Error): void => {
      cleanup();
      reject(err);
    };
    const onDrain = (): void => {
      cleanup();
      resolve();
    };
    stream.once('error', onError);
    const ok = stream.write(buf);
    if (ok) {
      cleanup();
      resolve();
    } else {
      stream.once('drain', onDrain);
    }
  });
}

/**
 * Build a real headless {@link FrameEncoder} backed by `ffmpeg`.
 *
 * Pipes raw RGBA frames to `ffmpeg -f rawvideo -pix_fmt rgba ... -c:v libx264
 * -pix_fmt yuv420p out.mp4`, then reads the produced MP4 back as bytes. The
 * output is a genuine ISO-BMFF container (starts with an `ftyp` box) that
 * `ffprobe` validates.
 *
 * Call {@link ffmpegEncodeAvailable} first to env-gate; this throws (never
 * fakes success) when ffmpeg/libx264 is missing or the encode fails.
 */
export function ffmpegFrameEncoder(options?: FfmpegEncoderOptions): FrameEncoder {
  const bin = options?.bin ?? 'ffmpeg';

  return async (frames: readonly CompositeState[], config: VideoEncodeConfig): Promise<EncodedVideo> => {
    const probe = probeFfmpegEncode(bin);
    if (!probe.ok) {
      throw HostCapabilityError('ffmpeg', probe.hint ? `${probe.detail}. ${probe.hint}` : probe.detail);
    }
    if (frames.length === 0) {
      throw ValidationError('ffmpeg.encode', 'no frames to encode');
    }

    const dir = mkdtempSync(join(tmpdir(), 'czap-stage-encode-'));
    const output = join(dir, 'out.mp4');
    try {
      const args = [
        '-y',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        '-s',
        `${config.width}x${config.height}`,
        '-r',
        String(config.fps),
        '-i',
        '-',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        output,
      ];
      const proc = spawn(bin, args, { stdio: ['pipe', 'ignore', 'pipe'] });
      let stderrBuf = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString();
      });

      try {
        for (const state of frames) {
          await writeStdin(proc.stdin, compositeStateToRgba(state, config.width, config.height));
        }
      } finally {
        proc.stdin.end();
      }

      await new Promise<void>((resolve, reject) => {
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(IoError('ffmpeg.encode', `ffmpeg exited with code ${code}: ${stderrBuf.slice(-500)}`));
        });
        proc.on('error', (err) => reject(err));
      });

      if (!existsSync(output)) {
        throw IoError(
          'ffmpeg.writeOutput',
          `ffmpeg exited 0 but wrote no file. stderr tail: ${stderrBuf.slice(-500)}`,
          {
            path: output,
          },
        );
      }
      const bytes = new Uint8Array(readFileSync(output));
      if (bytes.byteLength === 0) {
        throw IoError(
          'ffmpeg.writeOutput',
          `ffmpeg exited 0 but wrote a 0-byte file. stderr tail: ${stderrBuf.slice(-500)}`,
          { path: output },
        );
      }

      return { bytes, codec: 'h264', container: 'video/mp4' };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
