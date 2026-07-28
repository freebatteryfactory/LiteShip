/**
 * ffmpeg render capability probe — shared by the render backend, `liteship doctor`,
 * and ffmpeg-gated integration tests. CI installs Ubuntu `ffmpeg` (includes
 * libx264); Fedora often ships `ffmpeg-free` without it.
 *
 * @module
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/** Result of {@link probeFfmpegRender}. */
export interface FfmpegRenderProbe {
  readonly ok: boolean;
  readonly detail: string;
  readonly hint?: string;
}

/** True when ffmpeg on PATH can encode a trivial frame via libx264 (scene render path). */
export function ffmpegRenderCapable(): boolean {
  return probeFfmpegRender().ok;
}

/**
 * Default hard budget per probe subprocess. The probe is normally sub-second,
 * but "normally" is not a contract: a wedged ffmpeg once consumed an entire
 * 30-minute CI job budget, so every probe child is killed at this bound.
 */
const DEFAULT_PROBE_TIMEOUT_MS = 10_000;

/** Module-private timeout classification, matched exactly by {@link ffmpegProbeTimedOut}. */
const PROBE_TIMEOUT_DETAIL = /probe timed out after \d+ms$/u;

const PROBE_TIMEOUT_HINT =
  'ffmpeg did not respond within the probe budget; investigate the stuck host process instead of reinstalling.';

/**
 * True when the probe failed because a probe subprocess hit its time budget.
 * A timeout is evidence the host is wedged, not that ffmpeg is missing —
 * callers must not respond to it by provisioning ffmpeg.
 */
export function ffmpegProbeTimedOut(probe: FfmpegRenderProbe): boolean {
  return !probe.ok && PROBE_TIMEOUT_DETAIL.test(probe.detail);
}

/**
 * Structurally construct the `@liteship/error` ValidationError variant. This
 * module sits in the cold-build closure of `scripts/prepare-ci-test-host.ts`,
 * so it may not VALUE-import `@liteship/error` before dist exists
 * (prebuild-dist-free law); the same `_tag`/`module`/`detail` own properties
 * the factory installs are defined here directly, preserving the tagged,
 * catchable identity the error contract requires.
 */
function probeValidationError(detail: string): Error {
  const error = new Error(`ffmpeg-probe: ${detail}`);
  Object.defineProperty(error, '_tag', { value: 'ValidationError', enumerable: true });
  Object.defineProperty(error, 'module', { value: 'ffmpeg-probe', enumerable: true });
  Object.defineProperty(error, 'detail', { value: detail, enumerable: true });
  return error;
}

function probeTimeoutMs(): number {
  const raw = process.env.LITESHIP_FFMPEG_PROBE_TIMEOUT_MS;
  if (raw === undefined || raw === '') return DEFAULT_PROBE_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw probeValidationError(
      `LITESHIP_FFMPEG_PROBE_TIMEOUT_MS must be a positive integer of milliseconds, got ${JSON.stringify(raw)}`,
    );
  }
  return parsed;
}

function isTimeout(result: { readonly error?: Error }): boolean {
  return result.error !== undefined && (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT';
}

/**
 * Probe ffmpeg + libx264 the same way scene render uses them. Each probe child
 * is bounded by {@link DEFAULT_PROBE_TIMEOUT_MS}; a timeout is reported as its
 * own failure class rather than being misread as a missing binary.
 */
export function probeFfmpegRender(): FfmpegRenderProbe {
  const timeoutMs = probeTimeoutMs();
  const version = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: timeoutMs });
  if (isTimeout(version)) {
    return {
      ok: false,
      detail: `ffmpeg version probe timed out after ${timeoutMs}ms`,
      hint: PROBE_TIMEOUT_HINT,
    };
  }
  if (version.error || version.status !== 0) {
    return {
      ok: false,
      detail: version.error ? 'ffmpeg not on PATH' : `ffmpeg version probe failed (status ${version.status})`,
      hint: platformFfmpegHint(),
    };
  }

  const encode = spawnSync(
    'ffmpeg',
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
    { encoding: 'utf8', timeout: timeoutMs },
  );
  if (isTimeout(encode)) {
    return {
      ok: false,
      detail: `libx264 encode probe timed out after ${timeoutMs}ms`,
      hint: PROBE_TIMEOUT_HINT,
    };
  }
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
    hint: libx264Missing ? libx264MissingHint() : platformFfmpegHint(),
  };
}

function readOsRelease(): string {
  if (!existsSync('/etc/os-release')) return '';
  let contents: string;
  try {
    contents = readFileSync('/etc/os-release', 'utf8');
  } catch {
    // /etc/os-release unreadable (permissions, non-Linux) — record the empty-string
    // "unknown distro" fallback so the caller emits the generic install hint.
    // Non-corrupting: an absent os-release is never a real fault to surface.
    contents = '';
  }
  return contents;
}

function libx264MissingHint(): string {
  const os = readOsRelease();
  if (/fedora|nobara/i.test(os)) {
    return 'Fedora: sudo dnf swap ffmpeg-free ffmpeg --allowerasing (RPM Fusion required). Or reopen in the Dev Container.';
  }
  if (/ubuntu|debian/i.test(os)) {
    return 'sudo apt-get install -y ffmpeg. Or reopen in the Dev Container (.devcontainer/).';
  }
  return 'Install a full ffmpeg build with libx264 (CI: apt install ffmpeg on Ubuntu). Or reopen in the Dev Container.';
}

function platformFfmpegHint(): string {
  const os = readOsRelease();
  if (/ubuntu|debian/i.test(os)) return 'sudo apt-get install -y ffmpeg';
  if (/fedora|nobara/i.test(os)) return 'sudo dnf swap ffmpeg-free ffmpeg --allowerasing';
  return 'Install ffmpeg with libx264 support, or reopen in the Dev Container (.devcontainer/).';
}
