// PROVES: INV-BEGINNER-SURFACE
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { ROOT_EXPORT_CONTRACT_SOURCE } from '../../packages/liteship/src/export-budget.js';
import {
  analyzeBeginnerSurface,
  beginnerConceptFamiliesFromContract,
  type BeginnerSurfaceSource,
} from '../support/beginner-surface.js';

const source = (id: string, text: string, overrides: Partial<BeginnerSurfaceSource> = {}): BeginnerSurfaceSource => ({
  id,
  text,
  audience: 'beginner',
  role: 'feature',
  selectedHost: 'liteship/astro',
  ...overrides,
});

const pavedRoad: readonly BeginnerSurfaceSource[] = [
  source('adaptive.ts', "import { defineAdaptive } from 'liteship';\nexport const layout = defineAdaptive(spec);"),
  source(
    'page.astro',
    "---\nimport { layout } from './adaptive.js';\nconst plan = layout.plan();\nlayout.explain(940);\n---\n<main {...layout.attrs()} />",
    { format: 'astro' },
  ),
  source('astro.config.ts', "import { integration } from 'liteship/astro';\nintegration();", {
    role: 'host-setup',
  }),
  source('liteship.config.ts', "import { defineConfig } from 'liteship';\ndefineConfig({});", {
    role: 'host-setup',
  }),
];

const expertRootConcepts = (JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as Array<{ name: string; kind: string }>)
  .filter((entry) => entry.kind === 'value' && !['defineAdaptive', 'defineConfig'].includes(entry.name))
  .map((entry) => entry.name);

describe('beginner surface adversarial properties', () => {
  it('is invariant to source order and harmless comment/string noise', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(pavedRoad, {
          minLength: pavedRoad.length,
          maxLength: pavedRoad.length,
        }),
        fc.array(
          fc.constantFrom(
            "const note = '@quantize';",
            "const marker = 'data-liteship-state=';",
            '// container-type: inline-size;',
            '/* @style fake {} */',
          ),
          { maxLength: 8 },
        ),
        (ordered, noise) => {
          const noisy = [...ordered, source('noise.ts', noise.join('\n'))];
          const analysis = analyzeBeginnerSurface(noisy);
          expect(analysis.violations).toEqual([]);
          expect(analysis.conceptFamilies).toEqual(beginnerConceptFamiliesFromContract());
        },
      ),
      { seed: 0xb36166, numRuns: 60 },
    );
  });

  it('rejects every generated raw scoped package import in beginner code', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/),
        fc.stringMatching(/^[A-Za-z_$][A-Za-z0-9_$]{0,20}$/),
        (packageName, symbol) => {
          const analysis = analyzeBeginnerSurface([
            source('raw-package.ts', `import { ${symbol} } from '@liteship/${packageName}';\n${symbol}();`),
          ]);
          expect(analysis.violations.some((violation) => violation.code === 'raw-package-import')).toBe(true);
        },
      ),
      { seed: 0x5c0fed, numRuns: 80 },
    );
  });

  it('preserves ownership through harmless constructor/export/import aliases', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9_]{0,12}$/), (suffix) => {
        const constructor = `makeAdaptive${suffix}`;
        const local = `localAdaptive${suffix}`;
        const exported = `exportedAdaptive${suffix}`;
        const page = `pageAdaptive${suffix}`;
        const analysis = analyzeBeginnerSurface([
          source(
            'src/adaptive.ts',
            `import { defineAdaptive as ${constructor} } from 'liteship';\nconst ${local} = ${constructor}(spec);\nexport { ${local} as ${exported} };`,
          ),
          source(
            'src/pages/index.astro',
            `---\nimport { ${exported} as ${page} } from '../adaptive.js';\nconst plan = ${page}.plan();\nconst preview = ${page}.explain(940);\n---\n<main {...${page}.attrs()}>{preview.boundary.state}</main>`,
            { format: 'astro' },
          ),
        ]);
        expect(analysis.violations).toEqual([]);
        expect(analysis.conceptFamilies).toEqual(beginnerConceptFamiliesFromContract());
      }),
      { seed: 0xa11a5, numRuns: 60 },
    );
  });

  it('rejects any fourth root concept even when the facade legitimately exports it', () => {
    fc.assert(
      fc.property(fc.constantFrom(...expertRootConcepts), (extra) => {
        const analysis = analyzeBeginnerSurface([
          source(
            'fourth-concept.ts',
            `import { defineAdaptive, ${extra} } from 'liteship';\ndefineAdaptive(spec);\n${extra}(input);`,
          ),
        ]);
        expect(analysis.violations.some((violation) => violation.code === 'expert-concept')).toBe(true);
      }),
      { seed: 0xc04ce9, numRuns: 40 },
    );
  });

  it('rejects hidden setup primitives in executable beginner material', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '<main data-liteship-state="desktop"></main>',
          'main { container-name: viewport; }',
          'main { container-type: inline-size; }',
          '@quantize layout { mobile { display: block; } }',
          '@style card { color: red; }',
          '@token accent { value: red; }',
          '@theme dark { accent: black; }',
        ),
        (primitive) => {
          const analysis = analyzeBeginnerSurface([source('hidden-setup.astro', primitive, { format: 'astro' })]);
          expect(analysis.violations.some((violation) => violation.code === 'hidden-setup-primitive')).toBe(true);
        },
      ),
      { seed: 0x51de7, numRuns: 50 },
    );
  });

  it('never promotes expert or historical syntax into the beginner budget', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('expert', 'historical') as fc.Arbitrary<'expert' | 'historical'>,
        fc.constantFrom(
          "import { CSSCompiler } from '@liteship/compiler'; CSSCompiler.compile(input);",
          "import { createLLMSession } from '@liteship/astro/runtime'; createLLMSession(input);",
          '@quantize legacy { container-type: inline-size; }',
        ),
        (audience, text) => {
          const analysis = analyzeBeginnerSurface([source(`${audience}.ts`, text, { audience })]);
          expect(analysis.violations).toEqual([]);
          expect(analysis.conceptFamilies).toEqual([]);
        },
      ),
      { seed: 0xa0d1e, numRuns: 50 },
    );
  });
});
