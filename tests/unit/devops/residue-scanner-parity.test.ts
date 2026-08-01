/** One semantic evasion corpus across every registered residue classifier. */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyDynamicCodeLine, classifyDynamicCodeSource } from '../../../scripts/lib/dynamic-code-residue.js';
import { classifyEffectResidueLine, scanEffectResidue } from '../../../scripts/lib/effect-residue.js';

const SHAPES = [
  'multiline-split',
  'interleaved-comment',
  'trailing-comma-collapse',
  'member-receiver',
  'unlisted-method',
  'bare-non-from-import',
] as const;

type Shape = (typeof SHAPES)[number];
type ClassifierName = 'dynamic-code' | 'effect-residue';

interface EvasionCase {
  readonly shape: Shape;
  readonly sources: Readonly<Record<ClassifierName, string>>;
}

const EVASION_CORPUS: readonly EvasionCase[] = [
  {
    shape: 'multiline-split',
    sources: {
      'dynamic-code': 'const module = import(\n  "data:text/javascript,export default 1"\n);',
      'effect-residue': "const module = import(\n  'effect'\n);",
    },
  },
  {
    shape: 'interleaved-comment',
    sources: {
      'dynamic-code': 'const module = import(/*\n * decoy\n */ "data:text/javascript,export default 1");',
      'effect-residue': "const module = import(/*\n * decoy\n */ 'effect');",
    },
  },
  {
    shape: 'trailing-comma-collapse',
    sources: {
      'dynamic-code': 'const module = import(\n  "data:text/javascript,export default 1",\n);',
      'effect-residue': "const module = import(\n  'effect',\n);",
    },
  },
  {
    shape: 'member-receiver',
    sources: {
      'dynamic-code': 'globalThis.eval(input);',
      'effect-residue': 'Effect.runSync(program);',
    },
  },
  {
    shape: 'unlisted-method',
    sources: {
      'dynamic-code': 'globalThis.eval.call(undefined, input);',
      'effect-residue': 'Effect.anythingAtAll(program);',
    },
  },
  {
    shape: 'bare-non-from-import',
    sources: {
      'dynamic-code': 'import("data:text/javascript,export default 1");',
      'effect-residue': "import('effect');",
    },
  },
] as const;

function effectSourceClassifies(source: string): boolean {
  const fixture = mkdtempSync(join(tmpdir(), 'liteship-residue-parity-'));
  try {
    const packageDir = join(fixture, 'packages', 'subject');
    const src = join(packageDir, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'subject' }));
    writeFileSync(join(src, 'main.js'), `${source}\n`);
    writeFileSync(join(fixture, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
    return scanEffectResidue(fixture, new Set()).findings.some(
      (finding) => finding.file === 'packages/subject/src/main.js',
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

interface RegisteredClassifier {
  readonly name: ClassifierName;
  readonly lineClassifier: (line: string) => unknown;
  readonly classifySource: (source: string) => boolean;
  readonly exemptions: ReadonlyMap<Shape, string>;
}

const CLASSIFIERS: readonly RegisteredClassifier[] = [
  {
    name: 'dynamic-code',
    lineClassifier: classifyDynamicCodeLine,
    classifySource: (source) => classifyDynamicCodeSource(source).length > 0,
    // No semantic shape is exempt: fail closed on every unexplained blindness.
    exemptions: new Map<Shape, string>(),
  },
  {
    name: 'effect-residue',
    lineClassifier: classifyEffectResidueLine,
    classifySource: effectSourceClassifies,
    // The owner-sanctioned string-context and whole-file fixture policies do
    // not excuse blindness to any semantic shape in this corpus.
    exemptions: new Map<Shape, string>(),
  },
];

function verdictMatrix(): readonly {
  readonly shape: Shape;
  readonly classifier: ClassifierName;
  readonly seen: boolean;
  readonly exemption: string | undefined;
}[] {
  return EVASION_CORPUS.flatMap((entry) =>
    CLASSIFIERS.map((classifier) => ({
      shape: entry.shape,
      classifier: classifier.name,
      seen: classifier.classifySource(entry.sources[classifier.name]),
      exemption: classifier.exemptions.get(entry.shape),
    })),
  );
}

describe('one evasion corpus across every residue classifier', () => {
  it('every shape is either seen or carries an explicit reasoned exemption', () => {
    const matrix = verdictMatrix();
    const unexplained = matrix.filter((cell) => !cell.seen && cell.exemption === undefined);
    const rendered = SHAPES.map((shape) => {
      const row = matrix.filter((cell) => cell.shape === shape);
      return `${shape}: ${row.map((cell) => `${cell.classifier}=${cell.seen ? 'seen' : 'blind'}`).join(', ')}`;
    }).join('\n');
    expect(unexplained, `unexplained residue-classifier blindness:\n${rendered}`).toEqual([]);
  });

  it('the registry, corpus, and exemption discipline are non-vacuous', () => {
    expect(CLASSIFIERS.length).toBeGreaterThanOrEqual(2);
    expect(EVASION_CORPUS.map((entry) => entry.shape).sort()).toEqual([...SHAPES].sort());
    for (const classifier of CLASSIFIERS) {
      expect(classifier.lineClassifier).toBeTypeOf('function');
      expect(classifier.exemptions.size).toBeLessThan(SHAPES.length);
      for (const [shape, reason] of classifier.exemptions) {
        expect(SHAPES).toContain(shape);
        expect(reason.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
