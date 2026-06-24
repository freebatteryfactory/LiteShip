/**
 * THE SOUND, PARSER-BACKED `codeOnly` FLOOR (@czap/audit) — the Slice-B "LanguageService" oracle that
 * the lean char-state-machine in `@czap/gauntlet` (gates/code-only.ts) mirrors. Given a source string it
 * returns the SAME string with every STRING / TEMPLATE / REGEX / COMMENT span replaced by spaces
 * (newlines preserved, length unchanged, every CODE character untouched), so a regex-based gate scans
 * code only — never a `throw` inside a comment or a TypeScript suppression directive inside a fixture.
 *
 * WHY A PARSER, NOT A CHAR-MACHINE. The three lexical hazards the hand-rolled machine must guess at, the
 * TypeScript parser resolves by construction:
 *   - regex-vs-division: `a / b` (divide) vs `/ab+/g` (regex) — only the parser's grammar position knows;
 *   - template substitutions: a `${…}` is blanked WHOLESALE with its enclosing template (matching the
 *     lean floor's conservative behaviour) because we blank the whole `TemplateExpression` node range;
 *   - nesting: `` `a ${ `b` } c` `` — the AST nests correctly, no depth bookkeeping.
 *
 * Comments are trivia (not AST nodes), so they are collected by a scanner pass over the
 * STRING/TEMPLATE/REGEX-BLANKED source — where `//` and `/*` are unambiguous (no string or regex left to
 * hide or fake one). This module owns NO LiteShip policy: it is a generic lexical utility, host-injected
 * into the gauntlet as {@link GateContext.codeOnly}. A differential test pins it equivalent to the lean
 * char-machine on a tricky corpus, so the no-typescript fallback stays faithful.
 *
 * @module
 */
import ts from 'typescript';

/** The oracle id for traceability when this floor is the injected `codeOnly` implementation. */
export const CODE_ONLY_ORACLE_ID = 'ts-code-only-scanner';

function blankChar(ch: string): string {
  return ch === '\n' ? '\n' : ' ';
}

/**
 * Sound `codeOnly`: blank STRING/TEMPLATE/REGEX/COMMENT spans of `src` to spaces, length-preserving.
 * Pure and deterministic — same input, same output (the property the verdict cache needs).
 */
export function codeOnlyAST(src: string): string {
  const sf = ts.createSourceFile('__code-only__.ts', src, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const blank = new Uint8Array(src.length);
  const mark = (start: number, end: number): void => {
    const lo = Math.max(0, start);
    const hi = Math.min(src.length, end);
    for (let i = lo; i < hi; i++) blank[i] = 1;
  };

  // 1. STRING / TEMPLATE / REGEX spans — the parser gives the correct token ranges, including whole
  //    template expressions (substitutions blanked wholesale to match the lean floor).
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node) ||
      ts.isRegularExpressionLiteral(node)
    ) {
      mark(node.getStart(sf), node.getEnd());
      return; // a template's substitutions are inside the blanked range — do not descend
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // 2. COMMENTS — scan the STRING/TEMPLATE/REGEX-blanked source so `//` / `/*` are unambiguous (no
  //    string or regex remains to hide a real comment or fake one). Positions align (length-preserving).
  let partial = '';
  for (let i = 0; i < src.length; i++) partial += blank[i] === 1 ? blankChar(src[i]!) : src[i]!;

  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, partial);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
      mark(scanner.getTokenStart(), scanner.getTokenEnd());
    }
  }

  let out = '';
  for (let i = 0; i < src.length; i++) out += blank[i] === 1 ? blankChar(src[i]!) : src[i]!;
  return out;
}
