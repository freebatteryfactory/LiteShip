/**
 * Consumer-app integration smell scanner (#117).
 *
 * Read-only scan of consumer *source* for known LiteShip foot-guns.
 *
 * @module
 */

import { normalizeRepoPath, scanModuleScopeDateReads } from '@liteship/audit';
import { walkFiles } from '@liteship/core/fs-walk';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface ConsumerAppFinding {
  readonly rule: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly title: string;
  readonly file: string;
  readonly line?: number;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.astro']);

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** CRLF sources (Windows checkouts) must not leave stray `\r` in RHS slices. */
function normalizeSourceLines(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * RHS of an assignment starting at `index` (the `innerHTML`/`outerHTML` match),
 * through the terminating `;` — spans newlines so a multiline guarded
 * assignment is not false-positived.
 */
function sinkAssignmentRhs(source: string, index: number): string {
  const eq = source.indexOf('=', index);
  if (eq === -1) return '';
  let i = eq + 1;
  let depth = 0;
  let inStr: '"' | "'" | '`' | null = null;
  while (i < source.length) {
    const ch = source[i]!;
    if (inStr) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      i++;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    if (ch === ')' || ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      return source.slice(eq + 1, i);
    }
    if ((ch === '\n' || ch === '\r') && depth === 0) {
      // Soft end: next non-ws that looks like a new statement.
      const rest = source.slice(i + 1);
      if (/^\s*(?:export\s+|const\s+|let\s+|var\s+|function\s+|return\s+|if\s*\(|for\s*\(|while\s*\(|}|$)/.test(rest)) {
        return source.slice(eq + 1, i);
      }
    }
    i++;
  }
  return source.slice(eq + 1);
}

function scanFile(rel: string, source: string): ConsumerAppFinding[] {
  const findings: ConsumerAppFinding[] = [];
  source = normalizeSourceLines(source);

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
    const rhs = sinkAssignmentRhs(source, idx);
    // Guard must be on the sink's own RHS — not merely present elsewhere in the file/block.
    if (rhs.includes('createHtmlFragment') || rhs.includes('assignInnerHTML')) {
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

  // Module-load ambient Date read in a Workers-targeted file — Law 5's 1970 trap. Uses the ONE shared
  // AST scanner (`@liteship/audit`) the doctor probe uses (Law 6), so the two never drift. `source` here is
  // already CRLF-normalized, so the reported line matches the consumer's editor.
  if (/cloudflare|wrangler|worker/i.test(rel)) {
    const dateHits = scanModuleScopeDateReads(source, rel);
    if (dateHits.length > 0) {
      findings.push({
        rule: 'consumer.workers-module-scope-date',
        severity: 'warning',
        title: 'Module-scope Date read in Workers-targeted file',
        file: rel,
        line: dateHits[0]!.line,
      });
    }
  }

  if (/data-liteship-/.test(source) && !/@liteship\//.test(source)) {
    const idx = source.indexOf('data-liteship-');
    findings.push({
      rule: 'consumer.hand-built-data-liteship',
      severity: 'info',
      title: 'Hand-built data-liteship-* attribute — prefer htmlAttributesMap from liteshipMiddleware',
      file: rel,
      line: lineOf(source, idx),
    });
  }

  return findings;
}

/** Scan consumer app source under `cwd` (prefers `src/` when present). */
export function scanConsumerAppSource(cwd: string): readonly ConsumerAppFinding[] {
  const scanRoot = existsSync(join(cwd, 'src')) ? join(cwd, 'src') : cwd;
  // The shared `@liteship/core/fs-walk` walker (SKIP_DIRS pruned, source extensions);
  // repo-relative POSIX ids to match the original walker's output.
  const files = walkFiles(scanRoot, {
    skipDirs: SKIP_DIRS,
    extensions: ['ts', 'tsx', 'js', 'jsx', 'astro', 'mjs'],
  }).map((abs) => normalizeRepoPath(relative(cwd, abs)));

  const findings: ConsumerAppFinding[] = [];
  for (const rel of files) {
    const path = join(cwd, rel);
    if (!existsSync(path)) continue;
    findings.push(...scanFile(rel, readFileSync(path, 'utf8')));
  }
  return findings;
}
