/**
 * doctor — module-scope Date probe for Workers-targeted source (#115).
 *
 * Flags top-level `Date.now()` / `new Date()` in files that look Workers-bound
 * (wrangler config, cloudflare adapter imports, `*.worker.ts`).
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { DoctorCheck } from './types.js';

const DATE_PATTERNS = [/\bDate\.now\s*\(/, /\bnew\s+Date\s*\(/] as const;

const WORKER_PATH_HINTS = ['wrangler', 'cloudflare', '.worker.', '/workers/', 'src/middleware.ts'] as const;

function isWorkersTargeted(rel: string): boolean {
  const lower = rel.toLowerCase();
  return WORKER_PATH_HINTS.some((hint) => lower.includes(hint));
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

function stripForDateScan(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '""');
}

function hasModuleScopeDate(source: string): boolean {
  const stripped = stripForDateScan(source);
  // Deferred arrow initializers evaluate per call — not module-scope ambient time.
  const withoutDeferred = stripped.replace(/\([^)]*\)\s*=>\s*[^{;]+/g, '()=>{}');
  if (/\bexport\s+(?:const|let|var)\s+\w+\s*=[^;{]*\bDate\.now\s*\(/.test(withoutDeferred)) return true;
  if (/\bexport\s+(?:const|let|var)\s+\w+\s*=[^;{]*\bnew\s+Date\s*\(/.test(withoutDeferred)) return true;
  const topLevel =
    withoutDeferred.split(
      /\n(?=\s*(?:export\s+(?:default\s+)?(?:function|class)\b|export\s+default\b|function\s|class\s))/,
    )[0] ?? withoutDeferred;
  return DATE_PATTERNS.some((re) => re.test(topLevel));
}

/**
 * Scan `cwd` for module-scope ambient Date reads in Workers-targeted files.
 */
export function probeWorkersModuleScopeDate(cwd: string): DoctorCheck {
  const srcDir = join(cwd, 'src');
  const files: string[] = [];
  walkSourceFiles(existsSync(srcDir) ? srcDir : cwd, cwd, files);

  const hits: string[] = [];
  for (const rel of files) {
    if (!isWorkersTargeted(rel)) continue;
    const source = readFileSync(join(cwd, rel), 'utf8');
    if (hasModuleScopeDate(source)) hits.push(rel);
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
