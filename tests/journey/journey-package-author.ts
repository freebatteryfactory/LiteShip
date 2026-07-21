/**
 * journey-package-author — a downstream package author importing `liteship/schema`
 * and `liteship/evidence` type-checks clean under BOTH module resolutions a real
 * project uses: `node16` and `bundler`.
 *
 * MIRRORS `tests/unit/liteship/facade-subpaths.test.ts`: a temp consumer whose
 * `node_modules/liteship` SYMLINKS the workspace package (so the `exports` map — not
 * a `paths` alias — is what the resolver and checker exercise), then for each of the
 * two subpaths (a) `ts.resolveModuleName` resolves the specifier to its built
 * `dist/<name>.d.ts` under each mode, and (b) a tiny consumer that imports a real
 * symbol from each subpath type-checks with zero diagnostics under each mode.
 *
 * READS-DIST: the `exports` map's `types` condition points at `dist`, so this needs
 * `packages/liteship/dist` built (the full-gate flow builds before tests).
 *
 * @module
 */

import ts from 'typescript';
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { journeyAssert, REPO_ROOT, removeDir, type JourneyResult } from './harness.js';

/** The two subpaths this journey proves: the bare specifier, its built d.ts, and a real symbol. */
const SUBPATHS = [
  { specifier: 'liteship/schema', dist: 'schema.d.ts', symbol: 'schema' },
  { specifier: 'liteship/evidence', dist: 'evidence.d.ts', symbol: 'chooseTier' },
] as const;

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
    types: [],
  };
}

export async function journeyPackageAuthor(): Promise<JourneyResult> {
  const name = 'journey-package-author';
  let sandbox: string | undefined;
  try {
    const liteshipPkg = resolve(REPO_ROOT, 'packages', 'liteship');
    journeyAssert(
      existsSync(join(liteshipPkg, 'dist', 'schema.d.ts')),
      'packages/liteship/dist is not built — this journey resolves the exports map’s built types condition (run pnpm build)',
    );

    sandbox = mkdtempSync(join(tmpdir(), 'liteship-journey-author-'));
    // An ESM consumer so node16 treats the consumer files as ESM (a real downstream app).
    writeFileSync(
      join(sandbox, 'package.json'),
      `${JSON.stringify({ name: 'journey-author-consumer', type: 'module' }, null, 2)}\n`,
    );
    const nm = join(sandbox, 'node_modules');
    mkdirSync(nm, { recursive: true });
    // Resolve `liteship` as a real installed dep through its exports map (a symlink), not a paths alias.
    symlinkSync(liteshipPkg, join(nm, 'liteship'), 'dir');

    const files: string[] = [];
    for (const entry of SUBPATHS) {
      const file = join(sandbox, `use-${entry.symbol}.ts`);
      writeFileSync(
        file,
        [
          `import { ${entry.symbol} } from '${entry.specifier}';`,
          `const _used: unknown = ${entry.symbol};`,
          'export { _used };',
          '',
        ].join('\n'),
      );
      files.push(file);
    }

    for (const mode of ['node16', 'bundler'] as const) {
      const options = optionsFor(mode);
      const host = ts.createCompilerHost(options);

      // (a) RESOLVES — every subpath resolves to its built dist/*.d.ts.
      for (const entry of SUBPATHS) {
        const resolved = ts.resolveModuleName(entry.specifier, files[0]!, options, host).resolvedModule;
        journeyAssert(resolved !== undefined, `${entry.specifier} did not resolve under ${mode}`);
        const resolvedFile = resolved!.resolvedFileName.replace(/\\/g, '/');
        journeyAssert(
          resolvedFile.includes(`/packages/liteship/dist/${entry.dist}`),
          `${entry.specifier} (${mode}) resolved to ${resolvedFile}, not dist/${entry.dist}`,
        );
      }

      // (b) TYPE-CHECKS — the consumer importing a real symbol from each subpath is clean.
      const program = ts.createProgram({ rootNames: files, options });
      const consumerSet = new Set(files.map((f) => f.replace(/\\/g, '/')));
      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .filter((d) => d.file !== undefined && consumerSet.has(d.file.fileName.replace(/\\/g, '/')));
      const report = diagnostics.map((d) => `TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
      journeyAssert(report.length === 0, `consumer type-check diagnostics under ${mode}:\n${report.join('\n')}`);
    }

    return {
      name,
      status: 'pass',
      detail:
        'liteship/schema + liteship/evidence resolve to their built dist d.ts AND type-check clean under both node16 and bundler resolution',
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(sandbox);
  }
}
