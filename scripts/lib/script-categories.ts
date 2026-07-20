/**
 * The categorized index of root npm scripts — the single data source for both
 * the human-readable `pnpm scripts` deck plan (scripts/scripts-index.ts) and the
 * parity gate (tests/unit/devops/scripts-and-build-parity.test.ts) that fails if
 * a script in package.json is left uncategorized.
 *
 * Adding a root script means adding it to the right category below.
 *
 * @module
 */
export interface CategorySpec {
  readonly name: string;
  readonly description: string;
  readonly scripts: readonly string[];
}

/** Root scripts that are lifecycle hooks, not part of the human deck plan. */
export const LIFECYCLE_SCRIPTS = ['prepare', 'postinstall'] as const;

export const CATEGORIES: readonly CategorySpec[] = [
  {
    name: 'dev-experience',
    description: 'First-run verify, dev host, doctor, clean. Start here on a fresh clone.',
    scripts: ['verify', 'doctor', 'dev', 'clean', 'scripts', 'glossary', 'fix'],
  },
  {
    name: 'build',
    description: 'Compile the workspace.',
    scripts: ['build', 'build:wasm', 'typecheck', 'typecheck:scripts', 'typecheck:tests', 'typecheck:spine'],
  },
  {
    name: 'test',
    description: 'Run vitest lanes. `test` is the default fast loop.',
    scripts: [
      'test',
      'test:watch',
      'test:unit',
      'test:smoke',
      'test:property',
      'test:component',
      'test:integration',
      'test:regression',
      'test:redteam',
      'test:flake',
      'test:shard',
      'test:e2e',
      'test:e2e:stress',
      'test:e2e:stream-stress',
      'test:vite',
      'test:astro',
      'test:cloudflare',
      'test:cloudflare-dev',
      'test:tailwind',
    ],
  },
  {
    name: 'coverage',
    description: 'Coverage lanes — node + browser merge.',
    scripts: [
      'coverage',
      'coverage:node',
      'coverage:node:tracked',
      'coverage:browser',
      'coverage:merge',
      'coverage:merge-shards',
      'coverage:unit',
      'coverage:smoke',
      'cover',
    ],
  },
  {
    name: 'bench',
    description: 'Tinybench suites + the bench-gate and trend gate.',
    scripts: ['bench', 'bench:gate', 'bench:alloc', 'bench:trend', 'bench:reality'],
  },
  {
    name: 'lint-format',
    description: 'ESLint + Prettier + structural AST lint.',
    scripts: ['lint', 'lint:structural', 'format', 'format:check', 'check', 'preflight'],
  },
  {
    name: 'audit',
    description: 'Codebase audit lanes — structure, integrity, surface.',
    scripts: ['audit', 'audit:structure', 'audit:integrity', 'audit:surface', 'audit:report', 'audit:floor'],
  },
  {
    name: 'reports',
    description: 'Verification + reporting scripts.',
    scripts: [
      'report:runtime-seams',
      'report:adaptive-scan',
      'report:semantic-convergence',
      'feedback:verify',
      'runtime:gate',
      'standards:gate',
      'capability:gate',
      'spine-relation:gate',
      'transition:gate',
      'check:gates',
      'plumb:gate',
      'flex:verify',
      'devx:check',
    ],
  },
  {
    name: 'capsule',
    description: 'Capsule manifest compile + verify.',
    scripts: ['capsule:compile', 'capsule:verify'],
  },
  {
    name: 'release',
    description: 'Ship + verify:receipts + gauntlet (the full release-grade gate).',
    scripts: ['ship', 'verify:receipts', 'gauntlet:full', 'package:smoke', 'release:notes'],
  },
  {
    name: 'docs',
    description: 'Generate + check docs.',
    scripts: ['docs:build', 'docs:build:sharded', 'docs:bundle', 'docs:check', 'docs:gen'],
  },
  {
    name: 'demos',
    description: 'Example workspaces.',
    scripts: ['demo:remotion'],
  },
];
