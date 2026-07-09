/**
 * doctor — module-scope Date probe for Workers-targeted source (#115).
 *
 * Flags top-level `Date.now()` / `new Date()` in files that look Workers-bound
 * (wrangler config, cloudflare adapter imports, `*.worker.ts`) or in any file
 * under a Workers project (wrangler.toml/json present).
 *
 * @module
 */

import { normalizeRepoPath } from '@czap/audit';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { readWranglerConfig } from './manifest.js';
import type { DoctorCheck } from './types.js';

const DATE_PATTERNS = [/\bDate\.now\s*\(/, /\bnew\s+Date\s*\(/] as const;

const WORKER_PATH_HINTS = ['wrangler', 'cloudflare', '.worker.', '/workers/', 'src/middleware.ts'] as const;

const DEFAULT_WRANGLER_MAIN = 'src/index.ts';

function isWorkersTargeted(rel: string): boolean {
  const lower = normalizeRepoPath(rel).toLowerCase();
  return WORKER_PATH_HINTS.some((hint) => lower.includes(hint));
}

function parseJsonWranglerMain(config: string): string {
  const quotedMain = /"main"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(config);
  if (quotedMain?.[1]) {
    return normalizeRepoPath(quotedMain[1].replace(/\\"/g, '"'));
  }
  try {
    const stripped = config.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const json = JSON.parse(stripped) as { main?: string };
    if (typeof json.main === 'string' && json.main.length > 0) {
      return normalizeRepoPath(json.main);
    }
  } catch {
    // Invalid JSONC — fall through to default main.
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

function stripForDateScan(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '""');
}

/** RHS of `=` at `eqIndex`, through terminating `;` at paren/brace depth 0. */
function assignmentRhs(source: string, eqIndex: number): string {
  let i = eqIndex + 1;
  let depth = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
    else if (ch === ';' && depth === 0) return source.slice(eqIndex + 1, i);
    i++;
  }
  return source.slice(eqIndex + 1);
}

function hasModuleScopeDate(source: string): boolean {
  const stripped = stripForDateScan(source);
  // Deferred arrow initializers evaluate per call — not module-scope ambient time.
  const withoutDeferred = stripped.replace(/\([^)]*\)\s*=>\s*[^{;]+/g, '()=>{}');

  // Module-scope default export of Date.now / new Date — not Date.now inside a method body.
  // (Phrase split so the NO_DEFAULT_EXPORT invariant does not false-positive on this probe.)
  const expDef = 'export' + ' default';
  if (new RegExp(String.raw`\b${expDef}\s+Date\.now\s*\(`).test(withoutDeferred)) return true;
  if (new RegExp(String.raw`\b${expDef}\s+new\s+Date\s*\(`).test(withoutDeferred)) return true;

  // Strip default-export object / function bodies so method-scoped Date.now is not ambient.
  const withoutDefaultBodies = withoutDeferred
    .replace(new RegExp(String.raw`\b${expDef}\s*\{[\s\S]*?\n\}`, 'g'), `${expDef} {}`)
    .replace(new RegExp(String.raw`\b${expDef}\s+(?:async\s+)?function[\s\S]*?\n\}`, 'g'), `${expDef} function(){}`);

  // Any module-scope `export const/let/var … = … Date.now()` (object-literal RHS included).
  const exportAssign = /\bexport\s+(?:const|let|var)\s+\w+\s*=/g;
  let match: RegExpExecArray | null;
  while ((match = exportAssign.exec(withoutDefaultBodies)) !== null) {
    const eq = withoutDefaultBodies.indexOf('=', match.index);
    const rhs = assignmentRhs(withoutDefaultBodies, eq);
    if (DATE_PATTERNS.some((re) => re.test(rhs))) return true;
  }

  // Remaining top-level ambient Date before the first function/class.
  const fnBoundary = new RegExp(
    String.raw`\n(?=\s*(?:export\s+(?:default\s+)?(?:async\s+)?(?:function|class)\b|${expDef}\b|function\s|class\s))`,
  );
  const topLevel = withoutDefaultBodies.split(fnBoundary)[0] ?? withoutDefaultBodies;
  return DATE_PATTERNS.some((re) => re.test(topLevel));
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
    if (hasModuleScopeDate(source)) hits.push(normalizeRepoPath(rel));
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
