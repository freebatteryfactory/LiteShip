/**
 * Generative lexical properties for {@link classifyBenchSource} — the
 * class-killer for the slash-ambiguity defect family (`++`, `--`, `!`, `>`
 * were each found one review cycle at a time; this lane hunts the members
 * nobody enumerated).
 *
 * The lean scanner cannot be differentially compared against a naive AST
 * emptiness check (its law deliberately treats literal-only template/string
 * content as inert evidence), so ground truth comes from CONSTRUCTION instead:
 *
 *  - the EXECUTABLE arm generates bodies guaranteed to contain executable
 *    code — operands (including postfix `!`, update operators, instantiation
 *    expressions), binary operators (including division directly after each
 *    operand form), regex literals with quote/brace/comment decoys in the
 *    positions the lexical grammar admits them, and templates with executable
 *    interpolations — and must classify 'real';
 *  - the INERT arm generates bodies from comment/whitespace/literal-only
 *    material and must classify 'placeholder';
 *  - both arms are wrapped in hostile prelude/suffix decoys (regex soup,
 *    strings containing `bench(`, comment bombs) that must never flip the
 *    verdict;
 *  - every generated source is asserted syntactically valid TypeScript
 *    (ts.transpileModule diagnostics), so the generator cannot "prove" the
 *    scanner with inputs no generator would emit.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import ts from 'typescript';
import { classifyBenchSource } from '../../packages/core/src/evidence/bench-classify.js';

function assertValidTypeScript(source: string): void {
  const result = ts.transpileModule(source, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  const syntactic = (result.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
  expect(syntactic, `generated source must be valid TS:\n${source}`).toEqual([]);
}

/** Operand forms that end in "operand position" — a following `/` is division. */
const OPERANDS = [
  'total',
  'arr[i]',
  'fn(y)',
  'obj.prop',
  '(a + b)',
  'total!',
  'count++',
  'count--',
  'n',
  '12',
] as const;

/**
 * TS instantiation expressions are only admitted before a restricted token
 * follow-set (`f<T> >= x` is a parse error), so they get their own arm pinned
 * to the verified division case instead of the general operand×operator
 * product — the exact defect this lane exists to guard.
 */
const INSTANTIATION_DIVISIONS = ['f<T> / n', 'box.get<T> / n', 'work(f<T>)', '`${box.get<T>}`'] as const;

/** Binary operators joining two operands (division included on purpose). */
const BINARY_OPERATORS = ['/', '*', '%', '+', '-', '>', '<', '>=', '<=', '===', '!==', '&&', '||', '??'] as const;

/** Regex literals stuffed with the decoys that corrupt a desynced scanner. */
const DECOY_REGEXES = ['/decoy[}{)(]/u', '/([\'"`])x/', '/\\/*not-a-comment*\\//', '/bench\\(/'] as const;

/** Positions where the lexical grammar admits a regex literal. */
const REGEX_BEARING = DECOY_REGEXES.flatMap((re) => [
  `${re}.test(s)`,
  `!${re}.test(s)`,
  `items.map((s) => ${re}.test(s)).length`,
  `flag && ${re}.test(s)`,
]);

/** Executable expression statements — ground-truth 'real' by construction. */
const executableExpression = fc.oneof(
  fc
    .tuple(fc.constantFrom(...OPERANDS), fc.constantFrom(...BINARY_OPERATORS), fc.constantFrom(...OPERANDS))
    .map(([left, op, right]) => `${left} ${op} ${right}`),
  fc.constantFrom(...INSTANTIATION_DIVISIONS),
  fc.constantFrom(...REGEX_BEARING),
  fc.constantFrom(...OPERANDS).map((operand) => `\`\${${operand}}\``),
  fc.constantFrom(...OPERANDS).map((operand) => `work(${operand})`),
);

/**
 * Inert body material — ground-truth 'placeholder' by construction. Line
 * comments carry their own newline so they can never swallow the callback's
 * closing tokens when chunks are joined onto one line.
 */
const inertChunk = fc.constantFrom(
  '/* later */',
  '// nothing yet\n',
  '/* bench("fake", () => { work(); }) */',
  "'work()';",
  '`work()`;',
  "`${'work()'}`;",
  '',
  '  ',
);

/** Hostile material OUTSIDE the bench call that must never flip a verdict. */
const decoyPrelude = fc.constantFrom(
  '',
  'const RE = /([\'"`}{])x/u;',
  'const s = \'bench("decoy", () => { fake(); })\';',
  `${'/* bench("x", () => { fake(); }) */'.repeat(20)}`,
  'const ratio = total / count;',
  'const cmp = a < b && c > d;',
);

const DECLARATIONS = [
  'declare const total: number & { toFixed(digits?: number): string };',
  'declare const a: number, b: number, c: number, d: number, i: number, n: number, y: number, s: string;',
  'declare let count: number;',
  'declare const arr: number[]; declare const obj: { prop: number };',
  'declare const items: string[]; declare const flag: boolean;',
  'declare const f: (<T>() => T) & number; declare const box: { get: (<T>() => T) & number };',
  'declare function fn(value: number): number; declare function work(value: unknown): void;',
  'declare function bench(name: string, run: () => void): void;',
  'declare type T = string;',
].join('\n');

describe('classifyBenchSource — generative lexical law', () => {
  it('every constructed executable body classifies real (division admissible after every operand form)', () => {
    fc.assert(
      fc.property(
        decoyPrelude,
        fc.array(executableExpression, { minLength: 1, maxLength: 3 }),
        decoyPrelude,
        (prelude, statements, suffix) => {
          const body = statements.map((statement) => `${statement};`).join(' ');
          const source = `${DECLARATIONS}\n${prelude}\nbench('gen', () => { ${body} });\n${suffix}`;
          assertValidTypeScript(source);
          expect(classifyBenchSource(source), `misread as placeholder:\n${source}`).toBe('real');
        },
      ),
      { numRuns: 300 },
    );
  });

  it('every constructed inert body classifies placeholder (decoys cannot fake evidence)', () => {
    fc.assert(
      fc.property(
        decoyPrelude,
        fc.array(inertChunk, { minLength: 1, maxLength: 3 }),
        decoyPrelude,
        (prelude, chunks, suffix) => {
          const source = `${DECLARATIONS}\n${prelude}\nbench('gen', () => { ${chunks.join(' ')} });\n${suffix}`;
          assertValidTypeScript(source);
          expect(classifyBenchSource(source), `laundered as real:\n${source}`).toBe('placeholder');
        },
      ),
      { numRuns: 300 },
    );
  });
});
