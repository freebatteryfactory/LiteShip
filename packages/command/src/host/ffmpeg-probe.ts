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
 * Probe ffmpeg + libx264 the same way scene render uses them.
 * Fast (sub-second) — safe for doctor and test module init.
 */
export function probeFfmpegRender(): FfmpegRenderProbe {
  const version = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
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
    hint: libx264Missing ? libx264MissingHint() : platformFfmpegHint(),
  };
}

function readOsRelease(): string {
  if (!existsSync('/etc/os-release')) return '';
  let contents = '';
  try {
    contents = readFileSync('/etc/os-release', 'utf8');
  } catch {
    // /etc/os-release unreadable (permissions, non-Linux) — fall back to generic hint.
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
