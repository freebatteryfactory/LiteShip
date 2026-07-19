/**
 * Direct-ffmpeg render backend. Reads a {@link VideoFrameOutput} async iterable,
 * paints each frame's `CompositeState` to raw RGBA through the ONE deterministic
 * `compositeStateToRgba` painter from `@liteship/core` (the SAME painter the
 * `@liteship/stage` ffmpeg encoder uses), pipes the bytes through ffmpeg stdin, and
 * produces an mp4. The graph's per-frame poses therefore genuinely reach the
 * rendered video — distinct frame state yields distinct pixels, identical state
 * yields byte-identical pixels (content-addressable, replayable). No Revideo
 * dependency — ffmpeg is a standard dev-machine binary.
 *
 * @module
 */

import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import type { Clock, VideoFrameOutput } from '@liteship/core';
import { compositeStateToRgba, systemClock } from '@liteship/core';
import { HostCapabilityError, IoError } from '@liteship/error';
import { probeFfmpegRender } from './ffmpeg-probe.js';

/** Options for `renderWithFfmpeg`. */
export interface RenderOpts {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  /**
   * MONOTONIC clock for the `elapsedMs` DURATION. Defaults to {@link systemClock}
   * (`performance.now`). Injected so a deterministic replay/test can thread a
   * {@link import('@liteship/core').manualClock}; this measures an ELAPSED interval,
   * never a timestamp, so it MUST stay monotonic (an NTP/DST wall-clock jump would
   * corrupt the duration).
   */
  readonly clock?: Clock;
}

/** Result summary after a successful render. */
export interface RenderResult {
  readonly frameCount: number;
  readonly elapsedMs: number;
}

/** Render a frame stream through ffmpeg to an mp4 file. */
export async function renderWithFfmpeg(
  frames: AsyncIterable<VideoFrameOutput>,
  opts: RenderOpts,
): Promise<RenderResult> {
  assertFfmpegAvailable();
  // Monotonic duration clock — `elapsedMs` is an interval, never a timestamp.
  const clock = opts.clock ?? systemClock;
  const start = clock.now();
  const args = [
    '-y',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgba',
    '-s',
    `${opts.width}x${opts.height}`,
    '-r',
    String(opts.fps),
    '-i',
    '-',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    opts.output,
  ];
  const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderrBuf = '';
  proc.stderr.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
  });

  let frameCount = 0;

  try {
    for await (const frame of frames) {
      // Paint REAL pixels from the frame's CompositeState — the SAME
      // deterministic `(state, w, h) → RGBA` painter the @liteship/stage ffmpeg
      // encoder uses. The graph's per-frame poses genuinely reach the video.
      const buf = compositeStateToRgba(frame.state, opts.width, opts.height);
      await writeStdin(proc.stdin, buf);
      frameCount++;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/EPIPE|stdin/i.test(message)) {
      // Re-probe on the failure path: the probe owns the per-platform
      // diagnosis (missing binary vs missing libx264) and its install hint.
      const probe = probeFfmpegRender();
      const diagnosis = probe.ok
        ? 'the encode probe passes, so inspect the ffmpeg stderr tail below'
        : `${probe.detail}${probe.hint ? ` — ${probe.hint}` : ''}`;
      throw IoError(
        'ffmpeg.render',
        `stdin closed before render finished: ${diagnosis}. ffmpeg stderr tail: ${stderrBuf.slice(-500) || message}`,
        { cause: err },
      );
    }
    throw err;
  } finally {
    proc.stdin.end();
  }

  // 'close' (not 'exit') waits for stdio streams to close AND on Windows
  // gives the OS time to release file handles. ffmpeg writes the output mp4
  // directly, so we still verify post-close that the file is actually on
  // disk with non-zero size — ffmpeg has been observed exiting 0 without
  // producing a file when libx264 disagrees with the input pipe in subtle
  // ways. Better a typed error here than the caller trusting a phantom mp4.
  await new Promise<void>((resolveExit, rejectExit) => {
    proc.on('close', (code) => {
      if (code === 0) resolveExit();
      else rejectExit(IoError('ffmpeg.encode', `ffmpeg exited with code ${code}: ${stderrBuf.slice(0, 500)}`));
    });
    proc.on('error', (err) => rejectExit(err));
  });

  // Post-exit reality check: ffmpeg said 0, but did it actually write?
  let size: number;
  try {
    size = statSync(opts.output).size;
  } catch (err) {
    throw IoError(
      'ffmpeg.encode',
      `ffmpeg exited 0 but no output file: ${(err as Error).message}\nffmpeg stderr tail: ${stderrBuf.slice(-500)}`,
      { path: opts.output, cause: err },
    );
  }
  if (size === 0) {
    throw IoError(
      'ffmpeg.encode',
      `ffmpeg exited 0 but wrote a 0-byte file\nffmpeg stderr tail: ${stderrBuf.slice(-500)}`,
      { path: opts.output },
    );
  }

  return { frameCount, elapsedMs: clock.now() - start };
}

function assertFfmpegAvailable(): void {
  const probe = probeFfmpegRender();
  if (!probe.ok) {
    throw HostCapabilityError(
      'ffmpeg',
      probe.hint ? `scene rendering: ${probe.detail}. ${probe.hint}` : `scene rendering: ${probe.detail}`,
    );
  }
}

function writeStdin(stream: NodeJS.WritableStream, buf: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      stream.off('error', onError);
      stream.off('drain', onDrain);
    };
    const onDrain = () => {
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
