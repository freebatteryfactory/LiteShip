/** Pure policy for preparing cross-platform CI hosts that execute Node tests. @module */

export const ZERO_SHA = '0000000000000000000000000000000000000000';

export interface StandardsBaseInput {
  readonly baseSha?: string;
  readonly baseRef?: string;
}

export interface StandardsBaseTarget {
  readonly ref: string;
  readonly fetchArgs: readonly string[];
}

/**
 * Choose the exact independent standards baseline for this workflow event.
 * PR base SHA and push-before SHA win; first-push/manual events use the named
 * integration branch. The result is a ref plus the bounded fetch that can make
 * it available in a shallow checkout.
 */
export function standardsBaseTarget(input: StandardsBaseInput): StandardsBaseTarget {
  const sha = input.baseSha?.trim();
  if (sha !== undefined && sha !== '' && sha !== ZERO_SHA) {
    return Object.freeze({ ref: sha, fetchArgs: Object.freeze(['fetch', '--no-tags', '--depth=1', 'origin', sha]) });
  }
  const branch = input.baseRef?.trim() || 'main';
  return Object.freeze({
    ref: `origin/${branch}`,
    fetchArgs: Object.freeze(['fetch', '--no-tags', '--depth=1', 'origin', branch]),
  });
}

export interface HostCommand {
  readonly command: string;
  readonly args: readonly string[];
}

/** Package-manager commands used only when the canonical ffmpeg probe is red. */
export function ffmpegInstallPlan(platform: NodeJS.Platform): readonly HostCommand[] {
  switch (platform) {
    case 'linux':
      return Object.freeze([
        Object.freeze({ command: 'sudo', args: Object.freeze(['apt-get', 'update']) }),
        Object.freeze({ command: 'sudo', args: Object.freeze(['apt-get', 'install', '-y', 'ffmpeg']) }),
      ]);
    case 'darwin':
      return Object.freeze([Object.freeze({ command: 'brew', args: Object.freeze(['install', 'ffmpeg']) })]);
    case 'win32':
      return Object.freeze([
        Object.freeze({ command: 'choco', args: Object.freeze(['install', 'ffmpeg', '--yes', '--no-progress']) }),
      ]);
    default:
      throw new Error(`no CI ffmpeg provisioning law for platform ${platform}`);
  }
}
