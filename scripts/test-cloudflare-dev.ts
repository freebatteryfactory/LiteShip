/**
 * Dev-server integration test for Cloudflare + Astro example.
 *
 * Run: pnpm run test:cloudflare-dev
 */
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';
import { runPnpm, spawnPnpm } from './support/pnpm-process.ts';
import { cloudflareChildEnv } from './support/cloudflare-env.ts';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const EXAMPLE_DIR = resolve(REPO_ROOT, 'examples/cloudflare-astro');
const ASTRO_DEV_LOG = resolve(EXAMPLE_DIR, '.astro/dev.log');
const EXAMPLE_BIN_DIR = resolve(EXAMPLE_DIR, 'node_modules/.bin');
const SERVER_READY_TIMEOUT_MS = 120_000;
const REQUEST_TIMEOUT_MS = 30_000;
const INJECTED_MARKERS = ['gpuTier', 'bootstrapSlots', 'installSwapPipeline'] as const;

interface PageReference {
  readonly kind: 'script' | 'modulepreload' | 'stylesheet' | 'api';
  readonly source: string;
  readonly url: URL;
}

interface FetchResult {
  readonly reference: PageReference;
  readonly status: number;
  readonly body: string;
}

function devChildEnv(): Record<string, string> {
  return cloudflareChildEnv({
    ASTRO_TELEMETRY_DISABLED: '1',
    PATH: `${EXAMPLE_BIN_DIR}${delimiter}${process.env.PATH ?? ''}`,
  });
}

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

/** Preserve the bounded tail that explains a failed dev response in cloud logs. */
function boundedTail(value: string, max = 8_000): string {
  return value.length <= max ? value : `[... ${value.length - max} bytes omitted ...]\n${value.slice(-max)}`;
}

function spawnAstroDev(): ReturnType<typeof spawnPnpm> {
  // --background (verified against the installed astro 7.0.3): the CLI daemonizes the
  // real dev server, prints its URL + pid in one line, and the launcher exits. That
  // makes `astro dev stop` the sanctioned cross-platform shutdown of the ACTUAL server
  // process — killing only the foreground pnpm/cmd wrapper (the pre-background behavior)
  // could orphan the server child, especially on Windows.
  return spawnPnpm(['exec', 'astro', 'dev', '--background', '--host', '127.0.0.1'], {
    cwd: EXAMPLE_DIR,
    env: devChildEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function extractReady(output: string): { readonly url: URL; readonly daemonPid?: number } | null {
  const urlMatch = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/);
  if (!urlMatch) return null;
  const pidMatch = output.match(/\bpid\s+(\d+)\b/i);
  // The capture group is all-digits, so Number() is always a (safe-range) integer here.
  return { url: new URL(urlMatch[0]), daemonPid: pidMatch?.[1] !== undefined ? Number(pidMatch[1]) : undefined };
}

function isProcessGoneError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException).code;
  return code === 'ESRCH' || code === 'EPERM';
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (isProcessGoneError(err)) return false;
    throw err;
  }
}

function signalPidGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    if (process.platform === 'win32') {
      process.kill(pid, signal);
    } else {
      process.kill(-pid, signal);
    }
  } catch (err) {
    if (!isProcessGoneError(err)) throw err;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function stopAstroDev(daemonPid: number | undefined): Promise<void> {
  const stop = await runPnpm(['exec', 'astro', 'dev', 'stop'], {
    cwd: EXAMPLE_DIR,
    env: devChildEnv(),
  });
  if (stop.code !== 0 && daemonPid === undefined) {
    console.error(stop.stderr || stop.stdout);
  }
  if (daemonPid === undefined) return;

  await delay(1_000);
  if (!isPidAlive(daemonPid)) return;
  signalPidGroup(daemonPid, 'SIGTERM');
  await delay(1_000);
  if (!isPidAlive(daemonPid)) return;
  signalPidGroup(daemonPid, 'SIGKILL');
}

async function stopLauncher(child: ReturnType<typeof spawnPnpm>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  const closed = await Promise.race([
    new Promise<boolean>((resolve) => child.once('close', () => resolve(true))),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1_000)),
  ]);
  if (closed || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGKILL');
}

function waitForDevServer(
  child: ReturnType<typeof spawnPnpm>,
): Promise<{ url: URL; daemonPid?: number; output: () => string }> {
  let output = '';
  let settled = false;

  return new Promise((resolveReady, rejectReady) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectReady(new Error(`timed out waiting for astro dev URL after ${SERVER_READY_TIMEOUT_MS}ms\n${output}`));
    }, SERVER_READY_TIMEOUT_MS);

    const tryResolve = (): void => {
      const ready = extractReady(output);
      if (ready !== null && !settled) {
        settled = true;
        clearTimeout(timer);
        resolveReady({ ...ready, output: () => output });
      }
    };

    const collect = (chunk: Buffer): void => {
      output += chunk.toString();
      tryResolve();
    };

    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectReady(error);
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      // A daemonizing `astro dev` exits after printing the URL — settle via the one
      // shared resolver before treating the exit as a failure.
      tryResolve();
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectReady(
        new Error(`astro dev exited before listening (code=${code ?? 'null'}, signal=${signal ?? 'null'})\n${output}`),
      );
    });
  });
}

async function fetchText(url: URL): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { status: response.status, body: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

/** Retry a fetch across connection refusals while the daemonized server finishes binding. */
async function fetchTextWithRetry(url: URL, budgetMs: number): Promise<{ status: number; body: string }> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    try {
      return await fetchText(url);
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await delay(500);
    }
  }
}

function parseAttributes(tag: string): Readonly<Record<string, string>> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(attrPattern)) {
    const [, rawName, doubleQuoted, singleQuoted, unquoted] = match;
    if (rawName === undefined) continue;
    attrs[rawName.toLowerCase()] = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
  }
  return attrs;
}

function addReference(refs: Map<string, PageReference>, base: URL, kind: PageReference['kind'], source: string): void {
  if (source.length === 0 || source.startsWith('data:') || source.startsWith('javascript:')) return;
  const url = new URL(source, base);
  if (url.origin !== base.origin) return;
  refs.set(`${kind}:${url.href}`, { kind, source, url });
}

function discoverReferences(html: string, base: URL): readonly PageReference[] {
  const refs = new Map<string, PageReference>();
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = match[0] ?? '';
    const attrs = parseAttributes(tag);
    if (attrs.src !== undefined) {
      addReference(refs, base, 'script', attrs.src);
    }
  }
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0] ?? '';
    const attrs = parseAttributes(tag);
    const rels = (attrs.rel ?? '').split(/\s+/);
    if (attrs.href === undefined) continue;
    if (rels.includes('modulepreload')) {
      addReference(refs, base, 'modulepreload', attrs.href);
    } else if (rels.includes('stylesheet')) {
      // Dev-served CSS (imported styles, boundary CSS) is one of the asset classes the
      // worker-first config can swallow — the harness must not be blind to it.
      addReference(refs, base, 'stylesheet', attrs.href);
    }
  }
  for (const match of html.matchAll(/["'](\/api\/[^"']*)["']/g)) {
    const source = match[1];
    if (source !== undefined) {
      addReference(refs, base, 'api', source);
    }
  }
  return [...refs.values()];
}

function classify(result: FetchResult): string {
  if (result.status === 200) {
    for (const marker of INJECTED_MARKERS) {
      if (result.body.includes(marker)) {
        return `LiteShip-injected page script (${marker})`;
      }
    }
    return result.reference.kind === 'modulepreload'
      ? 'modulepreload dependency'
      : `${result.reference.kind} referenced by page`;
  }

  const path = result.reference.url.pathname;
  if (path.includes('@liteship') || path.includes('liteship') || path.includes('virtual:liteship')) {
    return `probable LiteShip-injected ${result.reference.kind} (${path})`;
  }
  if (path.includes('/_astro/') || path.includes('/@fs/') || path.includes('/@id/') || path.includes('/@vite/')) {
    return `Astro/Vite ${result.reference.kind} (${path})`;
  }
  if (path.endsWith('.css')) {
    return `stylesheet referenced through ${result.reference.kind} (${path})`;
  }
  return `${result.reference.kind} referenced by page (${path})`;
}

function printResults(results: readonly FetchResult[]): void {
  console.log('\nReferenced dev assets:');
  if (results.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const result of results) {
    console.log(
      `  ${result.reference.kind} ${result.reference.source} -> ${result.reference.url.href} -> ${result.status} -> ${classify(result)}`,
    );
  }
}

async function main(): Promise<void> {
  console.log('\n=== Cloudflare + Astro dev integration test ===\n');

  if (process.env.LITESHIP_SKIP_WORKSPACE_BUILD === '1') {
    console.log('[1/4] Workspace build skipped (LITESHIP_SKIP_WORKSPACE_BUILD=1).\n');
  } else {
    console.log('[1/4] Building workspace packages...');
    const build = await runPnpm(['run', 'build'], { cwd: REPO_ROOT, env: { FORCE_COLOR: '0' } });
    if (build.code !== 0) {
      console.error(build.stderr || build.stdout);
      process.exit(1);
    }
    console.log('  Workspace built.\n');
  }

  console.log('[2/4] Starting astro dev (Cloudflare adapter)...');
  const child = spawnAstroDev();
  let daemonPid: number | undefined;
  try {
    const ready = await waitForDevServer(child);
    daemonPid = ready.daemonPid;
    console.log(`  Listening at ${ready.url.href}\n`);

    console.log('[3/4] Fetching / and discovering referenced dev assets...');
    const pageUrl = new URL('/', ready.url);
    // The background CLI prints "running at" as it daemonizes; give the freshly
    // spawned server a bounded window to accept its first connection.
    const page = await fetchTextWithRetry(pageUrl, SERVER_READY_TIMEOUT_MS);
    if (page.status !== 200) {
      console.error(ready.output());
      console.error(`HTTP ${page.status} body:\n${boundedTail(page.body)}`);
      if (existsSync(ASTRO_DEV_LOG)) {
        console.error(`Astro dev log:\n${boundedTail(readFileSync(ASTRO_DEV_LOG, 'utf8'))}`);
      }
      fail(`GET ${pageUrl.href} returned ${page.status}`);
    }
    const references = discoverReferences(page.body, pageUrl);
    console.log(`  Found ${references.length} referenced URL(s).\n`);

    console.log('[4/4] Fetching referenced URLs...');
    const results: FetchResult[] = [];
    for (const reference of references) {
      const fetched = await fetchText(reference.url);
      results.push({ reference, status: fetched.status, body: fetched.body });
    }
    printResults(results);

    // Any non-2xx is a broken dev asset — a Vite transform error surfaces as a 500,
    // an auth/routing misfire as a 403; a gate that only catches 404s is blind to both.
    const broken = results.filter((result) => result.status < 200 || result.status >= 300);
    if (broken.length > 0) {
      console.log('\nBroken referenced URLs (non-2xx):');
      for (const result of broken) {
        console.log(
          `  ${result.reference.kind} ${result.reference.source} -> ${result.reference.url.href} -> HTTP ${result.status} -> ${classify(result)}`,
        );
      }
      process.exitCode = 1;
      return;
    }

    console.log('\n=== Cloudflare + Astro dev integration test passed ===\n');
  } finally {
    await stopAstroDev(daemonPid);
    await stopLauncher(child);
  }
}

await main();
