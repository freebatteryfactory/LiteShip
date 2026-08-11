// Import-direction gate.
//
// Two laws, both fail-closed:
//
//   Waterfall   -- a file may import only strictly upstream of itself.
//   No siblings -- realm children never import one another. Not hosts, because
//                  no physical execution is two realms at once. Not targets,
//                  because ecosystem usage is not semantic authority: Astro
//                  using Vite does not put Vite above Astro, and the moment
//                  cloudflare imports astro, deploying without Astro stops
//                  being a thing the architecture can express.
//
// An import this gate cannot classify is a violation. A denylist would have to
// anticipate every future evasion; an allowlist only has to be told what is
// legal, and everything else is refused by default.

import { readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { REPO, governedFiles, posix } from '../harness.mjs';

const KIND_RANK = { root: 0, core: 1, hosts: 2, targets: 3, wires: 3, system: 4 };

// Within a kind: shared vocabulary is upstream of children, a child umbrella is
// downstream of that child's homes.
const SHARED = 0, HOME = 1, UMBRELLA = 2;

function classify(rel) {
  // `from '../../types.js'` resolves to the root grammar, which ships as a
  // declaration file; both spellings name the same tier-zero surface.
  if (rel === 'types.d.ts' || rel === 'types.ts') return { kind: 'root', sub: SHARED, n: 0, child: null };
  if (rel === 'types.laws.ts') return { kind: 'root', sub: SHARED, n: 1, child: null };

  let m = rel.match(/^00_core\/(\d+)_[^/]+\/types\.ts$/);
  if (m) return { kind: 'core', sub: HOME, n: +m[1], child: null };
  if (rel === '00_core/types.ts') return { kind: 'core', sub: UMBRELLA, n: 0, child: null };

  for (const [kind, root] of [['hosts', '01_hosts'], ['targets', '02_targets'], ['wires', '02_wires']]) {
    if (rel === `${root}/types.ts`) return { kind, sub: SHARED, n: 0, child: null };
    m = rel.match(new RegExp(`^${root}/([^/]+)/(\\d+)_[^/]+/types\\.ts$`));
    if (m) return { kind, sub: HOME, n: +m[2], child: m[1] };
    m = rel.match(new RegExp(`^${root}/([^/]+)/types\\.ts$`));
    if (m) return { kind, sub: UMBRELLA, n: 0, child: m[1] };
  }

  if (rel === 'system/types.ts') return { kind: 'system', sub: SHARED, n: 0, child: null };
  m = rel.match(/^system\/(\d+)_[^/]+\/types\.ts$/);
  if (m) return { kind: 'system', sub: HOME, n: +m[1], child: null };

  return null; // unclassified -- fail closed
}

const order = (c) => [KIND_RANK[c.kind], c.sub, c.n];
const strictlyBefore = (a, b) => {
  const [x, y] = [order(a), order(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
};

/** Returns every violation in the tree rooted at `root`. Empty means lawful. */
export function checkDirection(root = REPO) {
  const violations = [];
  const report = (msg) => violations.push(msg);

  for (const rel of governedFiles(root)) {
    const from = classify(rel);
    if (!from) { report(`${rel} -- unclassified governed file`); continue; }

    const src = readFileSync(resolve(root, rel), 'utf8');
    for (const m of src.matchAll(/from '([^']+)'/g)) {
      const spec = m[1];
      if (!spec.startsWith('.')) { report(`${rel} -> ${spec} (non-relative import)`); continue; }

      const target = posix(relative(root, resolve(dirname(resolve(root, rel)), spec.replace(/\.js$/, '.ts'))));
      const to = classify(target);
      if (!to) { report(`${rel} -> ${spec} (unclassified target)`); continue; }

      if (KIND_RANK[to.kind] === KIND_RANK[from.kind] && to.kind !== from.kind) {
        report(`${rel} -> ${spec} (sibling tier: ${from.kind} imports ${to.kind})`);
        continue;
      }
      // Sibling exclusion is intra-kind only. A target composing a host child is
      // the waterfall working; a target reaching into another target is not.
      if (to.kind === from.kind) {
        if (to.child !== null && from.child !== null && to.child !== from.child) {
          report(`${rel} -> ${spec} (sibling ${from.kind}: ${from.child} imports ${to.child})`);
          continue;
        }
        if (to.child !== null && from.child === null) {
          report(`${rel} -> ${spec} (shared ${from.kind} vocabulary imports child ${to.child})`);
          continue;
        }
      }
      if (!strictlyBefore(to, from)) report(`${rel} -> ${spec} (not upstream)`);
    }
  }
  return violations;
}

if (import.meta.url === `file://${process.argv[1].split(sep).join('/')}` || process.argv[1]?.endsWith('direction.mjs')) {
  const violations = checkDirection();
  for (const v of violations) console.log(`  VIOLATION ${v}`);
  console.log(`${violations.length === 0 ? 'PASS' : 'FAIL'} direction: ${violations.length} violation(s)`);
  process.exit(violations.length === 0 ? 0 : 1);
}
