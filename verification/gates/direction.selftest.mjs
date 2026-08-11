// Anti-vacuity fixtures for the direction gate.
//
// The gate reports zero violations against the real tree. That is only evidence
// if the gate is also capable of reporting one. Each fixture below is a tree the
// architecture forbids; the gate must refuse it for the stated reason. The
// lawful fixture guards the other direction -- a gate that refuses everything is
// equally useless.
//
// The sibling-target fixtures exist before 02_targets/ does, on purpose. A gate
// written after the files it governs is a denylist chasing whatever already got
// in.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import os from 'node:os';
import { checkDirection } from './direction.mjs';

const build = (files) => {
  const root = mkdtempSync(join(os.tmpdir(), 'liteship-direction-'));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
};

const imports = (...specs) => specs.map((s) => `import type { X } from '${s}';\n`).join('') + 'export type Y = X;\n';
const GRAMMAR = { 'types.d.ts': 'export type X = string;\n' };

const LAWFUL = {
  ...GRAMMAR,
  '00_core/03_schema/types.ts': imports('../../types.js'),
  '00_core/05_lifecycle/types.ts': imports('../03_schema/types.js'),
  '00_core/types.ts': imports('./05_lifecycle/types.js'),
  '01_hosts/types.ts': imports('../00_core/types.js'),
  '01_hosts/web/00_bootstrap/types.ts': imports('../../types.js', '../../../00_core/types.js'),
  '01_hosts/web/types.ts': imports('./00_bootstrap/types.js'),
  '02_targets/types.ts': imports('../01_hosts/types.js'),
  '02_targets/astro/00_integration/types.ts': imports('../../types.js', '../../../01_hosts/web/types.js'),
  '02_targets/astro/types.ts': imports('./00_integration/types.js'),
};

const FORBIDDEN = [
  ['sibling host: web imports worker', /sibling hosts: web imports worker/, {
    ...GRAMMAR,
    '01_hosts/worker/00_bootstrap/types.ts': imports('../../../types.js'),
    '01_hosts/web/00_bootstrap/types.ts': imports('../../worker/00_bootstrap/types.js'),
  }],
  ['sibling target: cloudflare imports astro', /sibling targets: cloudflare imports astro/, {
    ...GRAMMAR,
    '02_targets/astro/00_integration/types.ts': imports('../../../types.js'),
    '02_targets/cloudflare/00_integration/types.ts': imports('../../astro/00_integration/types.js'),
  }],
  ['sibling tier: targets imports wires', /sibling tier: targets imports wires/, {
    ...GRAMMAR,
    '02_wires/types.ts': imports('../types.js'),
    '02_targets/astro/00_integration/types.ts': imports('../../../02_wires/types.js'),
  }],
  ['inverted waterfall: hosts imports targets', /not upstream|sibling tier/, {
    ...GRAMMAR,
    '02_targets/astro/types.ts': imports('../../types.js'),
    '01_hosts/web/00_bootstrap/types.ts': imports('../../../02_targets/astro/types.js'),
  }],
  ['later core home imported by earlier one', /not upstream/, {
    ...GRAMMAR,
    '00_core/05_lifecycle/types.ts': imports('../../types.js'),
    '00_core/03_schema/types.ts': imports('../05_lifecycle/types.js'),
  }],
  ['shared host vocabulary reaches into a child', /shared hosts vocabulary imports child web/, {
    ...GRAMMAR,
    '01_hosts/web/types.ts': imports('../../types.js'),
    '01_hosts/types.ts': imports('./web/types.js'),
  }],
  ['unclassified file under a governed root', /unclassified governed file/, {
    ...GRAMMAR,
    '01_hosts/web/helpers.ts': 'export type Y = string;\n',
  }],
  ['package import into governed source', /non-relative import/, {
    ...GRAMMAR,
    '02_targets/astro/00_integration/types.ts': imports('astro'),
  }],
];

let failures = 0;

const lawfulRoot = build(LAWFUL);
const lawfulViolations = checkDirection(lawfulRoot);
rmSync(lawfulRoot, { recursive: true, force: true });
if (lawfulViolations.length === 0) {
  console.log('  [ok] lawful tree passes (waterfall, shared-to-child, target composing a host)');
} else {
  console.log('  [!!] lawful tree REJECTED -- the gate refuses legal architecture');
  for (const v of lawfulViolations) console.log(`       ${v}`);
  failures++;
}

for (const [name, expected, files] of FORBIDDEN) {
  const root = build(files);
  const violations = checkDirection(root);
  rmSync(root, { recursive: true, force: true });
  const matched = violations.some((v) => expected.test(v));
  if (matched) console.log(`  [ok] refused -- ${name}`);
  else {
    console.log(`  [!!] NOT REFUSED -- ${name}`);
    console.log(`       expected /${expected.source}/, got: ${violations.length ? violations.join(' | ') : '(no violations)'}`);
    failures++;
  }
}

const total = FORBIDDEN.length + 1;
console.log(`${failures === 0 ? 'PASS' : 'FAIL'} direction self-test: ${total - failures}/${total} fixtures behaved`);
process.exit(failures === 0 ? 0 : 1);
