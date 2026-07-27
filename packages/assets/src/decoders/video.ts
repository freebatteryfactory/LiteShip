/** Bounded, injected ffprobe metadata decoder with explicit failure classes. */

import { IoError, ParseError, ValidationError } from '@liteship/error';

/** Decoded video container + codec metadata. */
export interface DecodedVideo {
  readonly container: string;
  readonly codec?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationSec?: number;
  readonly fps?: number;
}

export type VideoProbeResult =
  | { readonly kind: 'success'; readonly stdout: string }
  | { readonly kind: 'unavailable'; readonly detail: string }
  | { readonly kind: 'timeout'; readonly detail: string }
  | { readonly kind: 'rejected'; readonly status: number | null; readonly stderr: string };

export interface VideoDecodeHost {
  readonly createTempDir: () => string;
  readonly probeFilePath: (directory: string) => string;
  readonly writeProbeFile: (path: string, bytes: Uint8Array) => void;
  readonly probe: (path: string) => VideoProbeResult;
  readonly cleanup: (directory: string) => void;
}

const MAX_PROBE_OUTPUT_BYTES = 1_048_576;

/** Probe a video buffer for container/codec metadata. */
export async function videoDecoder(bytes: ArrayBuffer, sourcePath?: string): Promise<DecodedVideo> {
  const [{ spawnSync }, { writeFileSync, mkdtempSync, rmSync }, { tmpdir }, { join }] = await Promise.all([
    import('node:child_process'),
    import('node:fs'),
    import('node:os'),
    import('node:path'),
  ]);
  const host: VideoDecodeHost = {
    createTempDir: () => mkdtempSync(join(tmpdir(), 'liteship-video-')),
    probeFilePath: (directory) => join(directory, 'input.bin'),
    writeProbeFile: (path, data) => writeFileSync(path, data),
    probe: (path) => {
      const result = spawnSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], {
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: MAX_PROBE_OUTPUT_BYTES,
      });
      const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'ENOENT') return { kind: 'unavailable', detail: result.error?.message ?? 'ffprobe not found' };
      if (code === 'ETIMEDOUT') return { kind: 'timeout', detail: result.error?.message ?? 'ffprobe timed out' };
      if (result.error !== undefined) {
        return { kind: 'rejected', status: result.status, stderr: result.error.message };
      }
      if (result.status !== 0) return { kind: 'rejected', status: result.status, stderr: result.stderr };
      return { kind: 'success', stdout: result.stdout };
    },
    cleanup: (directory) => rmSync(directory, { recursive: true, force: true }),
  };
  return decodeVideoWithHost(bytes, sourcePath, host);
}

/** Dependency-injected semantic core used by deterministic fault simulation. */
export function decodeVideoWithHost(
  bytes: ArrayBuffer,
  sourcePath: string | undefined,
  host: VideoDecodeHost,
): DecodedVideo {
  if (bytes.byteLength === 0) {
    const at = sourcePath ? ` (source: ${sourcePath})` : '';
    throw ValidationError(
      'video.decode',
      `videoDecoder: empty buffer${at} — verify the asset source file is readable and non-empty.`,
    );
  }

  let directory: string | undefined;
  let result: DecodedVideo | undefined;
  let primaryError: unknown;
  try {
    directory = host.createTempDir();
    const file = host.probeFilePath(directory);
    try {
      host.writeProbeFile(file, new Uint8Array(bytes));
    } catch (error) {
      const at = sourcePath ? ` for asset source '${sourcePath}'` : '';
      const detail = error instanceof Error ? error.message : String(error);
      throw IoError('video.decode', `videoDecoder: failed to write probe file${at}: ${detail}`, {
        ...(sourcePath !== undefined ? { path: sourcePath } : {}),
        cause: error,
      });
    }
    const probe = host.probe(file);
    switch (probe.kind) {
      case 'unavailable':
        result = { container: sniffContainer(bytes) };
        break;
      case 'timeout':
        throw IoError('video.decode', `ffprobe timed out: ${probe.detail}`);
      case 'rejected':
        throw ValidationError(
          'video.decode',
          `ffprobe rejected the media (status ${String(probe.status)}): ${probe.stderr.slice(0, 512)}`,
        );
      case 'success':
        result = decodeProbeJson(probe.stdout, bytes);
        break;
    }
  } catch (error) {
    primaryError = error;
  }

  let cleanupError: unknown;
  if (directory !== undefined) {
    try {
      host.cleanup(directory);
    } catch (error) {
      cleanupError = IoError('video.decode', `videoDecoder: failed to remove probe directory: ${String(error)}`, {
        path: directory,
        cause: error,
      });
    }
  }
  if (primaryError !== undefined && cleanupError !== undefined) {
    throw new AggregateError([primaryError, cleanupError], 'videoDecoder failed and cleanup also failed');
  }
  if (primaryError !== undefined) throw primaryError;
  if (cleanupError !== undefined) throw cleanupError;
  if (result === undefined) throw IoError('video.decode', 'videoDecoder completed without a result');
  return result;
}

function decodeProbeJson(stdout: string, bytes: ArrayBuffer): DecodedVideo {
  if (Buffer.byteLength(stdout, 'utf8') > MAX_PROBE_OUTPUT_BYTES) {
    throw ParseError('video.probe', `ffprobe output exceeds ${MAX_PROBE_OUTPUT_BYTES} bytes.`, {
      code: 'malformed',
      offset: MAX_PROBE_OUTPUT_BYTES,
    });
  }
  let data: {
    format?: { format_name?: unknown; duration?: unknown };
    streams?: unknown;
  };
  try {
    data = JSON.parse(stdout) as typeof data;
  } catch {
    throw ParseError('video.probe', 'ffprobe returned malformed JSON.', { code: 'malformed', offset: 0 });
  }
  if (data === null || typeof data !== 'object') {
    throw ParseError('video.probe', 'ffprobe JSON root must be an object.', { code: 'malformed', offset: 0 });
  }
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const video = streams.find(
    (entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === 'object' && (entry as Record<string, unknown>).codec_type === 'video',
  );
  const container =
    typeof data.format?.format_name === 'string' && data.format.format_name.length > 0
      ? data.format.format_name
      : sniffContainer(bytes);
  const durationSec = optionalFiniteNumber(data.format?.duration, 'duration', { positive: false });
  const width = optionalDimension(video?.width, 'width');
  const height = optionalDimension(video?.height, 'height');
  const fps = video?.r_frame_rate === undefined ? undefined : parseFrameRate(video.r_frame_rate);
  return {
    container,
    ...(typeof video?.codec_name === 'string' && video.codec_name.length > 0 ? { codec: video.codec_name } : {}),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(durationSec === undefined ? {} : { durationSec }),
    ...(fps === undefined ? {} : { fps }),
  };
}

function optionalFiniteNumber(
  value: unknown,
  field: string,
  options: { readonly positive: boolean },
): number | undefined {
  if (value === undefined) return undefined;
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || (options.positive ? number <= 0 : number < 0)) {
    throw ParseError(
      'video.probe',
      `${field} must be a finite ${options.positive ? 'positive' : 'non-negative'} number.`,
      {
        code: 'malformed',
        offset: 0,
      },
    );
  }
  return number;
}

function optionalDimension(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw ParseError('video.probe', `${field} must be a positive safe integer.`, { code: 'malformed', offset: 0 });
  }
  return value as number;
}

function parseFrameRate(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw ParseError('video.probe', 'frame rate must be a number or fraction string.', {
      code: 'malformed',
      offset: 0,
    });
  }
  const [numeratorText, denominatorText] = String(value).split('/');
  const numerator = Number(numeratorText);
  const denominator = denominatorText === undefined ? 1 : Number(denominatorText);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) {
    throw ParseError('video.probe', `invalid frame rate ${JSON.stringify(value)}.`, { code: 'malformed', offset: 0 });
  }
  return numerator / denominator;
}

function sniffContainer(bytes: ArrayBuffer): string {
  const view = new DataView(bytes);
  if (view.byteLength >= 12 && fourCC(view, 4) === 'ftyp') {
    const boxSize = view.getUint32(0);
    if (boxSize < 8 || boxSize > view.byteLength) {
      throw ValidationError(
        'video.decode',
        `MP4 ftyp box declares invalid size ${boxSize} for ${view.byteLength} bytes`,
      );
    }
    return 'mp4';
  }
  if (view.byteLength >= 4 && view.getUint32(0) === 0x1a45dfa3) return 'webm';
  throw ValidationError('video.decode', 'ffprobe is unavailable and the buffer has no supported MP4/WebM signature');
}

function fourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}
