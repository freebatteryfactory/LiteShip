// @vitest-environment node
// PROVES: INV-DIAGNOSTIC-CODE-CLOSED
/**
 * Web diagnostic authority: parser-proven emitters and registry rows are an
 * exact bidirectional relation, including adversarial lexical spellings.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { fileURLToPath } from 'node:url';
import { DIAGNOSTIC_REGISTRY, explainDiagnostic } from '@liteship/error';
import { detectDiagnosticEmissionsAST } from '@liteship/audit';
import { diagnosticCodeRegisteredGate, memoryContext, nodeContext } from '@liteship/gauntlet';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REGISTERED_METHODS = new Set(['warnRegistered', 'warnOnceRegistered', 'errorRegistered']);

function webRegistryCodes(): readonly string[] {
  return Object.keys(DIAGNOSTIC_REGISTRY)
    .filter((code) => code.startsWith('web/'))
    .sort();
}

describe('Web diagnostic registry authority', () => {
  it('is an exact 16-code relation between live registered emitters and the canonical registry', () => {
    const context = nodeContext(REPO_ROOT, ['packages/*/src/**/*.ts']);
    const emitted = new Set<string>();
    for (const file of context.files().filter((path) => path.startsWith('packages/web/src/'))) {
      const source = context.readFile(file);
      if (source === undefined) continue;
      for (const match of detectDiagnosticEmissionsAST(source)) {
        expect(REGISTERED_METHODS.has(match.method), `${file}:${match.line}`).toBe(true);
        expect(match.code, `${file}:${match.line}`).toMatch(/^web\/[a-z0-9-]+\/[a-z0-9-]+$/);
        emitted.add(match.code!);
      }
    }

    const registered = webRegistryCodes();
    expect(registered).toHaveLength(16);
    expect([...emitted].sort()).toEqual(registered);
    for (const code of registered) {
      expect(explainDiagnostic(code)).toMatchObject({ area: 'web', owner: '@liteship/web' });
    }
  });

  it('keeps the real parser-backed package corpus clean in both directions', () => {
    const real = nodeContext(REPO_ROOT, ['packages/web/src/**/*.ts']);
    const files: Record<string, string> = {
      'packages/error/src/codes.ts': [
        'export const DIAGNOSTIC_REGISTRY = {',
        ...webRegistryCodes().map((code) => `  '${code}': entry(),`),
        '};',
      ].join('\n'),
    };
    for (const file of real.files()) {
      const source = real.readFile(file);
      if (source !== undefined) files[file] = source;
    }
    const base = memoryContext(files);
    expect(
      diagnosticCodeRegisteredGate.run({ ...base, diagnosticEmitterDetector: detectDiagnosticEmissionsAST }),
    ).toEqual([]);
  });

  it('resolves literal, no-substitution-template, and local-constant codes without counting prose', () => {
    fc.assert(
      fc.property(fc.constantFrom("'", '"', '`'), fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/), (quote, slug) => {
        const identity = `web/test/${slug}`;
        const source = [
          `// Diagnostics.warnRegistered({ code: '${identity}' });`,
          `const prose = "${identity}";`,
          `const CODE = ${quote}${identity}${quote};`,
          `Diagnostics.warnRegistered({ source: 'fixture', code: CODE, message: prose });`,
        ].join('\n');
        expect(detectDiagnosticEmissionsAST(source)).toEqual([{ method: 'warnRegistered', code: identity, line: 4 }]);
      }),
      { numRuns: 100 },
    );
  });

  it('reds unknown registered identities and bare Web emitters', () => {
    const unknown = {
      ...memoryContext({
        'packages/web/src/unknown.ts':
          "Diagnostics.warnRegistered({ source: 'fixture', code: 'web/test/not-enrolled', message: 'x' });\n",
      }),
      diagnosticEmitterDetector: detectDiagnosticEmissionsAST,
    };
    expect(diagnosticCodeRegisteredGate.run(unknown)).toEqual([
      expect.objectContaining({ title: 'Diagnostic code "web/test/not-enrolled" is not registered' }),
    ]);

    const bare = {
      ...memoryContext({
        'packages/web/src/bare.ts':
          "Diagnostics.warn({ source: 'fixture', code: 'web/morph/preserve-id-missing', message: 'x' });\n",
      }),
      diagnosticEmitterDetector: detectDiagnosticEmissionsAST,
    };
    expect(diagnosticCodeRegisteredGate.run(bare)).toEqual([
      expect.objectContaining({ title: 'Stable web diagnostic bypasses registered emission' }),
    ]);
  });

  it('does not let comments, unrelated strings, or uncalled constants satisfy reverse closure', () => {
    const context = {
      ...memoryContext({
        'packages/error/src/codes.ts': [
          'export const DIAGNOSTIC_REGISTRY = {',
          "  'web/test/orphaned': entry(),",
          '};',
        ].join('\n'),
        'packages/web/src/prose.ts': [
          "// Diagnostics.warnRegistered({ code: 'web/test/orphaned' });",
          "export const prose = 'web/test/orphaned';",
          'export const CODE = `web/test/orphaned`;',
        ].join('\n'),
      }),
      diagnosticEmitterDetector: detectDiagnosticEmissionsAST,
    };
    expect(diagnosticCodeRegisteredGate.run(context)).toEqual([
      expect.objectContaining({ title: 'Registered diagnostic code "web/test/orphaned" has no emitter' }),
    ]);
  });
});
