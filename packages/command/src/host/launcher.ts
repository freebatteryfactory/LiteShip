/**
 * Dependency-free subprocess launcher kernel.
 *
 * This is the cold-buildable portion of the command host: it owns Windows shim
 * resolution and inherited-environment additions without importing any workspace
 * package. The repository's native TypeScript bootstrap imports this source
 * directly before `@liteship/command` dist exists; the full spawn host reuses the
 * same functions after build.
 *
 * @module
 */

import { spawn } from 'node:child_process';

/** Result of a one-shot visible spawn. */
export interface SpawnResult {
  readonly exitCode: number;
  readonly stderrTail: string;
}

/** Captured result used by cold-build repository bootstrap tools. */
export interface BootstrapCaptureResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  /** Native termination signal; null for an ordinary process exit. */
  readonly signal: NodeJS.Signals | null;
}

/** Exact platform launcher invocation. */
export interface Launcher {
  readonly command: string;
  readonly args: readonly string[];
  readonly windowsVerbatimArguments: boolean;
}

/**
 * Quote one argv token for a Windows cmd.exe command line. Shell metacharacters
 * remain literal bytes inside the quoted token.
 */
export function quoteWindowsArg(arg: string): string {
  if (arg.length === 0) return '""';
  if (!/[\s"&|<>^();]/u.test(arg)) return arg;
  return `"${arg.replaceAll('"', '\\"')}"`;
}

/** Resolve `.cmd`/`.bat` shims explicitly on Windows; POSIX is identity. */
export function resolveLauncher(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): Launcher {
  if (platform !== 'win32') {
    return { command, args, windowsVerbatimArguments: false };
  }
  if (/\.(?:exe|com)$/iu.test(command)) {
    return { command, args, windowsVerbatimArguments: false };
  }
  const commandLine = [command, ...args].map(quoteWindowsArg).join(' ');
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', commandLine], windowsVerbatimArguments: true };
}

/** Merge tool-specific variables without dropping parent coverage/toolchain state. */
export function mergedEnv(additions: Readonly<Record<string, string>> | undefined): NodeJS.ProcessEnv | undefined {
  return additions === undefined ? undefined : { ...process.env, ...additions };
}

/**
 * Run a visible child through the canonical launcher. Stdout is routed to parent
 * stderr so JSON-producing callers retain stdout ownership.
 */
export function spawnArgvVisibleWithEnv(
  command: string,
  args: readonly string[],
  opts: { readonly cwd?: string; readonly envAdditions?: Readonly<Record<string, string>> } = {},
): Promise<SpawnResult> {
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn(launcher.command, launcher.args as string[], {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: false,
      cwd: opts.cwd,
      windowsVerbatimArguments: launcher.windowsVerbatimArguments,
      env: mergedEnv(opts.envAdditions),
    });
    proc.stdout?.pipe(process.stderr, { end: false });
    proc.on('error', rejectPromise);
    proc.on('close', (code) => {
      resolvePromise({ exitCode: code ?? 1, stderrTail: '' });
    });
  });
}

/** Public host-compatible visible spawn with ordinary inherited environment. */
export function spawnArgvVisible(
  command: string,
  args: readonly string[],
  opts: { readonly cwd?: string } = {},
): Promise<SpawnResult> {
  return spawnArgvVisibleWithEnv(command, args, opts);
}

/**
 * Capture a cold-build child while merging bounded tool-specific environment
 * additions over the parent. This stays outside the public command-host API:
 * repository bootstrap tools need it before workspace declarations exist.
 */
export function spawnArgvCaptureWithEnv(
  command: string,
  args: readonly string[],
  opts: {
    readonly cwd?: string;
    readonly envAdditions?: Readonly<Record<string, string>>;
  } = {},
): Promise<BootstrapCaptureResult> {
  const launcher = resolveLauncher(command, args);
  return new Promise((resolvePromise, rejectPromise) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const proc = spawn(launcher.command, launcher.args as string[], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      cwd: opts.cwd,
      windowsVerbatimArguments: launcher.windowsVerbatimArguments,
      env: mergedEnv(opts.envAdditions),
    });
    proc.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk));
    proc.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk));
    proc.on('error', rejectPromise);
    proc.on('close', (code, signal) => {
      resolvePromise({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        signal,
      });
    });
  });
}
