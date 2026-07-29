// @vitest-environment node
/**
 * The `liteship` curated-facade RESOLUTION + TYPE-CHECK gate (P13).
 *
 * The umbrella became a REAL curated facade: a budgeted root `.` authoring surface
 * plus governed expert SUBPATHS (`liteship/schema`, `liteship/reactive`, …), each a
 * `src/<name>.ts` file of explicit named re-exports. This gate proves the promise a
 * consumer actually depends on:
 *
 *  1. RESOLVES — every declared subpath resolves through the package's `exports`
 *     map to its built `dist/<name>.d.ts`, under BOTH `node16` and `bundler` module
 *     resolution (the two a real downstream project uses). Resolution runs against a
 *     temp consumer whose `node_modules/liteship` symlinks the real package, so the
 *     `exports` map — not a `paths` alias — is what is exercised.
 *  2. TYPE-CHECKS — a tiny consumer that imports a real symbol from each subpath
 *     type-checks clean (no `Cannot find module` / `has no exported member`) under
 *     both resolutions, proving the re-export facade actually surfaces the symbol.
 *  3. BUDGET — the root's runtime value surface is a SUBSET of `ROOT_VALUE_BUDGET`
 *     (the allowlist the `gauntlet/facade-export-budget` gate enforces on the built
 *     d.ts), and neither budget kind exceeds its cap.
 *  4. HOST-INTEGRATION-FREE ROOT — importing the root `.` pulls NO Astro/Vite/Web
 *     host integration. It DOES compose the pure compiler projection and quantizer
 *     owners required by the flagship `defineAdaptive(...).plan()` contract.
 *
 * READS-DIST: the exports map's `types`/`import` conditions point at `dist`, so this
 * gate needs `liteship` (and its `@liteship/*` deps) built. The full-gate flow builds
 * before `pnpm test`; a stale/unbuilt tree fails the precondition with a build hint
 * rather than a cryptic resolution error.
 *
 * @module
 */
// PROVES: INV-FACADE-EXPORT-BUDGET, INV-CONSUMER-SUBPATH-CLOSURE
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ts from 'typescript';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACADE_SUBPATH_CONTRACT,
  ROOT_EXPORT_CONTRACT,
  ROOT_VALUE_BUDGET,
  ROOT_TYPE_BUDGET,
} from '../../../packages/liteship/src/export-budget.js';
import * as Root from '../../../packages/liteship/src/index.js';
import * as GenuiFacade from '../../../packages/liteship/src/genui.js';
import * as GenuiOwner from '../../../packages/genui/src/index.js';
import { facadeExportBudgetGate, verifyGate, memoryContext } from '../../../packages/gauntlet/src/index.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../../..');
const LITESHIP_PKG = resolve(REPO_ROOT, 'packages/liteship');
const ROOT_DTS = resolve(LITESHIP_PKG, 'dist/index.d.ts');
const ROOT_JS = resolve(LITESHIP_PKG, 'dist/index.js');
const ROOT_SOURCE = resolve(LITESHIP_PKG, 'src/index.ts');
const PACKAGE_SOURCES = resolve(REPO_ROOT, 'packages');

/**
 * One declared facade entry: the `exports` key, the bare specifier a consumer
 * writes, the `dist/<file>` its `types` condition must resolve to, and a real
 * exported symbol used to prove the re-export actually surfaces it.
 */
interface FacadeEntry {
  readonly subpath: string;
  readonly specifier: string;
  readonly dist: string;
  readonly symbol: string;
}

/** The facade entries derived from the role-bearing product contract. */
const FACADE: readonly FacadeEntry[] = [
  { subpath: '.', specifier: 'liteship', dist: 'index.d.ts', symbol: 'defineBoundary' },
  ...FACADE_SUBPATH_CONTRACT.map((entry) => ({
    subpath: entry.subpath,
    specifier: entry.specifier,
    dist: `${entry.subpath.slice(2)}.d.ts`,
    symbol: entry.symbol,
  })),
];

/** Host-integration scopes the root `.` must NEVER pull into its module graph. */
const HOST_SCOPES = ['@liteship/astro', '@liteship/vite', '@liteship/web'] as const;

/** The host-integration-free runtime scopes the root `.` is allowed to evaluate. */
const ROOT_RUNTIME_SCOPES = ['@liteship/core', '@liteship/quantizer', '@liteship/compiler', '@liteship/error'] as const;

/** Shared compiler options; only the module/resolution pair differs per mode. */
function optionsFor(mode: 'node16' | 'bundler'): ts.CompilerOptions {
  const resolution =
    mode === 'node16'
      ? { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }
      : { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
  return {
    ...resolution,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    esModuleInterop: true,
    noEmit: true,
    // The deps are consumed as built `.d.ts` (skipLibCheck'd); the consumer needs no
    // ambient @types, so keep the ambient set empty for a hermetic, fast program.
    types: [],
  };
}

/** The temp consumer sandbox: an empty ESM project whose only dep is `liteship`. */
let sandbox: string;

beforeAll(() => {
  if (!existsSync(ROOT_DTS)) {
    throw new Error(
      `packages/liteship/dist is not built — this gate resolves the exports map's built \`types\` condition. ` +
        `Run \`pnpm build\` (the full-gate flow builds before \`pnpm test\`).`,
    );
  }
  sandbox = mkdtempSync(join(tmpdir(), 'liteship-facade-'));
  // An ESM project (`type: module`) so node16 resolution treats the consumer files as
  // ESM — matching how a real downstream `liteship` app is authored.
  writeFileSync(
    join(sandbox, 'package.json'),
    `${JSON.stringify({ name: 'facade-consumer', type: 'module' }, null, 2)}\n`,
  );
  const nm = join(sandbox, 'node_modules');
  mkdirSync(nm, { recursive: true });
  // The load-bearing setup: `liteship` is resolved as a real installed dep through its
  // `exports` map (a symlink to the workspace package), NOT a `paths` alias — so the
  // map itself is what the resolver + checker exercise.
  symlinkSync(LITESHIP_PKG, join(nm, 'liteship'), 'dir');
});

afterAll(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

/** Absolute path of the per-subpath consumer file inside the sandbox. */
function consumerPath(entry: FacadeEntry): string {
  const slug = entry.subpath === '.' ? 'root' : entry.subpath.replace(/[^a-z]/gi, '');
  return join(sandbox, `use-${slug}.ts`);
}

/** Consumer source: import a real symbol and bind it, so a missing export reds. */
function consumerSource(entry: FacadeEntry): string {
  return [
    `import { ${entry.symbol} } from '${entry.specifier}';`,
    // `: unknown =` proves the binding EXISTS + resolves without demanding its full
    // (skipLibCheck'd) declared type resolve error-free in a host-typed subpath.
    `const _used: unknown = ${entry.symbol};`,
    `export { _used };`,
    '',
  ].join('\n');
}

const EXAMPLE_FIXTURES = [
  'declare const input: any;',
  'declare const options: any;',
  'declare const boundary: any;',
  'declare const fields: any;',
  'declare const receipt: any;',
  'declare const spec: any;',
  'declare const initial: any;',
  'declare const code: any;',
  'declare const css: string;',
] as const;

function contractExampleSources(): readonly { readonly name: string; readonly source: string }[] {
  const rootValues = ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'value').map((entry) => entry.name);
  const rootTypes = ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'type').map((entry) => entry.name);
  const rootImports = [
    `import { ${rootValues.join(', ')} } from 'liteship';`,
    `import type { ${rootTypes.join(', ')} } from 'liteship';`,
  ];
  const root = ROOT_EXPORT_CONTRACT.map((entry) => ({
    name: `root-${entry.name}`,
    source: [
      ...rootImports,
      ...EXAMPLE_FIXTURES,
      entry.kind === 'type' ? `type ContractExample = ${entry.example};` : `const contractExample = ${entry.example};`,
      'export { };',
      '',
    ].join('\n'),
  }));
  const subpaths = FACADE_SUBPATH_CONTRACT.map((entry) => {
    const operation = /^([A-Za-z_$][\w$]*)/.exec(entry.example)?.[1];
    if (operation === undefined) throw new Error(`facade example has no callable root: ${entry.example}`);
    const imports = [...new Set([entry.symbol, operation])];
    return {
      name: `subpath-${entry.subpath.slice(2)}`,
      source: [
        `import { ${imports.join(', ')} } from '${entry.specifier}';`,
        ...EXAMPLE_FIXTURES,
        `const contractExample = ${entry.example};`,
        'export { contractExample };',
        '',
      ].join('\n'),
    };
  });
  return [...root, ...subpaths];
}

function compileConsumerSources(
  sources: readonly { readonly name: string; readonly source: string }[],
  mode: 'node16' | 'bundler',
): readonly string[] {
  const files = sources.map(({ name, source }) => {
    const path = join(sandbox, `contract-${name}.ts`);
    writeFileSync(path, source);
    return path;
  });
  const program = ts.createProgram({ rootNames: files, options: optionsFor(mode) });
  const consumerSet = new Set(files.map((file) => file.replace(/\\/g, '/')));
  return ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.file !== undefined && consumerSet.has(diagnostic.file.fileName.replace(/\\/g, '/')),
    )
    .map((diagnostic) => {
      const where = diagnostic.file?.fileName ?? '<no file>';
      return `${where}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
    });
}

function runtimeModuleSpecifiers(source: ts.SourceFile): readonly string[] {
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const namedTypeOnly =
        bindings !== undefined &&
        ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 &&
        bindings.elements.every((element) => element.isTypeOnly);
      if (clause === undefined || (!clause.isTypeOnly && !namedTypeOnly)) specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const namedTypeOnly =
        node.exportClause !== undefined &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((element) => element.isTypeOnly);
      if (!node.isTypeOnly && !namedTypeOnly) specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

interface ForbiddenRuntimeEdge {
  readonly importer: string;
  readonly specifier: string;
}

const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

function transitiveHostEdges(
  entry: string,
  options: ts.CompilerOptions,
  traversalRoot = PACKAGE_SOURCES,
): readonly ForbiddenRuntimeEdge[] {
  const queue = [entry];
  const visited = new Set<string>();
  const forbidden: ForbiddenRuntimeEdge[] = [];
  const host = ts.createCompilerHost(options);
  while (queue.length > 0) {
    const importer = resolve(queue.shift()!);
    if (visited.has(importer)) continue;
    visited.add(importer);
    const source = ts.createSourceFile(importer, readFileSync(importer, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const specifier of runtimeModuleSpecifiers(source)) {
      if (
        HOST_SCOPES.some((scope) => specifier === scope || specifier.startsWith(`${scope}/`)) ||
        NODE_BUILTINS.has(specifier)
      ) {
        forbidden.push({ importer: relative(REPO_ROOT, importer).replace(/\\/g, '/'), specifier });
        continue;
      }
      const resolved = ts.resolveModuleName(specifier, importer, options, host).resolvedModule?.resolvedFileName;
      if (resolved === undefined || resolved.endsWith('.d.ts')) continue;
      const normalized = resolve(resolved);
      const withinTraversal = relative(traversalRoot, normalized);
      if (withinTraversal !== '..' && !withinTraversal.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
        queue.push(normalized);
      }
    }
  }
  return forbidden;
}

function sourceResolutionOptions(): ts.CompilerOptions {
  const parsed = ts.getParsedCommandLineOfConfigFile(resolve(REPO_ROOT, 'tsconfig.tests.json'), {}, ts.sys);
  if (parsed === undefined) throw new Error('tsconfig.tests.json could not be parsed');
  return parsed.options;
}

describe('liteship facade — subpath resolution (node16 + bundler)', () => {
  it('every declared subpath equals the package.json exports keys (no silent drift)', () => {
    const manifest = JSON.parse(readFileSync(join(LITESHIP_PKG, 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>;
    };
    expect(Object.keys(manifest.exports).sort()).toEqual([...FACADE.map((e) => e.subpath)].sort());
  });

  for (const mode of ['node16', 'bundler'] as const) {
    it(`resolves every subpath to its built dist/*.d.ts under ${mode}`, () => {
      const options = optionsFor(mode);
      const host = ts.createCompilerHost(options);
      for (const entry of FACADE) {
        const containing = consumerPath(entry);
        const resolved = ts.resolveModuleName(entry.specifier, containing, options, host).resolvedModule;
        expect(resolved, `${entry.specifier} must resolve under ${mode}`).toBeDefined();
        const file = resolved!.resolvedFileName.replace(/\\/g, '/');
        expect(file, `${entry.specifier} (${mode}) should resolve to dist/${entry.dist}`).toContain(
          `/packages/liteship/dist/${entry.dist}`,
        );
      }
    });
  }
});

describe('liteship facade — consumer type-checks (node16 + bundler)', () => {
  for (const mode of ['node16', 'bundler'] as const) {
    it(
      `a consumer importing a symbol from every subpath type-checks under ${mode}`,
      { timeout: scaledTimeout(60_000) },
      () => {
        const files: string[] = [];
        for (const entry of FACADE) {
          const p = consumerPath(entry);
          writeFileSync(p, consumerSource(entry));
          files.push(p);
        }
        const program = ts.createProgram({ rootNames: files, options: optionsFor(mode) });
        // Only the consumer files are our concern; dep `.d.ts` are skipLibCheck'd.
        const consumerSet = new Set(files.map((f) => f.replace(/\\/g, '/')));
        const diagnostics = ts
          .getPreEmitDiagnostics(program)
          .filter((d) => d.file !== undefined && consumerSet.has(d.file.fileName.replace(/\\/g, '/')));
        const report = diagnostics.map((d) => {
          const where = d.file ? `${d.file.fileName}` : '<no file>';
          return `${where}: TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
        });
        expect(report, `consumer type-check diagnostics under ${mode}:\n${report.join('\n')}`).toEqual([]);
      },
    );
  }

  for (const mode of ['node16', 'bundler'] as const) {
    it(
      `compiles every authored root and subpath contract example under ${mode}`,
      { timeout: scaledTimeout(60_000) },
      () => {
        const diagnostics = compileConsumerSources(contractExampleSources(), mode);
        expect(diagnostics, `contract examples failed under ${mode}:\n${diagnostics.join('\n')}`).toEqual([]);
      },
    );
  }

  it('reds when an authored example names a missing public export', () => {
    const diagnostics = compileConsumerSources(
      [
        {
          name: 'negative-missing-export',
          source:
            "import { definitelyNotPublic } from 'liteship';\nconst value = definitelyNotPublic();\nexport { value };\n",
        },
      ],
      'bundler',
    );
    expect(diagnostics.some((line) => line.includes('has no exported member'))).toBe(true);
  });
});

describe('liteship facade — root export budget (exact match + caps)', () => {
  it('derives both exact budgets from complete role-bearing decisions', () => {
    expect(ROOT_EXPORT_CONTRACT.every((entry) => entry.role === 'authoring' || entry.role === 'inspection')).toBe(true);
    expect(ROOT_EXPORT_CONTRACT.every((entry) => entry.userStory.length > 0 && entry.failureContract.length > 0)).toBe(
      true,
    );
    expect(ROOT_VALUE_BUDGET).toEqual(
      ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'value').map((entry) => entry.name),
    );
    expect(ROOT_TYPE_BUDGET).toEqual(
      ROOT_EXPORT_CONTRACT.filter((entry) => entry.kind === 'type').map((entry) => entry.name),
    );
  });

  it('governs every expert subpath with a packed proof and operating contract', () => {
    expect(
      FACADE_SUBPATH_CONTRACT.every(
        (entry) =>
          entry.userStory.length > 0 &&
          entry.dependencyCost.length > 0 &&
          entry.packedProof.length > 0 &&
          entry.lifecycle.length > 0 &&
          entry.failureContract.length > 0 &&
          entry.reason.length > 0,
      ),
    ).toBe(true);
  });

  it('every runtime value the root exports is listed in ROOT_VALUE_BUDGET', () => {
    const budget = new Set<string>(ROOT_VALUE_BUDGET);
    const unlisted = Object.keys(Root).filter((name) => !budget.has(name));
    expect(unlisted, `root value exports outside the budget allowlist: [${unlisted.join(', ')}]`).toEqual([]);
  });

  it('every listed VALUE in ROOT_VALUE_BUDGET is actually exported at runtime (exact match, no phantom slot)', () => {
    // The exact-match law's second direction: a listed value MUST be a
    // real runtime export — no reserved-but-absent slot survives. Type-only budget
    // entries are excluded here (they have no runtime footprint; the built-d.ts gate
    // proves the TYPE direction).
    const runtime = new Set<string>(Object.keys(Root));
    const typeOnly = new Set<string>(ROOT_TYPE_BUDGET);
    const phantom = ROOT_VALUE_BUDGET.filter((name) => !runtime.has(name) && !typeOnly.has(name));
    expect(phantom, `budget lists values with no backing runtime export: [${phantom.join(', ')}]`).toEqual([]);
  });

  it('neither budget kind exceeds its 30-symbol cap', () => {
    expect(ROOT_VALUE_BUDGET.length).toBeLessThanOrEqual(30);
    expect(ROOT_TYPE_BUDGET.length).toBeLessThanOrEqual(30);
  });

  it('the budget allowlists carry no duplicate entries', () => {
    expect(new Set(ROOT_VALUE_BUDGET).size).toBe(ROOT_VALUE_BUDGET.length);
    expect(new Set(ROOT_TYPE_BUDGET).size).toBe(ROOT_TYPE_BUDGET.length);
  });
});

describe('gauntlet/facade-export-budget — exact-match gate (both directions)', () => {
  const BUDGET_FILE = 'packages/liteship/src/export-budget.ts';
  const ROOT_DTS_FILE = 'packages/liteship/dist/index.d.ts';
  const ROOT_SOURCE_FILE = 'packages/liteship/src/index.ts';
  const entry = (name: string, kind: 'value' | 'type', role = 'authoring') => ({
    name,
    kind,
    role,
    owner: '@liteship/core',
    userStory: `Use ${name}.`,
    lifecycle: 'pure',
    failureContract: `${name} fails explicitly.`,
    example: name,
    stability: 'stable',
    audience: 'application-author',
    producer: '@liteship/core',
    surfaceClass: 'paved-road',
    relatedInvariant: 'INV-FACADE-EXPORT-BUDGET',
    replacement: 'none',
    exampleProof: 'tests/unit/liteship/facade-inhabitation.test.ts',
  });
  const source = (entries: readonly object[]): string =>
    `export const ROOT_EXPORT_CONTRACT_SOURCE = \`${JSON.stringify(entries)}\`;`;
  const FIXTURE_BUDGET = source([
    entry('alpha', 'value'),
    entry('beta', 'value'),
    entry('Gamma', 'type'),
    entry('Delta', 'type'),
  ]);

  it('self-proves (red caught, green clean, mutation killed)', () => {
    const proof = verifyGate(facadeExportBudgetGate);
    expect(proof.selfProven, `facade-export-budget did not self-prove: ${JSON.stringify(proof)}`).toBe(true);
  });

  it('an EXACT surface (both directions, under cap) passes clean', () => {
    const ctx = memoryContext({
      [BUDGET_FILE]: FIXTURE_BUDGET,
      [ROOT_DTS_FILE]:
        "export { alpha } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\nexport declare const beta: number;\n",
      [ROOT_SOURCE_FILE]:
        "export { alpha, beta } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\n",
    });
    expect(facadeExportBudgetGate.run(ctx)).toEqual([]);
  });

  it('an UNLISTED export reds (the sprawl direction)', () => {
    const ctx = memoryContext({
      [BUDGET_FILE]: FIXTURE_BUDGET,
      [ROOT_DTS_FILE]:
        "export { alpha, zeta } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\nexport declare const beta: number;\n",
      [ROOT_SOURCE_FILE]:
        "export { alpha, beta } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\n",
    });
    const findings = facadeExportBudgetGate.run(ctx);
    expect(findings.some((f) => f.detail.includes('zeta') && f.title.includes('outside the facade budget'))).toBe(true);
  });

  it('a DROPPED listed export reds (the regression direction the old SUBSET gate was blind to)', () => {
    const ctx = memoryContext({
      [BUDGET_FILE]: FIXTURE_BUDGET,
      // `beta` is listed in the budget but NOT exported by the surface.
      [ROOT_DTS_FILE]: "export { alpha } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\n",
      [ROOT_SOURCE_FILE]:
        "export { alpha, beta } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\n",
    });
    const findings = facadeExportBudgetGate.run(ctx);
    expect(findings.some((f) => f.detail.includes('beta') && f.title.includes('dropped'))).toBe(true);
  });

  it('a tooling role is rejected even while the numeric budget and exact names fit', () => {
    const ctx = memoryContext({
      [BUDGET_FILE]: source([entry('alpha', 'value', 'tooling')]),
      [ROOT_DTS_FILE]: 'export declare const alpha: number;\n',
      [ROOT_SOURCE_FILE]: "export { alpha } from '@liteship/core';\n",
    });
    expect(facadeExportBudgetGate.run(ctx).some((finding) => finding.title.includes('role-ineligible'))).toBe(true);
  });

  it('a listed symbol with no binding from its declared producer reds', () => {
    const entries = [entry('alpha', 'value')];
    const findings = facadeExportBudgetGate.run(
      memoryContext({
        [BUDGET_FILE]: source(entries),
        [ROOT_DTS_FILE]: 'export declare const alpha: number;\n',
        [ROOT_SOURCE_FILE]: "export { alpha } from '@liteship/error';\n",
      }),
    );
    expect(findings.some((finding) => finding.detail.includes('declared producer'))).toBe(true);
  });

  it('a role-eligible exact surface still reds when it exceeds the numeric cap', () => {
    const entries = Array.from({ length: 31 }, (_, index) => entry(`value${index}`, 'value'));
    const dts = entries.map((item) => `export declare const ${item.name}: number;`).join('\n');
    const findings = facadeExportBudgetGate.run(
      memoryContext({
        [BUDGET_FILE]: source(entries),
        [ROOT_DTS_FILE]: dts,
        [ROOT_SOURCE_FILE]: entries
          .map((item) => `export { ${item.name} } from '${item.producer}';`)
          .join('\n'),
      }),
    );
    expect(findings.some((finding) => finding.title.includes('cap exceeded'))).toBe(true);
  });
});

describe('liteship/genui — direct owner identity', () => {
  it('re-exports every runtime value by reference instead of wrapping the owner', () => {
    expect(Object.keys(GenuiFacade).sort()).toEqual(Object.keys(GenuiOwner).sort());
    for (const name of Object.keys(GenuiOwner)) {
      expect(GenuiFacade[name as keyof typeof GenuiFacade], name).toBe(GenuiOwner[name as keyof typeof GenuiOwner]);
    }
  });
});

// The closed-catalog renderer is admitted to the facade under the SAME host-free
// discipline as the root: importing `liteship/genui` may evaluate only the genui
// owner and its pure deps — never a host integration.
const GENUI_SOURCE = resolve(LITESHIP_PKG, 'src/genui.ts');
const GENUI_JS = resolve(LITESHIP_PKG, 'dist/genui.js');
const GENUI_RUNTIME_SCOPES = ['@liteship/genui'] as const;

describe('liteship/genui — host-integration-free like the root', () => {
  it('the complete transitive source graph contains no host integration or Node builtin edge', () => {
    expect(transitiveHostEdges(GENUI_SOURCE, sourceResolutionOptions())).toEqual([]);
  });

  it('the built dist/genui.js evaluates only the genui owner and its pure deps', () => {
    const js = readFileSync(GENUI_JS, 'utf8');
    const scopes = new Set<string>();
    const re = /from\s*['"](@liteship\/[^'"]+)['"]/g;
    for (let m = re.exec(js); m !== null; m = re.exec(js)) scopes.add(m[1]!);
    for (const host of HOST_SCOPES) {
      expect([...scopes], `importing liteship/genui must not evaluate ${host}`).not.toContain(host);
    }
    const allowed = new Set<string>(GENUI_RUNTIME_SCOPES);
    const rogue = [...scopes].filter((s) => !allowed.has(s));
    expect(
      rogue,
      `liteship/genui evaluates unexpected scopes (only ${GENUI_RUNTIME_SCOPES.join(', ')} allowed): [${rogue.join(', ')}]`,
    ).toEqual([]);
  });
});

describe('liteship facade — the root is host-integration-free', () => {
  it('the complete transitive source graph contains no host integration or Node builtin edge', () => {
    expect(transitiveHostEdges(ROOT_SOURCE, sourceResolutionOptions())).toEqual([]);
  });

  it('the transitive graph proof catches a host edge hidden behind a relative module', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-host-edge-'));
    try {
      const entry = join(fixture, 'entry.ts');
      const leaf = join(fixture, 'leaf.ts');
      writeFileSync(entry, "export { value } from './leaf.js';\n");
      writeFileSync(leaf, "import '@liteship/web';\nexport const value = 1;\n");
      expect(transitiveHostEdges(entry, sourceResolutionOptions(), fixture)).toEqual([
        expect.objectContaining({ specifier: '@liteship/web' }),
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('the built dist/index.js pulls no host integration (astro/vite/web)', () => {
    const js = readFileSync(ROOT_JS, 'utf8');
    // Every `from '@liteship/…'` module specifier the emitted root evaluates.
    const scopes = new Set<string>();
    const re = /from\s*['"](@liteship\/[^'"]+)['"]/g;
    for (let m = re.exec(js); m !== null; m = re.exec(js)) scopes.add(m[1]!);

    for (const host of HOST_SCOPES) {
      expect([...scopes], `importing the root must not evaluate ${host}`).not.toContain(host);
    }
    // And what it DOES evaluate is a subset of the host-integration-free scopes — so the
    // astro-free property cannot be defeated by a NEW host dep the deny-list forgot.
    const allowed = new Set<string>(ROOT_RUNTIME_SCOPES);
    const rogue = [...scopes].filter((s) => !allowed.has(s));
    expect(
      rogue,
      `root evaluates unexpected scopes (only ${ROOT_RUNTIME_SCOPES.join(', ')} allowed): [${rogue.join(', ')}]`,
    ).toEqual([]);
  });

  it('the root d.ts has no evidence-tooling runtime edge', () => {
    // Finding moved to `liteship/evidence`; root must not evaluate gauntlet tooling.
    const js = readFileSync(ROOT_JS, 'utf8');
    expect(js).not.toMatch(/from\s*['"]@liteship\/gauntlet['"]/);
  });
});
