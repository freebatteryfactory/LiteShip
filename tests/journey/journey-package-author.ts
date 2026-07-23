/**
 * journey-package-author — a downstream author installs the packed `liteship`
 * facade and proves `liteship/schema` + `liteship/evidence` under Node16 and
 * bundler resolution.
 *
 * There is no workspace-package link or `paths` alias. The fixture is outside
 * the repository, installs the same tarballs the release authority packed, then
 * resolves and checks
 * real imports through the published exports map.
 *
 * @module
 */

import ts from 'typescript';
import { existsSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  boundedJourneyOutput,
  installConsumer,
  journeyAssert,
  removeDir,
  writePackedAuthorManifest,
  type JourneyResult,
  type PackedWorkspace,
} from './harness.js';
import { assertPackedTypeClosure } from '../../packages/cli/src/lib/package-smoke-helpers.js';

const SUBPATHS = [
  { specifier: 'liteship/schema', dist: 'schema.d.ts', symbol: 'schema' },
  { specifier: 'liteship/evidence', dist: 'evidence.d.ts', symbol: 'chooseTier' },
] as const;

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
    esModuleInterop: true,
    noEmit: true,
    types: [],
  };
}

export async function journeyPackageAuthor(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-package-author';
  let sandbox: string | undefined;
  try {
    sandbox = mkdtempSync(join(tmpdir(), 'liteship-journey-author-'));
    writePackedAuthorManifest(sandbox, packed);
    journeyAssert(!existsSync(join(sandbox, '.npmrc')), 'current package-author proof must use default pnpm isolation');
    const install = await installConsumer(sandbox);
    journeyAssert(
      install.code === 0,
      `packed package-author install failed (exit ${install.code}):\n${boundedJourneyOutput(
        install.stdout,
        install.stderr,
      )}`,
    );

    assertPackedTypeClosure(
      ts,
      sandbox,
      SUBPATHS.map((entry) => ({
        packageName: 'liteship',
        specifier: entry.specifier,
        typesTarget: `./dist/${entry.dist}`,
      })),
    );

    const installedRoot = realpathSync(join(sandbox, 'node_modules', 'liteship')).replaceAll('\\', '/');
    journeyAssert(
      !installedRoot.includes('/packages/liteship/'),
      `package-author proof escaped to the workspace package: ${installedRoot}`,
    );

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
      for (const entry of SUBPATHS) {
        const resolved = ts.resolveModuleName(entry.specifier, files[0]!, options, host).resolvedModule;
        journeyAssert(resolved !== undefined, `${entry.specifier} did not resolve under ${mode}`);
        const resolvedFile = resolved!.resolvedFileName.replaceAll('\\', '/');
        const expected = `/node_modules/liteship/dist/${entry.dist}`;
        journeyAssert(
          resolvedFile.includes(expected),
          `${entry.specifier} (${mode}) resolved to ${resolvedFile}, not the packed ${expected}`,
        );
        journeyAssert(
          !resolvedFile.includes('/packages/liteship/'),
          `${entry.specifier} (${mode}) escaped to the workspace source: ${resolvedFile}`,
        );
      }

      const program = ts.createProgram({ rootNames: files, options });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      const report = diagnostics.map(
        (diagnostic) => `TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
      );
      journeyAssert(report.length === 0, `packed consumer diagnostics under ${mode}:\n${report.join('\n')}`);
    }

    return {
      name,
      status: 'pass',
      detail:
        'default-isolated packed liteship/schema + liteship/evidence resolved from physical node_modules dist declarations and full-graph type-checked under node16 + bundler',
      notes: ['no hoisting, workspace-package link, TypeScript paths alias, or declaration-check skip'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(sandbox);
  }
}
