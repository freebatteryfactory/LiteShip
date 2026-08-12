// Shared plumbing for every verification lane.
//
// One rule governs this file: nothing here may contain an absolute path, a
// session identifier, or a private snapshot of the architecture. Every lane
// resolves the tree from this file's own location, so a bank can never drift
// out of agreement with the source it claims to falsify. The predecessor
// harness kept side copies and silently reported PATTERN-NOT-FOUND when a fold
// moved the text under it; that failure is unavailable here by construction.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

export const VERIFICATION = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(VERIFICATION, '..');

/** Architecture roots, in waterfall order. Absent tiers are simply not there yet. */
export const GOVERNED_ROOTS = ['00_core', '01_hosts', '02_targets', '02_wires', 'system'];
export const ROOT_GRAMMAR = 'types.d.ts';
export const ROOT_LAWS = 'types.laws.ts';

export const posix = (p) => p.split(sep).join('/');

const presentRoots = (root = REPO) => GOVERNED_ROOTS.filter((r) => existsSync(join(root, r)));

/**
 * Every governed `.ts` file in the tree, root-relative, sorted.
 *
 * `root` is a parameter so the gates can be pointed at a fixture tree and made
 * to go red on demand. A gate that has only ever been observed passing has not
 * been shown to be capable of failing.
 */
export function governedFiles(root = REPO) {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs).sort()) {
      const p = join(abs, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry.endsWith('.ts')) out.push(posix(relative(root, p)));
    }
  };
  for (const r of presentRoots(root)) walk(join(root, r));
  for (const f of [ROOT_GRAMMAR, ROOT_LAWS]) if (existsSync(join(root, f))) out.push(f);
  return out.sort();
}

/** Every file the architecture ships, `.ts` and `.md` alike. */
export function allArchitectureFiles() {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs).sort()) {
      const p = join(abs, entry);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(posix(relative(REPO, p)));
    }
  };
  for (const r of presentRoots()) walk(join(REPO, r));
  for (const entry of readdirSync(REPO).sort()) {
    const p = join(REPO, entry);
    if (!statSync(p).isDirectory()) out.push(entry);
  }
  return out.filter((f) => !f.startsWith('.git')).sort();
}

const TSCONFIG = JSON.parse(readFileSync(join(VERIFICATION, 'tsconfig.base.json'), 'utf8'));

/**
 * Copy the live architecture into a scratch directory outside the repository.
 *
 * `laws: false` reproduces the governed lane -- the declaration surface a
 * consumer would receive, with the compile-time assurance fixtures excluded.
 */
export function stageWork(label, { laws = true, alsoInclude = [] } = {}) {
  const work = mkdtempSync(join(os.tmpdir(), `liteship-${label}-`));
  for (const r of presentRoots()) cpSync(join(REPO, r), join(work, r), { recursive: true });
  cpSync(join(REPO, ROOT_GRAMMAR), join(work, ROOT_GRAMMAR));
  if (laws) cpSync(join(REPO, ROOT_LAWS), join(work, ROOT_LAWS));

  // `alsoInclude` exists because a file dropped into the work root is NOT
  // compiled unless the config reaches it. A probe outside the include set
  // yields a clean exit that reads exactly like a passing lane.
  const include = [
    ROOT_GRAMMAR,
    ...(laws ? [ROOT_LAWS] : []),
    ...presentRoots().map((r) => `${r}/**/*.ts`),
    ...alsoInclude,
  ];
  writeFileSync(
    join(work, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { ...TSCONFIG.compilerOptions, outDir: 'out' }, include }, null, 2),
  );
  // Under `module: nodenext` the module system is decided by the nearest
  // package.json, not by the compiler options. Without this the tree resolves as
  // CommonJS and `verbatimModuleSyntax` rejects every top-level value export --
  // a format complaint that would masquerade as a semantic refusal.
  writeFileSync(join(work, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');
  return work;
}

export const discard = (work) => rmSync(work, { recursive: true, force: true });

const TSC = join(VERIFICATION, 'node_modules', 'typescript', 'bin', 'tsc');

/** Type-check a staged tree. Returns every `error TS…` line, never throws. */
export function runTsc(work) {
  if (!existsSync(TSC)) throw new Error(`typescript not installed -- run \`npm install\` in ${VERIFICATION}`);
  try {
    execFileSync(process.execPath, [TSC, '-p', join(work, 'tsconfig.json')], { stdio: 'pipe', cwd: work });
    return { ok: true, errors: [] };
  } catch (e) {
    const text = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
    return { ok: false, errors: text.split('\n').filter((l) => l.includes('error TS')) };
  }
}

/** Name of the `export type` declaration enclosing a reported error line. */
export function lawNameAt(work, file, line) {
  const src = readFileSync(join(work, file), 'utf8').split('\n');
  for (let i = line - 1; i >= 0; i--) {
    const m = src[i]?.match(/^export type (\w+)/);
    if (m) return m[1];
  }
  return '?';
}

/**
 * Run one mutation bank.
 *
 * Each entry is [label, repoRelativeFile, findExactly, replaceWith]. A mutation
 * whose anchor text is absent is reported as MISSING and fails the bank -- it is
 * the bank telling you it has drifted off the source, which must never be
 * mistaken for a passing count.
 */
export function runBank(name, mutations, { laws = true } = {}) {
  // A broken baseline makes every mutation look caught, because every staged
  // compile fails for a reason that has nothing to do with the mutation. The
  // bank would report a perfect score against a tree that does not compile.
  const baseline = stageWork(`${name}-baseline`, { laws });
  const unmutated = runTsc(baseline);
  discard(baseline);
  if (!unmutated.ok) {
    console.log(`FAIL ${name}: the unmutated tree does not compile -- every result would be meaningless`);
    for (const e of unmutated.errors.slice(0, 5)) console.log(`       ${e}`);
    return { name, caught: 0, total: mutations.length, clean: false, rows: [] };
  }

  const rows = [];
  for (const [label, file, from, to] of mutations) {
    const work = stageWork(name, { laws });
    const target = join(work, file);
    const src = readFileSync(target, 'utf8');
    const hits = src.split(from).length - 1;
    if (hits === 0) { rows.push({ label, status: 'MISSING', detail: `anchor absent in ${file}` }); discard(work); continue; }
    if (hits > 1) { rows.push({ label, status: 'AMBIGUOUS', detail: `anchor matches ${hits}x in ${file}` }); discard(work); continue; }

    writeFileSync(target, src.replace(from, to));
    const { ok, errors } = runTsc(work);
    if (ok) {
      rows.push({ label, status: 'ESCAPED', detail: 'mutation compiles -- no law forbids it' });
    } else {
      // Only errors raised inside the governed tree count, and unused-symbol
      // noise is not a law firing -- a mutation must die on a semantic
      // relationship, not because it orphaned an import.
      const governed = errors.filter(
        (l) => /^(00_|01_|02_|system\/|types\.laws\.ts)/.test(l) && !/TS6133|TS6196|TS6198/.test(l),
      );
      const named = [...new Set(governed.map((l) => {
        const m = l.match(/^(\S+?)\((\d+),/);
        return m ? lawNameAt(work, m[1], Number(m[2])) : '?';
      }))].filter((n) => n !== '?');
      rows.push({
        label,
        status: named.length ? 'CAUGHT' : 'CAUGHT-UNNAMED',
        detail: named.length
          ? `${governed.length} error(s): ${named.slice(0, 3).join(', ')}`
          : `${errors.length} error(s) but no named law fired`,
      });
    }
    discard(work);
  }

  const caught = rows.filter((r) => r.status === 'CAUGHT').length;
  const clean = caught === rows.length;
  for (const r of rows) {
    if (r.status !== 'CAUGHT') console.log(`  [!!] ${r.label}\n       ${r.status}: ${r.detail}`);
  }
  console.log(`${clean ? 'PASS' : 'FAIL'} ${name}: ${caught}/${rows.length} caught by a named law`);
  return { name, caught, total: rows.length, clean, rows };
}
