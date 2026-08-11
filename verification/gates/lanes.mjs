// Declaration-output gate.
//
// Two lanes are emitted from the same source. The assurance lane includes the
// compile-time fixtures; the governed lane is what a consumer would actually
// receive. The difference between them must be exactly the laws file: assurance
// fixtures prove things about the architecture, they are not part of the
// surface it publishes.
//
// Zero JavaScript is the load-bearing count. This repository is a specification;
// the moment it emits an executable artifact it has started being an
// implementation, which is the thing that is not authorized.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { discard, runTsc, stageWork } from '../harness.mjs';

const emitted = (dir, ext) => {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e.endsWith(ext)) out.push(p);
    }
  };
  try { walk(dir); } catch { /* nothing emitted */ }
  return out;
};

const lane = (label, opts) => {
  const work = stageWork(`lane-${label}`, opts);
  const { ok, errors } = runTsc(work);
  const out = join(work, 'out');
  const result = { ok, errors, decls: emitted(out, '.d.ts').length, js: emitted(out, '.js').length,
    laws: emitted(out, '.d.ts').filter((f) => f.endsWith('types.laws.d.ts')).length };
  discard(work);
  return result;
};

const assurance = lane('assurance', { laws: true });
const governed = lane('governed', { laws: false });

const failures = [];
if (!assurance.ok) failures.push(`assurance lane does not type-check (${assurance.errors.length} errors)`);
if (!governed.ok) failures.push(`governed lane does not type-check (${governed.errors.length} errors)`);
if (assurance.js !== 0) failures.push(`assurance lane emitted ${assurance.js} JavaScript file(s)`);
if (governed.js !== 0) failures.push(`governed lane emitted ${governed.js} JavaScript file(s)`);
if (governed.laws !== 0) failures.push(`governed lane published ${governed.laws} law declaration(s) -- fixtures must not ship`);
if (assurance.decls - governed.decls !== 1) {
  failures.push(`lanes differ by ${assurance.decls - governed.decls} declarations, expected exactly 1 (the laws file)`);
}

console.log(`assurance ${assurance.decls} .d.ts | governed ${governed.decls} .d.ts | JavaScript ${assurance.js + governed.js}`);
for (const f of failures) console.log(`  VIOLATION ${f}`);
console.log(`${failures.length === 0 ? 'PASS' : 'FAIL'} lanes: ${failures.length} violation(s)`);
process.exit(failures.length === 0 ? 0 : 1);
