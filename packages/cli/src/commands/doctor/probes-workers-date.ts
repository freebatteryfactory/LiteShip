/**
 * doctor — module-scope Date probe for Workers-targeted source (#115).
 *
 * Flags top-level `Date.now()` / `new Date()` in files that look Workers-bound
 * (wrangler config, cloudflare adapter imports, `*.worker.ts`) or in any file
 * under a Workers project (wrangler.toml/json present).
 *
 * @module
 */

import { normalizeRepoPath, scanModuleScopeDateReads } from '@czap/audit';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { readWranglerConfig } from './manifest.js';
import type { DoctorCheck } from './types.js';

const WORKER_PATH_HINTS = ['wrangler', 'cloudflare', '.worker.', '/workers/', 'src/middleware.ts'] as const;

const DEFAULT_WRANGLER_MAIN = 'src/index.ts';

function isWorkersTargeted(rel: string): boolean {
  const lower = normalizeRepoPath(rel).toLowerCase();
  return WORKER_PATH_HINTS.some((hint) => lower.includes(hint));
}

function parseJsonWranglerMain(config: string): string {
  const stripped = config.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const quotedMain = /"main"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(stripped);
  if (quotedMain?.[1]) {
    return normalizeRepoPath(quotedMain[1].replace(/\\"/g, '"'));
  }
  const singleQuotedMain = /'main'\s*:\s*'([^']+)'/.exec(stripped);
  if (singleQuotedMain?.[1]) {
    return normalizeRepoPath(singleQuotedMain[1]);
  }
  return DEFAULT_WRANGLER_MAIN;
}

function parseWranglerMain(cwd: string): string {
  for (const name of ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml']) {
    const path = resolve(cwd, name);
    if (!existsSync(path)) continue;
    const config = readFileSync(path, 'utf8');
    if (name.endsWith('.toml')) {
      const tomlMatch = /^\s*main\s*=\s*["']([^"']+)["']/m.exec(config);
      return tomlMatch?.[1] ? normalizeRepoPath(tomlMatch[1]) : DEFAULT_WRANGLER_MAIN;
    }
    return parseJsonWranglerMain(config);
  }
  return DEFAULT_WRANGLER_MAIN;
}

function walkSourceFiles(dir: string, root: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      walkSourceFiles(abs, root, out);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) continue;
    out.push(relative(root, abs));
  }
}

/**
 * Does `source` read the wall clock at MODULE LOAD? Delegates to the ONE shared AST scanner
 * (`@czap/audit`'s {@link scanModuleScopeDateReads}) — the same definition the consumer-app audit
 * uses (Law 6). `rel` only selects the parse mode (`.tsx`/`.jsx` → JSX). A file that reads the clock
 * only inside deferred (per-call) bodies is correctly NOT a hit.
 */
function hasModuleScopeDate(source: string, rel: string): boolean {
  return scanModuleScopeDateReads(source, rel).length > 0;
}

function shouldScanFile(rel: string, workersProject: boolean, wranglerMain: string): boolean {
  const normalized = normalizeRepoPath(rel);
  if (workersProject) {
    return normalized.startsWith('src/') || normalized === wranglerMain;
  }
  return isWorkersTargeted(rel);
}

/**
 * Scan `cwd` for module-scope ambient Date reads in Workers-targeted files.
 */
export function probeWorkersModuleScopeDate(cwd: string): DoctorCheck {
  const wrangler = readWranglerConfig(cwd);
  const workersProject = wrangler.kind === 'ok';
  const wranglerMain = workersProject ? parseWranglerMain(cwd) : DEFAULT_WRANGLER_MAIN;

  const srcDir = join(cwd, 'src');
  const files: string[] = [];
  walkSourceFiles(existsSync(srcDir) ? srcDir : cwd, cwd, files);

  if (workersProject && !files.some((rel) => normalizeRepoPath(rel) === wranglerMain)) {
    const mainAbs = join(cwd, wranglerMain);
    if (existsSync(mainAbs)) {
      files.push(wranglerMain);
    }
  }

  const hits: string[] = [];
  for (const rel of files) {
    if (!shouldScanFile(rel, workersProject, wranglerMain)) continue;
    const source = readFileSync(join(cwd, rel), 'utf8');
    if (hasModuleScopeDate(source, rel)) hits.push(normalizeRepoPath(rel));
  }

  if (hits.length === 0) {
    return {
      id: 'workers.module-scope-date',
      label: 'Workers module-scope Date',
      status: 'ok',
      detail: 'no module-scope Date.now()/new Date() in Workers-targeted source',
    };
  }

  return {
    id: 'workers.module-scope-date',
    label: 'Workers module-scope Date',
    status: 'warn',
    detail: `module-scope Date reads in: ${hits.slice(0, 5).join(', ')}${hits.length > 5 ? ` (+${hits.length - 5} more)` : ''}`,
    hint: 'Workers freeze module-scope time at epoch — inject wallClock per request instead',
  };
}
