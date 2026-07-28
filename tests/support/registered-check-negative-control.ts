import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { CHECK_REGISTRY, type CheckPlan, type PlannedCheck } from '@liteship/command';
import { createCheckPlanRunner } from '../../packages/cli/src/commands/check.js';
import { canonicalPhysicalPath } from '../../packages/cli/src/internal/physical-path.js';
import { scaledTimeout } from '../../vitest.shared.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');

function quote(value: string): string {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function nodeCli(modulePath: string, argv: readonly string[]): string {
  return ['node', quote(modulePath), ...argv.map(quote)].join(' ');
}

export interface ExecutableFaultFixture {
  readonly authorityScript: (root: string) => string;
  readonly plant: (root: string) => void;
  readonly neutralize: (root: string) => void;
}

/** Real Vitest owner with one failing assertion that becomes passing only when neutralized. */
export function vitestFaultFixture(label: string): ExecutableFaultFixture {
  const spec = (root: string) => join(root, 'authority.test.ts');
  const config = (root: string) => join(root, 'vitest.config.mjs');
  const writeSpec = (root: string, pass: boolean): void => {
    writeFileSync(
      spec(root),
      `import { expect, test } from ${JSON.stringify(pathToFileURL(resolve(REPO_ROOT, 'node_modules/vitest/dist/index.js')).href)};\n` +
        `test(${JSON.stringify(label)}, () => expect(${pass ? '1' : '0'}).toBe(1));\n`,
    );
  };
  return {
    authorityScript: (root) =>
      nodeCli(resolve(REPO_ROOT, 'node_modules/vitest/vitest.mjs'), [
        'run',
        '--config',
        config(root),
        spec(root),
        '--maxWorkers=1',
      ]),
    plant: (root) => {
      writeFileSync(
        config(root),
        `export default { test: { include: [${JSON.stringify(spec(root).replaceAll('\\', '/'))}] } };\n`,
      );
      writeSpec(root, false);
    },
    neutralize: (root) => writeSpec(root, true),
  };
}

/** Real Vite build owner; only the planted config throw differs between runs. */
export function viteFaultFixture(): ExecutableFaultFixture {
  const config = (root: string) => join(root, 'vite.config.mjs');
  return {
    authorityScript: (root) => {
      const physicalRoot = canonicalPhysicalPath(root);
      return nodeCli(resolve(REPO_ROOT, 'node_modules/vite/bin/vite.js'), [
        'build',
        physicalRoot,
        '--config',
        config(physicalRoot),
        '--emptyOutDir',
      ]);
    },
    plant: (root) => {
      writeFileSync(join(root, 'index.html'), '<main>liteship authority fixture</main>\n');
      writeFileSync(config(root), `throw new Error('planted Vite configuration fault');\n`);
    },
    neutralize: (root) => writeFileSync(config(root), 'export default {};\n'),
  };
}

/** Real Astro build owner; only the planted config throw differs between runs. */
export function astroFaultFixture(): ExecutableFaultFixture {
  const config = (root: string) => join(root, 'astro.config.mjs');
  return {
    authorityScript: (root) =>
      nodeCli(resolve(REPO_ROOT, 'tests/integration/astro/node_modules/astro/bin/astro.mjs'), [
        'build',
        '--root',
        '.',
        '--config',
        'astro.config.mjs',
      ]),
    plant: (root) => {
      mkdirSync(join(root, 'src', 'pages'), { recursive: true });
      mkdirSync(join(root, 'node_modules'), { recursive: true });
      symlinkSync(
        resolve(REPO_ROOT, 'tests/integration/astro/node_modules/astro'),
        join(root, 'node_modules', 'astro'),
        'junction',
      );
      writeFileSync(join(root, 'src', 'pages', 'index.astro'), '<main>liteship authority fixture</main>\n');
      writeFileSync(config(root), `throw new Error('planted Astro configuration fault');\n`);
    },
    neutralize: (root) => writeFileSync(config(root), 'export default {};\n'),
  };
}

/** Real Playwright owner; the exact generated spec changes from red to green. */
export function playwrightFaultFixture(label: string, repeatEach = 1): ExecutableFaultFixture {
  const spec = (root: string) => join(root, 'authority.spec.mjs');
  const config = (root: string) => join(root, 'playwright.config.mjs');
  const playwrightUrl = pathToFileURL(resolve(REPO_ROOT, 'node_modules/@playwright/test/index.mjs')).href;
  const writeSpec = (root: string, pass: boolean): void => {
    writeFileSync(
      spec(root),
      `import { expect, test } from ${JSON.stringify(playwrightUrl)};\n` +
        `test(${JSON.stringify(label)}, () => expect(${pass ? '1' : '0'}).toBe(1));\n`,
    );
  };
  return {
    authorityScript: (root) =>
      nodeCli(resolve(REPO_ROOT, 'node_modules/playwright/cli.js'), [
        'test',
        '--config',
        'playwright.config.mjs',
        '--workers',
        '1',
        '--repeat-each',
        String(repeatEach),
      ]),
    plant: (root) => {
      writeFileSync(
        config(root),
        `export default { testDir: ${JSON.stringify(root.replaceAll('\\', '/'))}, reporter: 'line' };\n`,
      );
      writeSpec(root, false);
    },
    neutralize: (root) => writeSpec(root, true),
  };
}

/** Real Tailwind compiler owner; malformed CSS becomes a valid theme block. */
export function tailwindFaultFixture(): ExecutableFaultFixture {
  const script = (root: string) => join(root, 'tailwind-authority.mjs');
  const tailwindUrl = pathToFileURL(resolve(REPO_ROOT, 'node_modules/@tailwindcss/node/dist/index.mjs')).href;
  const writeScript = (root: string, css: string): void => {
    writeFileSync(
      script(root),
      `import { compile } from ${JSON.stringify(tailwindUrl)};\n` +
        `const compiled = await compile(${JSON.stringify(css)}, { base: ${JSON.stringify(root)}, onDependency() {} });\n` +
        `const output = compiled.build(['bg-control']);\n` +
        `if (!output.includes('.bg-control')) throw new Error('Tailwind omitted planted control utility');\n`,
    );
  };
  return {
    authorityScript: (root) => `node ${quote(script(root))}`,
    plant: (root) => writeScript(root, '@theme { --color-control: #fff;'),
    neutralize: (root) => writeScript(root, '@theme { --color-control: #fff; }\n@tailwind utilities;'),
  };
}

function plannedCheck(id: string, expectedCommand: string, expectedControl: string): PlannedCheck {
  const definition = CHECK_REGISTRY.find((entry) => entry.id === id);
  expect(definition, `${id} must remain registered`).toBeDefined();
  expect(definition?.authority).toBe('blocking');
  expect(definition?.command).toBe(expectedCommand);
  expect(definition?.negativeControl).toBe(expectedControl);
  if (definition === undefined) throw new Error(`missing check definition: ${id}`);

  return {
    id: definition.id,
    title: definition.title,
    claim: definition.claim,
    context: 'repository',
    command: definition.command,
    execution: definition.execution,
    owner: definition.owner,
    remediation: definition.remediation,
    authority: definition.authority,
    cache: definition.cache,
    cacheable: definition.cache === 'content-addressed',
    timeoutMs: definition.timeoutMs,
    inputs: definition.inputs,
    prerequisites: definition.prerequisites,
  };
}

function scriptName(command: string): string {
  const match = /^pnpm (?:run )?([^\s]+)/u.exec(command);
  if (match?.[1] === undefined) throw new Error(`negative-control helper requires a pnpm script: ${command}`);
  return match[1];
}

function writeManifest(root: string, command: string, authorityScript: string): void {
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      private: true,
      packageManager: 'pnpm@10.26.2',
      scripts: { [scriptName(command)]: authorityScript },
      devDependencies: { astro: '7.1.3' },
    }),
  );
}

export interface RegisteredCheckFault {
  readonly id: string;
  readonly command: string;
  readonly control: string;
  /** The real executable-owner command installed behind the registered script. */
  readonly authorityScript: (root: string) => string;
  /** Plant one deterministic defect-class input before the registered command runs. */
  readonly plant: (root: string) => void;
  /** Remove only that fault. The same owner must then return green. */
  readonly neutralize: (root: string) => void;
}

/**
 * Execute an exact blocking registry route twice through the production check
 * runner and the real child process. The first run contains a planted owner
 * fault and must be red; the second changes only that fault and must be green.
 *
 * This intentionally has no injectable spawn seam. A fake exit status proves
 * only the report fold; this proof must reach the executable authority named by
 * `authorityScript` and preserve its bounded diagnostics in the real report.
 */
function proveRegisteredCheckFalsifies(fault: RegisteredCheckFault): void {
  const check = plannedCheck(fault.id, fault.command, fault.control);
  const root = mkdtempSync(join(tmpdir(), 'liteship-check-fault-'));
  try {
    const authorityScript = fault.authorityScript(root);
    expect(authorityScript.trim(), `${fault.id} must name an executable owner`).not.toBe('');
    expect(authorityScript).not.toContain('fixture-authority');
    writeManifest(root, fault.command, authorityScript);
    const plan: CheckPlan = {
      profile: 'release',
      platform: process.platform,
      context: 'repository',
      checks: [check],
      estimatedMs: check.timeoutMs,
      skipped: [],
    };
    const run = () =>
      createCheckPlanRunner({
        now: () => 1,
        env: { node: process.version, platform: process.platform },
      })(plan, root, { noCache: true });

    fault.plant(root);
    const red = run();
    expect(red, red.results.flatMap((result) => result.findings).join('\n')).toMatchObject({
      ok: false,
      blocked: true,
    });
    expect(red.results).toHaveLength(1);
    expect(red.results[0]).toMatchObject({ id: fault.id, verdict: 'fail', cacheHit: false });

    fault.neutralize(root);
    const green = run();
    expect(green, green.results.flatMap((result) => result.findings).join('\n')).toMatchObject({
      ok: true,
      blocked: false,
    });
    expect(green.results[0]).toMatchObject({ id: fault.id, verdict: 'pass', cacheHit: false });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * Register one real red/green authority proof with the budget owned by the
 * shared subprocess harness. Individual callers cannot accidentally inherit
 * Vitest's 10-second unit default for a proof that launches an executable
 * owner twice.
 */
export function registerCheckNegativeControl(name: string, fault: RegisteredCheckFault): void {
  it(name, () => proveRegisteredCheckFalsifies(fault), scaledTimeout(60_000));
}
