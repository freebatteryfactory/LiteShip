/**
 * Consumer-app integration smell scanner (#117).
 *
 * Read-only scan of consumer *source* for known LiteShip foot-guns.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface ConsumerAppFinding {
  readonly rule: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly title: string;
  readonly file: string;
  readonly line?: number;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.astro']);

function walkSource(root: string, dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(root, abs, out);
      continue;
    }
    if (/\.(ts|tsx|js|jsx|astro|mjs)$/.test(entry.name)) out.push(relative(root, abs));
  }
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Start offset of the innermost `{…}` block enclosing `index`, or 0 at module scope. */
function enclosingBlockStart(source: string, index: number): number {
  const before = source.slice(0, index);
  let depth = 0;
  let blockStart = 0;
  for (let i = 0; i < before.length; i++) {
    const ch = before[i]!;
    if (ch === '{') {
      if (depth === 0) blockStart = i;
      depth++;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return depth > 0 ? blockStart : 0;
}

function scanFile(rel: string, source: string): ConsumerAppFinding[] {
  const findings: ConsumerAppFinding[] = [];

  if (/resolveInitialState\s*\(\s*context\.request\b/.test(source)) {
    const idx = source.search(/resolveInitialState\s*\(\s*context\.request\b/);
    findings.push({
      rule: 'consumer.raw-request-resolve',
      severity: 'warning',
      title: 'resolveInitialState called with raw Request — may silently degrade to synthetic 960px',
      file: rel,
      line: lineOf(source, idx),
    });
  }

  const htmlSinkRe = /\b(innerHTML|outerHTML)\s*=/g;
  let sinkMatch: RegExpExecArray | null;
  while ((sinkMatch = htmlSinkRe.exec(source)) !== null) {
    const idx = sinkMatch.index;
    const block = source.slice(enclosingBlockStart(source, idx), idx + 120);
    // Per-block guard only — a createHtmlFragment import elsewhere in the file
    // must not suppress an unguarded sink in a different function.
    if (block.includes('createHtmlFragment') || block.includes('assignInnerHTML')) {
      continue;
    }
    findings.push({
      rule: 'consumer.unguarded-html-sink',
      severity: 'error',
      title: 'Direct innerHTML/outerHTML assignment without html-trust pipeline',
      file: rel,
      line: lineOf(source, idx),
    });
  }

  if (/\binsertAdjacentHTML\s*\(/.test(source)) {
    const idx = source.search(/\binsertAdjacentHTML\s*\(/);
    findings.push({
      rule: 'consumer.insert-adjacent-html',
      severity: 'warning',
      title: 'insertAdjacentHTML is not routed through html-trust',
      file: rel,
      line: lineOf(source, idx),
    });
  }

  const topLevel = source.split(/\nexport\s+/)[0] ?? source;
  if (
    (/\bDate\.now\s*\(/.test(topLevel) || /\bnew\s+Date\s*\(/.test(topLevel)) &&
    /cloudflare|wrangler|worker/i.test(rel)
  ) {
    findings.push({
      rule: 'consumer.workers-module-scope-date',
      severity: 'warning',
      title: 'Module-scope Date read in Workers-targeted file',
      file: rel,
    });
  }

  if (/data-czap-/.test(source) && !/@czap\//.test(source)) {
    const idx = source.indexOf('data-czap-');
    findings.push({
      rule: 'consumer.hand-built-data-czap',
      severity: 'info',
      title: 'Hand-built data-czap-* attribute — prefer htmlAttributesMap from czapMiddleware',
      file: rel,
      line: lineOf(source, idx),
    });
  }

  return findings;
}

/** Scan consumer app source under `cwd` (prefers `src/` when present). */
export function scanConsumerAppSource(cwd: string): readonly ConsumerAppFinding[] {
  const scanRoot = existsSync(join(cwd, 'src')) ? join(cwd, 'src') : cwd;
  const files: string[] = [];
  walkSource(cwd, scanRoot, files);

  const findings: ConsumerAppFinding[] = [];
  for (const rel of files) {
    const path = join(cwd, rel);
    if (!existsSync(path)) continue;
    findings.push(...scanFile(rel, readFileSync(path, 'utf8')));
  }
  return findings;
}
