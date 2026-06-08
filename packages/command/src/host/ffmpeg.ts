/**
 * Direct-ffmpeg render backend. Reads a VideoFrameOutput async iterable,
 * encodes each frame to raw RGBA, pipes through ffmpeg stdin, produces mp4.
 * No Revideo dependency — ffmpeg is a standard dev-machine binary.
 *
 * @module
 */

import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import type { VideoFrameOutput } from '@czap/core';
import { probeFfmpegRender } from './ffmpeg-probe.js';

/** Options for `renderWithFfmpeg`. */
export interface RenderOpts {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
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
  const start = Date.now();
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
      const buf = frameToRGBA(frame, opts.width, opts.height);
      await writeStdin(proc.stdin, buf);
      frameCount++;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/EPIPE|stdin/i.test(message)) {
      throw new Error(
        `ffmpeg stdin closed before render finished (is libx264 available?): ${stderrBuf.slice(-500) || message}`,
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
      else rejectExit(new Error(`ffmpeg exited with code ${code}: ${stderrBuf.slice(0, 500)}`));
    });
    proc.on('error', (err) => rejectExit(err));
  });

  // Post-exit reality check: ffmpeg said 0, but did it actually write?
  let size: number;
  try {
    size = statSync(opts.output).size;
  } catch (err) {
    throw new Error(
      `ffmpeg exited 0 but no output file at ${opts.output}: ${(err as Error).message}\nffmpeg stderr tail: ${stderrBuf.slice(-500)}`,
    );
  }
  if (size === 0) {
    throw new Error(
      `ffmpeg exited 0 but wrote a 0-byte file at ${opts.output}\nffmpeg stderr tail: ${stderrBuf.slice(-500)}`,
    );
  }

  return { frameCount, elapsedMs: Date.now() - start };
}

function assertFfmpegAvailable(): void {
  const probe = probeFfmpegRender();
  if (!probe.ok) {
    throw new Error(
      probe.hint
        ? `ffmpeg scene rendering unavailable: ${probe.detail}. ${probe.hint}`
        : `ffmpeg scene rendering unavailable: ${probe.detail}`,
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

/**
 * Reference encoder — emits an opaque black RGBA buffer of the declared
 * dimensions. Real encoders map CompositeState through the Compositor's
 * multi-target outputs (CSS/GLSL/WGSL/ARIA). This stub produces valid
 * RGBA bytes so ffmpeg can encode the declared number of frames.
 */
function frameToRGBA(_frame: VideoFrameOutput, w: number, h: number): Uint8Array {
  const bytes = new Uint8Array(w * h * 4);
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i + 3] = 255;
  }
  return bytes;
}
