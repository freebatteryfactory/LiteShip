/**
 * Dynamic-code residue law for shipped sources outside the root lint scope.
 *
 * The blocking ESLint authority enforces `no-eval` / `no-new-func` /
 * `no-implied-eval` over the root lint command's package-source globs. This
 * engine derives the remaining browser extensions from Vite's host authority,
 * adds runtime-specific module/component forms, and scans those files.
 *
 * THE CLASS RULE. The ANCHOR is the parsed syntax tree of every executable
 * region in a swept file — not its bytes. The ALLOWLIST is the small set of
 * positions a dynamic-code name can occupy harmlessly: a string, a comment, a
 * type, a declaration's own name, a property key, or a reference that RESOLVES
 * to a local binding proven to hold a function.
 *
 * Why the tree and not the text. The previous engine matched `/\b(?:eval|
 * Function)\b/` over comment-stripped, string-masked source and decided
 * membership from neighbouring characters. Every property that decision needed
 * — is this a type or a value, a key or a value, a declaration or a reference,
 * which binding owns this name — is a question about structure, and each was
 * approximated by a character test with its own blind spot. Review then
 * reported the blind spots one spelling at a time. A measured probe of twelve
 * shapes found NINE invisible: `eval` (the scanner unescapes identifiers,
 * a regex does not), `{ run: eval }` (a property VALUE is indistinguishable
 * from a type annotation when you only look for a preceding colon),
 * `const { eval: run } = globalThis` (same colon, opposite meaning),
 * `window['setTimeout']('code')` (a computed callee never reaches the timer
 * pattern), `Reflect.get(globalThis, 'eval')(x)` (string masking erases the
 * evidence), and their neighbours. A parser answers all of them by
 * construction, because it is answering the question that was actually being
 * asked.
 *
 * Regions, not files. `.astro` is 28 of the 37 swept files and is not a
 * TypeScript program: it is frontmatter, optional `<script>` blocks, and markup
 * carrying `{expression}` holes. Each executable region is extracted with its
 * source offset and parsed on its own, so a finding still reports the line it
 * lives on. {@link EXTENSIONS_WITHOUT_EXECUTABLE_CODE} names the swept
 * extensions that carry no ECMAScript at all, and a law proves that every
 * swept extension is either extracted or named there — an extension with
 * neither is a hole, not a pass.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { ValidationError } from '../../packages/error/src/index.js';
import { nearestBinding } from '../../packages/audit/src/ts-scope.js';
import { getEnvironmentConfig } from '../../packages/vite/src/environments.js';

/**
 * `STRING_TIMER` is the implied-`eval` kind: a timer whose first argument is
 * not PROVEN callable, which includes but is not limited to a literal string of
 * source. The proof obligation sits on the argument, not on the engine's
 * ability to recognise a string.
 */
export type DynamicCodeKind = 'EVAL_CALL' | 'FUNCTION_CONSTRUCTOR' | 'STRING_TIMER' | 'DYNAMIC_IMPORT';

export interface DynamicCodeFinding {
  readonly file: string;
  readonly line: number;
  readonly kind: DynamicCodeKind;
  readonly text: string;
}

export interface DynamicCodeScan {
  readonly findings: readonly DynamicCodeFinding[];
  readonly swept: readonly string[];
}

/** One residue occurrence located within the source it was classified from. */
export interface DynamicCodeResidue {
  readonly kind: DynamicCodeKind;
  /** 1-based line within the whole file the region came from. */
  readonly line: number;
  readonly text: string;
}

const DYNAMIC_KIND_BY_NAME: ReadonlyMap<string, DynamicCodeKind> = new Map([
  ['eval', 'EVAL_CALL' as const],
  ['Function', 'FUNCTION_CONSTRUCTOR' as const],
]);
const TIMER_NAMES: ReadonlySet<string> = new Set(['setTimeout', 'setInterval', 'setImmediate']);
const GLOBAL_RECEIVER: ReadonlySet<string> = new Set(['globalThis', 'window', 'self']);
const DANGEROUS_IMPORT_SCHEME = /^(?:data|blob|javascript):/iu;
const FILE_URL_EXPORT_NAME = 'pathToFileURL';
const NODE_URL_SPECIFIER = 'node:url';

/* ------------------------------------------------------------------ *
 * Expression shape helpers
 * ------------------------------------------------------------------ */

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** A reference no enclosing scope binds — therefore whatever the host provides. */
function isFree(identifier: ts.Identifier): boolean {
  return nearestBinding(identifier) === undefined;
}

/** `globalThis` / `window` / `self`, and not a local binding wearing the name. */
function isGlobalReceiver(expression: ts.Expression): boolean {
  const current = unwrap(expression);
  return ts.isIdentifier(current) && GLOBAL_RECEIVER.has(current.text) && isFree(current);
}

/** The key of a member access when it is a literal this engine can READ. */
function staticKey(expression: ts.Expression): string | undefined {
  const current = unwrap(expression);
  return ts.isStringLiteralLike(current) ? current.text : undefined;
}

/** A declaration whose initializer is syntactically a function value. */
function initializerIsFunction(declaration: ts.Node): boolean {
  if (ts.isFunctionDeclaration(declaration)) return true;
  if (!ts.isVariableDeclaration(declaration) || declaration.initializer === undefined) return false;
  const initializer = unwrap(declaration.initializer);
  return ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer);
}

/**
 * A receiver proven NOT to be the host global object.
 *
 * Fail-closed: only a local `const` initialized with a literal object, a
 * function, a class, or a construction is provable here. A free identifier, a
 * parameter, or a binding whose initializer is itself a global alias
 * (`const parser = globalThis`) all stay unproven, so `receiver.eval` on them
 * remains residue.
 */
function provablySafeReceiver(expression: ts.Expression): boolean {
  const current = unwrap(expression);
  if (!ts.isIdentifier(current)) return false;
  const binding = nearestBinding(current);
  if (binding === undefined) return false;
  if (!ts.isVariableDeclaration(binding) || binding.initializer === undefined) return false;
  if ((binding.parent.flags & ts.NodeFlags.Const) === 0) return false;
  const initializer = unwrap(binding.initializer);
  if (isGlobalReceiver(initializer)) return false;
  return (
    ts.isObjectLiteralExpression(initializer) ||
    ts.isArrowFunction(initializer) ||
    ts.isFunctionExpression(initializer) ||
    ts.isClassExpression(initializer) ||
    ts.isNewExpression(initializer)
  );
}

/** Any ancestor type node — `const x: Function`, `x as Function`, `typeof eval`. */
function inTypePosition(node: ts.Node): boolean {
  for (let current: ts.Node | undefined = node; current !== undefined; current = current.parent) {
    if (ts.isTypeNode(current)) return true;
  }
  return false;
}

/**
 * Whether an identifier occurrence READS the name it spells.
 *
 * Declaration names, member names, property keys, and import/export specifiers
 * all spell the name without referring to the global capability; the member and
 * destructuring rules own those positions instead. A shorthand property
 * (`{ eval }`) IS a read, which is why it is admitted here.
 */
function isValueReference(identifier: ts.Identifier): boolean {
  const parent = identifier.parent;
  if (parent === undefined) return true;
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) return false;
  if (ts.isQualifiedName(parent) && parent.right === identifier) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === identifier) return false;
  if (ts.isBindingElement(parent)) return false;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) return false;
  if (ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return false;
  if (ts.isLabeledStatement(parent) && parent.label === identifier) return false;
  if (ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) return false;
  const named = parent as { readonly name?: ts.Node };
  if (
    named.name === identifier &&
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isEnumDeclaration(parent) ||
      ts.isEnumMember(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent) ||
      ts.isModuleDeclaration(parent))
  ) {
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * `pathToFileURL(...).href` — the one clearable non-literal specifier
 * ------------------------------------------------------------------ */

/**
 * The precise binding element for `name` when a resolved binding is a
 * destructuring declaration. Scope resolution reports the declaration that owns
 * a destructured name, which is the right answer for "is this name bound"; the
 * `node:url` proof additionally needs to read the element's own property name.
 */
function bindingElementFor(binding: ts.Node, name: string): ts.BindingElement | undefined {
  if (ts.isBindingElement(binding)) return binding;
  if (!ts.isVariableDeclaration(binding) || !ts.isObjectBindingPattern(binding.name)) return undefined;
  return binding.name.elements.find((element) => ts.isIdentifier(element.name) && element.name.text === name);
}

/** Whether a resolved binding really is `node:url`'s exported `pathToFileURL`. */
function bindsNodeUrlFileUrl(binding: ts.Node): boolean {
  if (ts.isImportSpecifier(binding)) {
    const importDeclaration = binding.parent.parent.parent;
    return (
      !binding.isTypeOnly &&
      !importDeclaration.importClause?.isTypeOnly &&
      (binding.propertyName?.text ?? binding.name.text) === FILE_URL_EXPORT_NAME &&
      ts.isStringLiteralLike(importDeclaration.moduleSpecifier) &&
      importDeclaration.moduleSpecifier.text === NODE_URL_SPECIFIER
    );
  }
  // CJS: `const { pathToFileURL } = require('node:url')`. The binding must be
  // immutable and `require` itself unbound, so a local decoy cannot fabricate
  // the same syntax.
  if (!ts.isBindingElement(binding) || !ts.isObjectBindingPattern(binding.parent)) return false;
  const imported = binding.propertyName ?? binding.name;
  if (!(ts.isIdentifier(imported) || ts.isStringLiteralLike(imported))) return false;
  if (imported.text !== FILE_URL_EXPORT_NAME) return false;
  const declaration = binding.parent.parent;
  if (!ts.isVariableDeclaration(declaration)) return false;
  if ((declaration.parent.flags & ts.NodeFlags.Const) === 0) return false;
  const initializer = declaration.initializer;
  return (
    initializer !== undefined &&
    ts.isCallExpression(initializer) &&
    ts.isIdentifier(initializer.expression) &&
    initializer.expression.text === 'require' &&
    isFree(initializer.expression) &&
    initializer.arguments.length === 1 &&
    ts.isStringLiteralLike(initializer.arguments[0]!) &&
    (initializer.arguments[0] as ts.StringLiteralLike).text === NODE_URL_SPECIFIER
  );
}

/**
 * `pathToFileURL(x).href` is the ONE non-literal specifier this engine clears,
 * and it clears on the CALLEE'S CONTRACT: `node:url`'s `pathToFileURL` always
 * yields a `file:` URL, which can never carry a blocked scheme. The clearance
 * is only as good as the referent, so the callee must RESOLVE to that import at
 * its own call site — a shadow or redeclaration fails closed.
 */
function fileUrlSpecifier(expression: ts.Expression): boolean {
  const current = unwrap(expression);
  if (!ts.isPropertyAccessExpression(current) || current.name.text !== 'href') return false;
  const call = unwrap(current.expression);
  if (!ts.isCallExpression(call)) return false;
  const callee = unwrap(call.expression);
  if (!ts.isIdentifier(callee)) return false;
  const binding = nearestBinding(callee);
  if (binding === undefined) return false;
  return bindsNodeUrlFileUrl(bindingElementFor(binding, callee.text) ?? binding);
}

/* ------------------------------------------------------------------ *
 * Timer arguments
 * ------------------------------------------------------------------ */

/** The timer this callee names, whether spelled bare, member, or computed. */
function timerCalleeName(expression: ts.Expression): string | undefined {
  const current = unwrap(expression);
  if (ts.isIdentifier(current)) {
    return TIMER_NAMES.has(current.text) && isFree(current) ? current.text : undefined;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return isGlobalReceiver(current.expression) && TIMER_NAMES.has(current.name.text) ? current.name.text : undefined;
  }
  if (ts.isElementAccessExpression(current) && isGlobalReceiver(current.expression)) {
    const key = staticKey(current.argumentExpression);
    return key !== undefined && TIMER_NAMES.has(key) ? key : undefined;
  }
  return undefined;
}

/**
 * Whether a timer's first argument is PROVEN to be a function.
 *
 * The polarity is the whole point. Asking "is this a string?" clears everything
 * the engine cannot read, which is the fail-open shape this batch exists to
 * remove; asking "is this proven callable?" makes an unreadable argument
 * residue. A syntactic function, a reference resolving to one, and a `.bind`
 * result are provable. A literal, a template, a concatenation, a call result,
 * or a reference to an import or global is not.
 *
 * Measured before choosing: the swept corpus contains ZERO timer calls, so the
 * strict polarity has no false-positive cost to weigh against the doctrine. If
 * it later fires on a legitimate `setTimeout(handler, 0)` whose callee arrives
 * by import, the cure is an arrow wrapper at the call site — a local, one-token
 * change that keeps the gate honest rather than a suppression that does not.
 */
function timerArgumentProvenCallable(argument: ts.Expression): boolean {
  const current = unwrap(argument);
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) return true;
  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === 'bind'
  ) {
    return timerArgumentProvenCallable(current.expression.expression);
  }
  if (ts.isIdentifier(current)) {
    const binding = nearestBinding(current);
    return binding !== undefined && initializerIsFunction(binding);
  }
  return false;
}

/**
 * `Reflect.get(globalThis, 'eval')` IS `globalThis['eval']` — the same property
 * read through a different spelling, so it answers to the same rule. Returns
 * the key when the call reads a global receiver, with `undefined` for a key
 * this engine cannot read.
 */
function reflectGetKey(node: ts.CallExpression): { readonly key: string | undefined } | undefined {
  const callee = unwrap(node.expression);
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== 'get') return undefined;
  const receiver = unwrap(callee.expression);
  if (!ts.isIdentifier(receiver) || receiver.text !== 'Reflect' || !isFree(receiver)) return undefined;
  if (node.arguments.length < 2 || !isGlobalReceiver(node.arguments[0]!)) return undefined;
  return { key: staticKey(node.arguments[1]!) };
}

/* ------------------------------------------------------------------ *
 * The classifier
 * ------------------------------------------------------------------ */

function collectResidue(sourceFile: ts.SourceFile, report: (kind: DynamicCodeKind, node: ts.Node) => void): void {
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const kind = DYNAMIC_KIND_BY_NAME.get(node.text);
      if (kind !== undefined && isValueReference(node) && !inTypePosition(node)) {
        const binding = nearestBinding(node);
        // A local binding only clears the name when it is PROVEN to hold a
        // function. `const eval = alias` re-exposes whatever `alias` is.
        if (binding === undefined || !initializerIsFunction(binding)) report(kind, node);
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      const kind = DYNAMIC_KIND_BY_NAME.get(node.name.text);
      if (kind !== undefined && !provablySafeReceiver(node.expression)) report(kind, node);
    }

    if (ts.isElementAccessExpression(node)) {
      const key = staticKey(node.argumentExpression);
      if (key === undefined) {
        // ALLOWLIST: on a global receiver the ONLY provably safe key is a
        // literal this engine can read. An identifier, a concatenation, or a
        // computed lookup is an open grammar, so both capabilities are
        // reachable. On a non-global receiver the identifier pass owns the
        // decision, so silence here stays correct.
        if (isGlobalReceiver(node.expression)) {
          report('EVAL_CALL', node);
          report('FUNCTION_CONSTRUCTOR', node);
        }
      } else {
        const kind = DYNAMIC_KIND_BY_NAME.get(key);
        if (kind !== undefined && !provablySafeReceiver(node.expression)) report(kind, node);
      }
    }

    // `const { eval: run } = globalThis` reads the capability without ever
    // spelling it in a reference position.
    if (ts.isBindingElement(node)) {
      const named = node.propertyName ?? node.name;
      const key = ts.isIdentifier(named) || ts.isStringLiteralLike(named) ? named.text : undefined;
      const kind = key === undefined ? undefined : DYNAMIC_KIND_BY_NAME.get(key);
      if (kind !== undefined) {
        const declaration = node.parent.parent;
        const source =
          ts.isVariableDeclaration(declaration) && declaration.initializer !== undefined
            ? declaration.initializer
            : undefined;
        if (source === undefined || !provablySafeReceiver(source)) report(kind, node);
      }
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        classifyImportCall(node, report);
      } else if (timerCalleeName(node.expression) !== undefined) {
        const first = node.arguments[0];
        if (first !== undefined && !timerArgumentProvenCallable(first)) report('STRING_TIMER', node);
      }
      const reflected = reflectGetKey(node);
      if (reflected !== undefined) {
        if (reflected.key === undefined) {
          report('EVAL_CALL', node);
          report('FUNCTION_CONSTRUCTOR', node);
        } else {
          const kind = DYNAMIC_KIND_BY_NAME.get(reflected.key);
          if (kind !== undefined) report(kind, node);
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

function classifyImportCall(node: ts.CallExpression, report: (kind: DynamicCodeKind, node: ts.Node) => void): void {
  if (node.arguments.length !== 1) {
    report('DYNAMIC_IMPORT', node);
    return;
  }
  const specifier = unwrap(node.arguments[0]!);
  // ALLOWLIST: a complete literal whose scheme is readable and safe, or a
  // `pathToFileURL(...).href` whose callee contract guarantees `file:`.
  // Anything else — `import(s)`, `import("data:" + x)`, `import(config.entry)`,
  // an interpolated template — can resolve at runtime to the very
  // data:/blob:/javascript: URL this gate blocks when written literally.
  if (ts.isStringLiteralLike(specifier)) {
    if (DANGEROUS_IMPORT_SCHEME.test(specifier.text)) report('DYNAMIC_IMPORT', node);
    return;
  }
  if (fileUrlSpecifier(specifier)) return;
  report('DYNAMIC_IMPORT', node);
}

/* ------------------------------------------------------------------ *
 * Executable regions
 * ------------------------------------------------------------------ */

interface CodeRegion {
  readonly text: string;
  /** Offset of this region's first character within the whole file. */
  readonly offset: number;
  readonly scriptKind: ts.ScriptKind;
}

/**
 * Swept extensions that carry no ECMAScript, with the reason each is inert.
 *
 * A swept extension that is neither extracted nor named here is a silent hole,
 * which `tests/unit/devops/dynamic-code-sources.test.ts` refuses.
 */
export const EXTENSIONS_WITHOUT_EXECUTABLE_CODE: Readonly<Record<string, string>> = {
  '.css': 'a stylesheet declares no ECMAScript; a url(javascript:) payload is the style surface’s authority',
};

const SCRIPT_BLOCK = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/giu;
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/giu;
const HTML_COMMENT = /<!--[\s\S]*?-->/gu;
const ASTRO_FRONTMATTER_OPEN = /^---[^\S\n]*\n/u;
const ASTRO_FRONTMATTER_CLOSE = /\n---[^\S\n]*(?:\n|$)/u;

function scriptKindForExtension(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** Blank a span while preserving every offset, so later scans stay aligned. */
function blankSpan(text: string, start: number, end: number): string {
  const blanked = text.slice(start, end).replace(/[^\n]/gu, ' ');
  return text.slice(0, start) + blanked + text.slice(end);
}

/**
 * Balanced `{...}` holes in Astro markup, quote-aware so a brace inside an
 * attribute string cannot open one. Style blocks and HTML comments are blanked
 * first: a CSS rule body is braces without being an expression.
 */
function markupExpressions(body: string, baseOffset: number): readonly CodeRegion[] {
  let scanned = body;
  for (const pattern of [SCRIPT_BLOCK, STYLE_BLOCK, HTML_COMMENT]) {
    pattern.lastIndex = 0;
    for (const match of [...scanned.matchAll(pattern)]) {
      scanned = blankSpan(scanned, match.index, match.index + match[0].length);
    }
  }
  const regions: CodeRegion[] = [];
  for (let index = 0; index < scanned.length; index += 1) {
    if (scanned[index] !== '{') continue;
    let depth = 1;
    let quote: "'" | '"' | '`' | null = null;
    let escaped = false;
    let cursor = index + 1;
    for (; cursor < scanned.length && depth > 0; cursor += 1) {
      const char = scanned[cursor]!;
      if (quote !== null) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === '`') quote = char;
      else if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
    }
    const end = depth === 0 ? cursor - 1 : scanned.length;
    regions.push({
      text: scanned.slice(index + 1, end),
      offset: baseOffset + index + 1,
      scriptKind: ts.ScriptKind.TSX,
    });
    index = end;
  }
  return regions;
}

/**
 * The executable regions of one swept file.
 *
 * A `.astro` component is frontmatter (TypeScript), any `<script>` blocks
 * (shipped to the browser), and the markup's `{expression}` holes. Everything
 * else this engine sweeps is a single whole-file program.
 */
export function executableRegions(path: string, text: string): readonly CodeRegion[] {
  if (!path.endsWith('.astro')) {
    const extension = path.slice(path.lastIndexOf('.'));
    if (extension in EXTENSIONS_WITHOUT_EXECUTABLE_CODE) return [];
    return [{ text, offset: 0, scriptKind: scriptKindForExtension(path) }];
  }

  const regions: CodeRegion[] = [];
  let bodyOffset = 0;
  const opening = ASTRO_FRONTMATTER_OPEN.exec(text);
  if (opening !== null) {
    const start = opening[0].length;
    const closing = ASTRO_FRONTMATTER_CLOSE.exec(text.slice(start));
    // Unterminated frontmatter is not a licence to skip the file: treat the
    // remainder as the region rather than dropping it.
    const frontmatterEnd = closing === null ? text.length : start + closing.index;
    regions.push({ text: text.slice(start, frontmatterEnd), offset: start, scriptKind: ts.ScriptKind.TS });
    bodyOffset = closing === null ? text.length : frontmatterEnd + closing[0].length;
  }

  const body = text.slice(bodyOffset);
  SCRIPT_BLOCK.lastIndex = 0;
  for (const match of body.matchAll(SCRIPT_BLOCK)) {
    const inner = match[1] ?? '';
    regions.push({
      text: inner,
      offset: bodyOffset + match.index + match[0].indexOf(inner),
      scriptKind: ts.ScriptKind.JS,
    });
  }
  regions.push(...markupExpressions(body, bodyOffset));
  return regions;
}

/* ------------------------------------------------------------------ *
 * Public classification surface
 * ------------------------------------------------------------------ */

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset && index < text.length; index += 1) {
    if (text[index] === '\n') line += 1;
  }
  return line;
}

/**
 * Every residue occurrence in one file's executable regions, with the line it
 * sits on in the ORIGINAL file.
 */
export function findDynamicCodeResidue(text: string, path = 'source.ts'): readonly DynamicCodeResidue[] {
  const lines = text.split('\n');
  const residue: DynamicCodeResidue[] = [];
  for (const region of executableRegions(path, text)) {
    const sourceFile = ts.createSourceFile(
      `region${region.offset}.ts`,
      region.text,
      ts.ScriptTarget.Latest,
      true,
      region.scriptKind,
    );
    collectResidue(sourceFile, (kind, node) => {
      const line = lineOf(text, region.offset + node.getStart(sourceFile));
      residue.push({ kind, line, text: (lines[line - 1] ?? '').trim() });
    });
  }
  return residue;
}

/**
 * The distinct residue kinds in one source fragment.
 *
 * The extra parameters the text-era signature carried (a whole-file context and
 * the fragment's offset within it) are gone: a parsed region already has the
 * binding context that referent proofs need, so a caller never has to supply
 * one separately.
 */
export function classifyDynamicCodeSource(source: string): readonly DynamicCodeKind[] {
  return [...new Set(findDynamicCodeResidue(source).map((entry) => entry.kind))];
}

/**
 * The first residue kind in ONE PHYSICAL LINE, or `null` when it carries none.
 *
 * A bare line is not a program, and a JSDoc continuation (` * eval( is banned`)
 * parses as a multiplication against a call once its enclosing comment is gone.
 * The whole-file path never needs this guard — a comment is simply absent from
 * the tree — so the heuristic stays local to the physical-line contract, where
 * the caller has already discarded the context that would settle it.
 */
export function classifyDynamicCodeLine(line: string): DynamicCodeKind | null {
  if (line.trimStart().startsWith('*')) return null;
  return classifyDynamicCodeSource(line)[0] ?? null;
}

const DYNAMIC_CODE_SUPPLEMENTAL_EXTENSIONS = ['.mjs', '.cjs', '.astro'] as const;

interface PackageManifest {
  readonly files?: unknown;
  readonly exports?: unknown;
  readonly bin?: unknown;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Package-source extensions the root lint command proves it owns.
 *
 * THE CLASS RULE: the ANCHOR is every quoted `packages/.../src/...` glob in
 * the root `lint` script; the ALLOWLIST is its terminal extension. Missing or
 * malformed authority delegates nothing, so the dynamic scanner widens rather
 * than silently dropping a source class.
 */
export function lintOwnedPackageSourceExtensions(repoRoot: string): readonly string[] {
  const manifestPath = join(repoRoot, 'package.json');
  if (!existsSync(manifestPath)) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!isRecord(parsed) || !isRecord(parsed['scripts']) || typeof parsed['scripts']['lint'] !== 'string') return [];
    const extensions = new Set<string>();
    for (const match of parsed['scripts']['lint'].matchAll(/"(packages\/[^" ]+\/src\/[^" ]+)"/gu)) {
      const extension = match[1]?.match(/(\.[A-Za-z0-9]+)$/u)?.[1];
      if (extension !== undefined) extensions.add(extension);
    }
    return [...extensions].sort();
  } catch {
    return [];
  }
}

/** Browser-host extensions not delegated to lint, plus shipped runtime forms. */
export function dynamicCodeSourceExtensions(repoRoot: string): readonly string[] {
  const lintOwned = new Set(lintOwnedPackageSourceExtensions(repoRoot));
  return [
    ...new Set([
      ...getEnvironmentConfig('browser').resolve.extensions.filter((extension) => !lintOwned.has(extension)),
      ...DYNAMIC_CODE_SUPPLEMENTAL_EXTENSIONS,
    ]),
  ];
}

function runtimeSource(path: string, extensions: readonly string[]): boolean {
  return extensions.some((extension) => path.endsWith(extension));
}

function authoredPackageFiles(dir: string, files: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    // `dist` is a derivable projection of the `src` authority and may appear
    // only because a local build ran. Scanning it would make the census depend
    // on dirty build state and duplicate every authored source finding.
    if (name === 'dist' || name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) authoredPackageFiles(path, files);
    else files.push(path);
  }
}

function manifestGlobRegExp(pattern: string): RegExp {
  const normalized = pattern.replaceAll('\\', '/').replace(/^\.\//u, '');
  let source = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]!;
    if (char === '*') {
      if (normalized[index + 1] === '*') {
        source += '.*';
        index += 1;
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    }
  }
  return new RegExp(`${source}$`, 'u');
}

function normalizedManifestTarget(packageDir: string, target: string, authority: string): string {
  const normalized = target.replaceAll('\\', '/').replace(/^\.\//u, '');
  const absolute = resolve(packageDir, normalized);
  const withinPackage = relative(packageDir, absolute).replaceAll('\\', '/');
  if (withinPackage === '..' || withinPackage.startsWith('../')) {
    throw ValidationError('publishedRuntimeRoots', `${authority} target escapes its package: ${target}`);
  }
  return absolute;
}

function exportTargets(value: unknown, authority: string, targets: string[]): void {
  if (value === null) return;
  if (typeof value === 'string') {
    targets.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) exportTargets(child, `${authority}[${index}]`, targets);
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) exportTargets(child, `${authority}.${key}`, targets);
    return;
  }
  throw ValidationError(
    'publishedRuntimeRoots',
    `${authority} must contain only string, object, array, or null targets`,
  );
}

function binTargets(value: unknown, authority: string): readonly string[] {
  if (typeof value === 'string') return [value];
  if (!isRecord(value)) {
    throw ValidationError('publishedRuntimeRoots', `${authority} must be a string or command-to-path record`);
  }
  const targets: string[] = [];
  for (const [command, target] of Object.entries(value)) {
    if (typeof target !== 'string') {
      throw ValidationError('publishedRuntimeRoots', `${authority}.${command} must be a string target`);
    }
    targets.push(target);
  }
  return targets;
}

/**
 * Every authored non-lint-owned runtime path a package publishes, derived from
 * the union of its `files`, recursively nested `exports`, and `bin` targets.
 *
 * THE CLASS RULE: the ANCHOR is every package manifest under `packages/`; the
 * ALLOWLIST is a structurally valid publication authority. A malformed or
 * absent authority is a refusal, never an empty contribution. Generated
 * `dist` targets resolve back to the separately swept `src` authority so local
 * build state cannot change the census.
 */
export function publishedRuntimeRoots(repoRoot: string): readonly string[] {
  const sourceExtensions = dynamicCodeSourceExtensions(repoRoot);
  const packagesDir = join(repoRoot, 'packages');
  const published = new Set<string>();
  for (const packageName of readdirSync(packagesDir).sort()) {
    const packageDir = join(packagesDir, packageName);
    if (!statSync(packageDir).isDirectory()) continue;
    const manifestPath = join(packageDir, 'package.json');
    if (!existsSync(manifestPath)) {
      throw ValidationError('publishedRuntimeRoots', `${relative(repoRoot, packageDir)} has no package.json authority`);
    }

    let manifest: PackageManifest;
    try {
      const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (!isRecord(parsed)) throw ValidationError('publishedRuntimeRoots', `${manifestPath} is not a JSON object`);
      manifest = parsed;
    } catch (cause) {
      if (isRecord(cause) && cause._tag === 'ValidationError') throw cause;
      throw ValidationError('publishedRuntimeRoots', `cannot parse ${manifestPath}: ${String(cause)}`);
    }

    const hasFiles = manifest.files !== undefined;
    const hasExports = manifest.exports !== undefined;
    const hasBin = manifest.bin !== undefined;
    if (!hasFiles && !hasExports && !hasBin) {
      throw ValidationError(
        'publishedRuntimeRoots',
        `${relative(repoRoot, manifestPath)} declares no files, exports, or bin authority`,
      );
    }

    const packageFiles: string[] = [];
    authoredPackageFiles(packageDir, packageFiles);
    if (hasFiles) {
      if (!Array.isArray(manifest.files) || manifest.files.some((entry) => typeof entry !== 'string')) {
        throw ValidationError('publishedRuntimeRoots', `${relative(repoRoot, manifestPath)} files must be strings`);
      }
      for (const entry of manifest.files) {
        const matcher = manifestGlobRegExp(entry);
        const declaredPath = normalizedManifestTarget(packageDir, entry, `${packageName}.files`);
        const directoryPrefix = entry.replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/$/u, '');
        const directoryEntry =
          !entry.includes('*') &&
          !entry.includes('?') &&
          existsSync(declaredPath) &&
          statSync(declaredPath).isDirectory();
        for (const file of packageFiles) {
          const withinPackage = relative(packageDir, file).replaceAll('\\', '/');
          if (
            (matcher.test(withinPackage) || (directoryEntry && withinPackage.startsWith(`${directoryPrefix}/`))) &&
            runtimeSource(file, sourceExtensions)
          ) {
            published.add(file);
          }
        }
      }
    }

    const explicitTargets: string[] = [];
    if (hasExports) exportTargets(manifest.exports, `${packageName}.exports`, explicitTargets);
    if (hasBin) explicitTargets.push(...binTargets(manifest.bin, `${packageName}.bin`));
    for (const target of explicitTargets) {
      const absolute = normalizedManifestTarget(packageDir, target, packageName);
      const withinPackage = relative(packageDir, absolute).replaceAll('\\', '/');
      if (withinPackage === 'dist' || withinPackage.startsWith('dist/')) continue;
      if (runtimeSource(absolute, sourceExtensions)) {
        if (!existsSync(absolute) || !statSync(absolute).isFile()) {
          throw ValidationError(
            'publishedRuntimeRoots',
            `${relative(repoRoot, manifestPath)} publishes missing runtime target ${target}`,
          );
        }
        published.add(absolute);
      }
    }
  }
  return [...published].sort();
}

function collectShipped(dir: string, files: string[], extensions: readonly string[]): void {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collectShipped(path, files, extensions);
    else if (extensions.some((ext) => name.endsWith(ext))) files.push(path);
  }
}

/**
 * Sweep every package source tree plus every manifest-published authored
 * non-lint-owned runtime source for dynamic-code forms. Returns findings plus
 * the swept inventory so the consuming law can prove it saw the real population.
 *
 * One parse per region replaces the text era's line pass plus collapsed-source
 * fallback: a construct split across lines is simply one node, so there is no
 * second pass to keep in step with the first.
 */
export function scanShippedDynamicCode(repoRoot: string): DynamicCodeScan {
  const sourceExtensions = dynamicCodeSourceExtensions(repoRoot);
  const files = new Set<string>(publishedRuntimeRoots(repoRoot));
  const packagesDir = join(repoRoot, 'packages');
  for (const pkg of readdirSync(packagesDir).sort()) {
    const src = join(packagesDir, pkg, 'src');
    if (existsSync(src)) {
      const sourceFiles: string[] = [];
      collectShipped(src, sourceFiles, sourceExtensions);
      for (const file of sourceFiles) files.add(file);
    }
  }
  const findings: DynamicCodeFinding[] = [];
  const swept: string[] = [];
  for (const file of [...files].sort()) {
    const rel = relative(repoRoot, file).replace(/\\/g, '/');
    swept.push(rel);
    for (const entry of findDynamicCodeResidue(readFileSync(file, 'utf8'), rel)) {
      findings.push({ file: rel, line: entry.line, kind: entry.kind, text: entry.text });
    }
  }
  return { findings, swept };
}
