/**
 * Dynamic-code residue law for shipped non-TypeScript runtime sources.
 *
 * The blocking ESLint authority enforces `no-eval` / `no-new-func` /
 * `no-implied-eval` over the TypeScript trees only — its globs are
 * `**​/*.ts`, so a published `.astro`, `.js`, `.mjs`, or `.cjs` source under
 * `packages/<pkg>/src` is executable code the linter never inspects. This engine
 * is the equivalent authority for those files: a line classifier plus a
 * repository sweep, consumed by the unit law that pins the shipped tree to
 * zero findings.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type DynamicCodeKind = 'EVAL_CALL' | 'FUNCTION_CONSTRUCTOR' | 'STRING_TIMER';

export interface DynamicCodeFinding {
  readonly file: string;
  readonly line: number;
  readonly kind: DynamicCodeKind;
  readonly text: string;
}

export interface DynamicCodeScan {
  readonly findings: readonly DynamicCodeFinding[];
  readonly swept: readonly string[];
}

const EVAL_CALL = /(?<![.\w$])eval\s*\(/u;
const FUNCTION_CONSTRUCTOR = /\bnew\s+Function\s*\(|(?<![.\w$])Function\s*\(/u;
const STRING_TIMER = /(?<![.\w$])set(?:Timeout|Interval|Immediate)\s*\(\s*['"`]/u;

/**
 * Classify one source line. Comment-shaped lines are exempt so prose about
 * the rules cannot red the gate; everything else that spells a dynamic-code
 * evaluation form is a finding.
 */
export function classifyDynamicCodeLine(line: string): DynamicCodeKind | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return null;
  if (EVAL_CALL.test(line)) return 'EVAL_CALL';
  if (FUNCTION_CONSTRUCTOR.test(line)) return 'FUNCTION_CONSTRUCTOR';
  if (STRING_TIMER.test(line)) return 'STRING_TIMER';
  return null;
}

const SHIPPED_EXTENSIONS = ['.astro', '.js', '.mjs', '.cjs'];

function collectShipped(dir: string, files: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collectShipped(path, files);
    else if (SHIPPED_EXTENSIONS.some((ext) => name.endsWith(ext))) files.push(path);
  }
}

/**
 * Sweep every shipped non-TypeScript runtime source under `packages/<pkg>/src`
 * for dynamic-code forms. Returns findings plus the swept inventory so the
 * consuming law can prove the sweep saw the real population.
 */
export function scanShippedDynamicCode(repoRoot: string): DynamicCodeScan {
  const files: string[] = [];
  const packagesDir = join(repoRoot, 'packages');
  for (const pkg of readdirSync(packagesDir).sort()) {
    const src = join(packagesDir, pkg, 'src');
    if (existsSync(src)) collectShipped(src, files);
  }
  const findings: DynamicCodeFinding[] = [];
  const swept: string[] = [];
  for (const file of files) {
    const rel = relative(repoRoot, file).replace(/\\/g, '/');
    swept.push(rel);
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const kind = classifyDynamicCodeLine(lines[index]!);
      if (kind !== null) findings.push({ file: rel, line: index + 1, kind, text: lines[index]!.trim() });
    }
  }
  return { findings, swept };
}
