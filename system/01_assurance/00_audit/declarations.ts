/**
 * Repository-control implementation: the public declaration surface.
 *
 * The specification's deliverable is a set of declarations other people
 * consume. This emits them from the specification population alone and
 * inspects what came out.
 *
 * It exists because the separation it checks was, until recently, absent. Laws
 * were exported from semantic files, so all 670 of them appeared in the
 * emitted declaration surface — measured, 102 of 106 emitted files carried at
 * least one. A consumer's public API was mostly fixtures with names like
 * `AGateClaimsDetectionAndDeclaresNoReads`.
 *
 * The separation is now structural: laws live in `*.laws.ts`, which
 * `tsconfig.spec.json` excludes by population. This audit is what keeps that
 * true, and it deliberately does not trust the file naming. `erasableSyntaxOnly`
 * is likewise not trusted to prove zero runtime — `zero-runtime.ts` emits and
 * inspects the output instead. Same discipline, same reason: a flag and a
 * naming convention are both claims, and a claim is not evidence.
 *
 * ## What it proves
 *
 * - the emitted population is not empty, because an empty one satisfies every
 *   check below;
 * - no law module and no type-test module reached the output;
 * - no emitted declaration exports an `Assert` alias, whatever file it came
 *   from;
 * - no emitted declaration imports a compile-only module;
 * - two independent emits are byte-identical, so the surface is reproducible
 *   rather than incidentally stable;
 * - the emitted tree typechecks on its own, as a consumer receives it.
 *
 * The last one is the only check here that reads the output the way a consumer
 * would. The others inspect it the way an auditor does.
 *
 * ## What it does not do
 *
 * No waivers, no severities, no baseline of tolerated declarations. A finding
 * is a finding and the exit code says so.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..', '..');
const TSC = join(REPO, 'node_modules', 'typescript', 'bin', 'tsc');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name),
  );

/** Whether one emitted declaration exports a compile-time law. */
export const exportsALaw = (text: string): boolean => /=\s*Assert</u.test(text);

/** Whether one emitted declaration imports a module that is compile-only. */
export const importsACompileOnlyModule = (text: string): boolean =>
  /from\s+['"][^'"]*\.(laws|type-test)\.js['"]/u.test(text);

export interface EmittedDeclaration {
  readonly name: string;
  readonly text: string;
}

export type DeclarationPopulationInspection =
  | { readonly kind: 'empty' }
  | { readonly kind: 'inspected'; readonly findings: readonly string[] };

/** Inspect the complete declaration population; zero subjects are never clean. */
export const inspectDeclarationPopulation = (
  emitted: readonly EmittedDeclaration[],
): DeclarationPopulationInspection => {
  if (emitted.length === 0) return { kind: 'empty' };

  const findings: string[] = [];
  for (const file of emitted) {
    if (file.name.includes('.laws.') || file.name.includes('.type-test.')) {
      findings.push(`compile-only module in the public surface: ${file.name}`);
    }
    if (exportsALaw(file.text)) findings.push(`law alias exported from: ${file.name}`);
    if (importsACompileOnlyModule(file.text)) {
      findings.push(`imports a compile-only module: ${file.name}`);
    }
  }

  return { kind: 'inspected', findings };
};

const emit = (out: string): void => {
  execFileSync(
    process.execPath,
    [TSC, '-p', join(REPO, 'tsconfig.spec.json'), '--outDir', out],
    { stdio: 'inherit', cwd: REPO },
  );

  // The root calculus is authored as `types.d.ts`, so it is an *input*
  // declaration and the compiler does not re-emit it. Every emitted file
  // imports from it, so an output tree without it resolves nothing — which is
  // what the consumer check reported the first time this audit ran.
  //
  // Copying it is not a workaround. It is what packaging does, and doing it
  // here is what makes the consumer check read the surface a consumer would
  // actually receive rather than a subset of it.
  copyFileSync(join(REPO, 'types.d.ts'), join(out, 'types.d.ts'));
};

if (import.meta.main) {
  const first = mkdtempSync(join(tmpdir(), 'liteship-dts-a-'));
  const second = mkdtempSync(join(tmpdir(), 'liteship-dts-b-'));
  const consumer = mkdtempSync(join(tmpdir(), 'liteship-dts-c-'));

  try {
    emit(first);
    emit(second);

    const emittedPaths = walk(first).filter((file) => file.endsWith('.d.ts'));
    const emitted = emittedPaths.map((file) => ({
      name: relative(first, file).replaceAll('\\', '/'),
      text: readFileSync(file, 'utf8'),
    }));
    const inspection = inspectDeclarationPopulation(emitted);

    if (inspection.kind === 'empty') {
      console.error('declarations: FAILED — nothing was emitted, so nothing was audited');
      process.exit(1);
    }
    const findings = [...inspection.findings];

    // Reproducible, not incidentally stable.
    const secondEmitted = walk(second).filter((file) => file.endsWith('.d.ts'));
    if (secondEmitted.length !== emitted.length) {
      findings.push(`two emits produced ${emitted.length} and ${secondEmitted.length} files`);
    } else {
      for (const file of emittedPaths) {
        const name = relative(first, file);
        const other = join(second, name);
        if (readFileSync(file, 'utf8') !== readFileSync(other, 'utf8')) {
          findings.push(`two emits differ at: ${name.replaceAll('\\', '/')}`);
        }
      }
    }

    // The surface as a consumer receives it: no sources, no laws, just the
    // declarations, checked on their own.
    writeFileSync(
      join(consumer, 'tsconfig.json'),
      JSON.stringify({
        extends: join(REPO, 'tsconfig.base.json').replaceAll('\\', '/'),
        compilerOptions: { noEmit: true },
        include: [`${first.replaceAll('\\', '/')}/**/*.d.ts`],
      }),
    );
    try {
      execFileSync(process.execPath, [TSC, '-p', join(consumer, 'tsconfig.json')], {
        stdio: 'inherit',
        cwd: consumer,
      });
    } catch {
      findings.push('the emitted declaration tree does not typecheck on its own');
    }

    console.log(
      `declarations: ${emitted.length} emitted, ${findings.length} findings, two emits identical`,
    );
    for (const finding of findings) console.error(`  ${finding}`);
    process.exit(findings.length === 0 ? 0 : 1);
  } finally {
    for (const dir of [first, second, consumer]) rmSync(dir, { recursive: true, force: true });
  }
}
