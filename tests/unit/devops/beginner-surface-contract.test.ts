// PROVES: INV-BEGINNER-SURFACE
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analyzeBeginnerSurface,
  authoredLineCount,
  beginnerConceptFamiliesFromContract,
  markdownSection,
  type BeginnerSurfaceSource,
} from '../../support/beginner-surface.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const read = (path: string): string => readFileSync(resolve(ROOT, path), 'utf8');
const beginner = (id: string, text: string, overrides: Partial<BeginnerSurfaceSource> = {}): BeginnerSurfaceSource => ({
  id,
  text,
  audience: 'beginner',
  role: 'feature',
  selectedHost: 'liteship/astro',
  ...overrides,
});

const expectedFamilies = ['apply', 'define', 'inspect'];

describe('beginner surface contract', () => {
  it('derives define -> apply -> inspect from the flagship public contract', () => {
    expect(beginnerConceptFamiliesFromContract()).toEqual(expectedFamilies);
  });

  it.each([
    {
      name: 'root README quick start',
      source: () =>
        beginner(
          'packages/liteship/README.md#30-seconds',
          markdownSection(read('packages/liteship/README.md'), '## 30 seconds', '## The surface'),
          { format: 'markdown' },
        ),
    },
    {
      name: 'Getting Started paved road',
      source: () =>
        beginner(
          'GETTING-STARTED.md#paved-road',
          markdownSection(
            read('GETTING-STARTED.md'),
            '# Getting started with LiteShip',
            '## Generated UI with a component catalog',
          ),
          { format: 'markdown' },
        ),
    },
  ])('$name admits exactly the three contract-derived concept families', ({ source }) => {
    const analysis = analyzeBeginnerSurface([source()]);
    expect(analysis.violations).toEqual([]);
    expect(analysis.conceptFamilies).toEqual(beginnerConceptFamiliesFromContract());
    expect(analysis.conceptFamilies).toHaveLength(3);
  });

  it('keeps the generated project on one root import and one explicit host subpath', () => {
    const template = 'packages/create-liteship/templates/default';
    const analysis = analyzeBeginnerSurface([
      beginner('template/src/adaptive.ts', read(`${template}/src/adaptive.ts`)),
      beginner('template/src/pages/index.astro', read(`${template}/src/pages/index.astro`), {
        format: 'astro',
      }),
      beginner('template/src/layouts/Base.astro', read(`${template}/src/layouts/Base.astro`), {
        format: 'astro',
      }),
      beginner('template/liteship.config.ts', read(`${template}/liteship.config.ts`), {
        role: 'host-setup',
      }),
      beginner('template/astro.config.ts', read(`${template}/astro.config.ts`), {
        role: 'host-setup',
      }),
      beginner('template/README.md', read(`${template}/README.md`), { format: 'markdown' }),
    ]);

    expect(analysis.violations).toEqual([]);
    expect(analysis.imports).toEqual(['liteship', 'liteship/astro']);
    expect(analysis.conceptFamilies).toEqual(beginnerConceptFamiliesFromContract());
    expect(authoredLineCount(read(`${template}/src/adaptive.ts`))).toBeLessThanOrEqual(20);
  });

  it('keeps the create-liteship package README synchronized with the real beginner route', () => {
    const readme = read('packages/create-liteship/README.md');
    const analysis = analyzeBeginnerSurface([
      beginner('packages/create-liteship/README.md', readme, { format: 'markdown' }),
    ]);
    expect(analysis.violations).toEqual([]);
    expect(readme).toContain('src/adaptive.ts');
    expect(readme).toContain('defineAdaptive');
    expect(readme).toContain('layout.attrs()');
    expect(readme).toContain('layout.plan()');
    expect(readme).toContain('layout.explain()');
    expect(readme).not.toContain('src/boundaries/layout.boundaries.ts');
    expect(readme).not.toContain('@quantize');
  });

  it.each([
    {
      name: 'raw package import',
      text: "import { defineBoundary } from '@liteship/core';\ndefineBoundary(input);",
      code: 'raw-package-import',
    },
    {
      name: 'unselected expert subpath',
      text: "import { CSSCompiler } from 'liteship/compiler';\nCSSCompiler.compile(input);",
      code: 'foreign-facade-subpath',
    },
    {
      name: 'host symbol smuggled through root',
      text: "import { integration } from 'liteship';\nintegration();",
      code: 'root-export-outside-contract',
    },
    {
      name: 'fourth beginner concept',
      text: "import { defineAdaptive, schema } from 'liteship';\ndefineAdaptive(spec); schema.string();",
      code: 'expert-concept',
    },
    {
      name: 'manual runtime marker',
      text: '<main data-liteship-state="desktop"></main>',
      code: 'hidden-setup-primitive',
    },
    {
      name: 'query-container prerequisite',
      text: 'main { container-type: inline-size; }',
      code: 'hidden-setup-primitive',
    },
    {
      name: 'compiler directive prerequisite',
      text: '@quantize layout { mobile { display: block; } }',
      code: 'hidden-setup-primitive',
    },
  ])('red control: rejects $name', ({ text, code }) => {
    const analysis = analyzeBeginnerSurface([beginner('red-control', text)]);
    expect(analysis.violations.some((violation) => violation.code === code)).toBe(true);
  });

  it('excludes host setup from the authored feature concept budget', () => {
    const analysis = analyzeBeginnerSurface([
      beginner(
        'feature.ts',
        "import { defineAdaptive } from 'liteship';\nconst layout = defineAdaptive(spec);\nlayout.attrs(); layout.plan(); layout.explain(940);",
      ),
      beginner('liteship.config.ts', "import { defineConfig } from 'liteship';\nexport default defineConfig({});", {
        role: 'host-setup',
      }),
      beginner('astro.config.ts', "import { integration } from 'liteship/astro';\nintegration();", {
        role: 'host-setup',
      }),
    ]);
    expect(analysis.violations).toEqual([]);
    expect(analysis.conceptFamilies).toEqual(beginnerConceptFamiliesFromContract());
  });

  it('does not credit unrelated lookalike methods to the Adaptive concept families', () => {
    const analysis = analyzeBeginnerSurface([
      beginner(
        'lookalike.ts',
        "import { defineAdaptive } from 'liteship';\nconst layout = defineAdaptive(spec);\nconst unrelated = service();\nunrelated.attrs(); unrelated.plan(); unrelated.explain(940);",
      ),
    ]);
    expect(analysis.violations).toEqual([]);
    expect(analysis.conceptFamilies).toEqual(['define']);
  });

  it('tracks an aliased constructor through an exported and re-imported Adaptive alias', () => {
    const analysis = analyzeBeginnerSurface([
      beginner(
        'src/adaptive.ts',
        "import { defineAdaptive as makeAdaptive } from 'liteship';\nconst localLayout = makeAdaptive(spec);\nexport { localLayout as exportedLayout };",
      ),
      beginner(
        'src/pages/index.astro',
        "---\nimport { exportedLayout as pageLayout } from '../adaptive.js';\nconst plan = pageLayout.plan();\nconst preview = pageLayout.explain(940);\n---\n<main {...pageLayout.attrs()}>{preview.boundary.state}</main>",
        { format: 'astro' },
      ),
    ]);
    expect(analysis.violations).toEqual([]);
    expect(analysis.conceptFamilies).toEqual(beginnerConceptFamiliesFromContract());
  });

  it('does not turn expert, historical, prose, comments, or strings into beginner failures', () => {
    const analysis = analyzeBeginnerSurface([
      {
        id: 'expert.md',
        text: "```ts\nimport { CSSCompiler } from '@liteship/compiler';\nCSSCompiler.compile(input);\n```",
        audience: 'expert',
        role: 'feature',
        format: 'markdown',
      },
      {
        id: 'historical.md',
        text: '```css\n@quantize old-layout { container-type: inline-size; }\n```',
        audience: 'historical',
        role: 'feature',
        format: 'markdown',
      },
      beginner(
        'beginner-prose.md',
        "The engine contains @liteship/core. The strings '@quantize' and 'data-liteship-state=' are not setup.\n\n```ts\nconst note = '@quantize container-type: data-liteship-state=';\n// @style and data-liteship-state= are examples, not executable setup.\n```",
        { format: 'markdown' },
      ),
    ]);
    expect(analysis.violations).toEqual([]);
  });
});
