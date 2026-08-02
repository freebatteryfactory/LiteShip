/**
 * Dynamic-code residue law for shipped sources outside the root lint scope.
 *
 * The blocking ESLint authority enforces `no-eval` / `no-new-func` /
 * `no-implied-eval` over the root lint command's package-source globs. This
 * engine derives the remaining browser extensions from Vite's host authority,
 * adds runtime-specific module/component forms, and scans those files with a
 * line classifier plus repository sweep. The unit laws pin both package source
 * trees and manifest-published runtime files to zero findings.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ValidationError } from '../../packages/error/src/index.js';
import { getEnvironmentConfig } from '../../packages/vite/src/environments.js';

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

const DYNAMIC_TOKEN = /\b(?:eval|Function)\b/gu;
const GLOBAL_RECEIVER = new Set(['globalThis', 'window', 'self']);
const STRING_TIMER_CALLEE = /\bset(?:Timeout|Interval|Immediate)\s*\(/gu;
const DYNAMIC_IMPORT_CALLEE = /\bimport\s*\(/gu;
const COMPUTED_MEMBER = /\b([A-Za-z_$][\w$]*)\s*(?:\?\.)?\s*\[/gu;

/**
 * `pathToFileURL(x).href` is the ONE non-literal import specifier the
 * classifier can clear, and it clears on the CALLEE'S CONTRACT rather than on
 * the argument: `node:url`'s `pathToFileURL` always yields a `file:` URL, so
 * the result can never carry a scheme {@link DANGEROUS_IMPORT_SCHEME} blocks.
 */
const FILE_URL_SPECIFIER = /^\s*pathToFileURL\s*\(/u;

/** The binding must RESOLVE to `node:url` — a local shadow proves nothing. */
const FILE_URL_BUILDER_IMPORT =
  /(?:import\s*\{[^}]*\bpathToFileURL\b[^}]*\}\s*from\s*['"]node:url['"]|require\s*\(\s*['"]node:url['"]\s*\))/u;

function importsFileUrlBuilder(source: string): boolean {
  return FILE_URL_BUILDER_IMPORT.test(source);
}
const DANGEROUS_IMPORT_SCHEME = /^(?:data|blob|javascript):/iu;
const SAFE_CONST_DYNAMIC_BINDING =
  /\bconst\s+(eval|Function)\s*=\s*(?:(?:async\s+)?function\b|(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?[A-Za-z_$][\w$]*\s*=>)/gu;
const SAFE_DECLARED_DYNAMIC_BINDING = /\b(?:function|class)\s+(eval|Function)\b/gu;
const SAFE_RECEIVER_BINDING =
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\{|(?:async\s+)?function\b|(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?[A-Za-z_$][\w$]*\s*=>)/gu;

interface StringScalar {
  readonly value: string;
  readonly escaped: boolean;
  readonly closed: boolean;
  readonly interpolated: boolean;
  /** Index just past the literal — lets a caller prove nothing else composes it. */
  readonly end: number;
}

interface ProvenBinding {
  readonly name: string;
  readonly scope: string;
}

/** Replace comments with spaces while preserving source offsets and string contents. */
function stripCommentsPreservingStrings(source: string): string {
  const output = [...source];
  let quote: "'" | '"' | '`' | null = null;
  let lineComment = false;
  let blockComment = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n' || char === '\r') lineComment = false;
      else output[index] = ' ';
      continue;
    }
    if (blockComment) {
      output[index] = char === '\n' || char === '\r' ? char : ' ';
      if (char === '*' && next === '/') {
        output[index + 1] = ' ';
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if (char === '/' && next === '/') {
      output[index] = ' ';
      output[index + 1] = ' ';
      index += 1;
      lineComment = true;
    } else if (char === '/' && next === '*') {
      output[index] = ' ';
      output[index + 1] = ' ';
      index += 1;
      blockComment = true;
    }
  }
  return output.join('');
}

/** Mask string contents while preserving source offsets for token classification. */
function maskStrings(source: string): string {
  const output = [...source];
  let quote: "'" | '"' | '`' | null = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quote !== null) {
      output[index] = char === '\n' || char === '\r' ? char : ' ';
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') {
      output[index] = ' ';
      quote = char;
    }
  }
  return output.join('');
}

/** Extract executable `${...}` bodies; ordinary template text remains a string. */
function templateExpressionBodies(source: string): readonly string[] {
  const bodies: string[] = [];
  let outerQuote: "'" | '"' | null = null;
  let outerEscaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const outerChar = source[index]!;
    if (outerQuote !== null) {
      if (outerEscaped) outerEscaped = false;
      else if (outerChar === '\\') outerEscaped = true;
      else if (outerChar === outerQuote) outerQuote = null;
      continue;
    }
    if (outerChar === "'" || outerChar === '"') {
      outerQuote = outerChar;
      continue;
    }
    if (source[index] !== '`') continue;
    for (index += 1; index < source.length; index += 1) {
      const char = source[index]!;
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '`') break;
      if (char !== '$' || source[index + 1] !== '{') continue;
      const start = index + 2;
      let depth = 1;
      let quote: "'" | '"' | null = null;
      let escaped = false;
      let cursor = start;
      for (; cursor < source.length; cursor += 1) {
        const expressionChar = source[cursor]!;
        if (quote !== null) {
          if (escaped) escaped = false;
          else if (expressionChar === '\\') escaped = true;
          else if (expressionChar === quote) quote = null;
          continue;
        }
        if (expressionChar === "'" || expressionChar === '"') {
          quote = expressionChar;
        } else if (expressionChar === '{') {
          depth += 1;
        } else if (expressionChar === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      bodies.push(source.slice(start, cursor));
      index = cursor;
    }
  }
  return bodies;
}

function scopeKeys(source: string): readonly string[] {
  const keys: string[] = [];
  const stack: number[] = [];
  let nextScope = 1;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '}') stack.pop();
    keys[index] = `/${stack.join('/')}/`;
    if (source[index] === '{') {
      stack.push(nextScope);
      nextScope += 1;
    }
  }
  return keys;
}

function collectProvenBindings(masked: string, scopes: readonly string[], pattern: RegExp): readonly ProvenBinding[] {
  const bindings: ProvenBinding[] = [];
  for (const match of masked.matchAll(pattern)) {
    bindings.push({ name: match[1]!, scope: scopes[match.index] ?? '/' });
  }
  return bindings;
}

function bindingVisible(bindings: readonly ProvenBinding[], name: string, scope: string): boolean {
  // Same-scope proof is deliberately conservative: an inner block may shadow
  // an otherwise-safe outer name with an unclassifiable alias. Admitting only
  // exact scope identity can false-red a nested use, but cannot false-green a
  // shadowed global dynamic-code capability.
  return bindings.some((binding) => binding.name === name && scope === binding.scope);
}

function stringScalarAt(source: string, offset: number): StringScalar | null {
  let index = offset;
  while (/\s/u.test(source[index] ?? '')) index += 1;
  const quote = source[index];
  if (quote !== "'" && quote !== '"' && quote !== '`') return null;
  let value = '';
  let escaped = false;
  for (index += 1; index < source.length; index += 1) {
    const char = source[index]!;
    if (char === '\\') {
      escaped = true;
      index += 1;
      if (index < source.length) value += source[index]!;
      continue;
    }
    if (char === quote) {
      return { value, escaped, closed: true, interpolated: quote === '`' && value.includes('${'), end: index + 1 };
    }
    value += char;
  }
  return {
    value,
    escaped,
    closed: false,
    interpolated: quote === '`' && value.includes('${'),
    end: source.length,
  };
}

function immediateMemberReceiver(masked: string, tokenOffset: number): string | null {
  const match = masked.slice(0, tokenOffset).match(/([A-Za-z_$][\w$]*)\s*(?:\.|\?\.)\s*$/u);
  return match?.[1] ?? null;
}

function previousNonWhitespace(source: string, offset: number): string {
  for (let index = offset - 1; index >= 0; index -= 1) {
    if (!/\s/u.test(source[index]!)) return source[index]!;
  }
  return '';
}

function nextNonWhitespace(source: string, offset: number): string {
  for (let index = offset; index < source.length; index += 1) {
    if (!/\s/u.test(source[index]!)) return source[index]!;
  }
  return '';
}

function typeOnlyToken(masked: string, tokenOffset: number): boolean {
  if (previousNonWhitespace(masked, tokenOffset) === ':') return true;
  return /\bas\s*$/u.test(masked.slice(0, tokenOffset));
}

/**
 * Classify dynamic-code residue in one logical source fragment.
 *
 * THE CLASS RULE: the ANCHOR is every `eval` / `Function` token in a callee or
 * reference position. The ALLOWLIST is only a comment/string, a proven local
 * binding, a type position, or a property on a receiver proven not to be a
 * global object. The old denylist lost six callee spellings at once; callee
 * syntax is an open grammar, so anything this classifier cannot prove safe is
 * residue. Dangerous `data:`, `blob:`, and `javascript:` imports follow the
 * same fail-closed rule for escaped or unterminated specifiers.
 */
export function classifyDynamicCodeSource(source: string, fileContext: string = source): readonly DynamicCodeKind[] {
  const commentStripped = stripCommentsPreservingStrings(source);
  const masked = maskStrings(commentStripped);
  const kinds = new Set<DynamicCodeKind>();
  const scopes = scopeKeys(masked);
  const localBindings = [
    ...collectProvenBindings(masked, scopes, SAFE_CONST_DYNAMIC_BINDING),
    ...collectProvenBindings(masked, scopes, SAFE_DECLARED_DYNAMIC_BINDING),
  ];
  const safeReceivers = collectProvenBindings(masked, scopes, SAFE_RECEIVER_BINDING);

  for (const expression of templateExpressionBodies(commentStripped)) {
    for (const kind of classifyDynamicCodeSource(expression)) kinds.add(kind);
  }

  for (const match of masked.matchAll(DYNAMIC_TOKEN)) {
    const token = match[0]!;
    const offset = match.index;
    const scope = scopes[offset] ?? '/';
    const receiver = immediateMemberReceiver(masked, offset);
    if (receiver !== null && !GLOBAL_RECEIVER.has(receiver) && bindingVisible(safeReceivers, receiver, scope)) continue;
    if (receiver === null) {
      if (bindingVisible(localBindings, token, scope)) continue;
      if (typeOnlyToken(masked, offset)) continue;
      if (nextNonWhitespace(masked, offset + token.length) === ':') continue;
    }
    kinds.add(token === 'eval' ? 'EVAL_CALL' : 'FUNCTION_CONSTRUCTOR');
  }

  for (const match of masked.matchAll(COMPUTED_MEMBER)) {
    const receiver = match[1]!;
    const scope = scopes[match.index] ?? '/';
    const scalar = stringScalarAt(commentStripped, match.index + match[0].length);
    // ALLOWLIST: on a global receiver the ONLY provably safe key is a single
    // complete literal that closes the subscript by itself. Anything else —
    // an identifier (`globalThis[key]`), a concatenation
    // (`window["ev" + "al"]`), a computed lookup (`self[KEYS.eval]`) — is an
    // open grammar the classifier cannot read, so it is residue in both kinds
    // (Codex review on PR #197, confirmed P1). On a NON-global receiver the
    // DYNAMIC_TOKEN pass owns the decision, so silence here stays correct.
    // The subscript must CLOSE in the text under analysis: a line pass sees
    // `window[` truncated at the newline, and the collapsed whole-source pass
    // owns that shape. An unclosed fragment is deferred, never cleared.
    const subscriptCloses = commentStripped.indexOf(']', match.index + match[0].length) !== -1;
    if (GLOBAL_RECEIVER.has(receiver) && subscriptCloses) {
      const soleLiteralKey = scalar !== null && scalar.closed && nextNonWhitespace(commentStripped, scalar.end) === ']';
      if (!soleLiteralKey) {
        kinds.add('EVAL_CALL');
        kinds.add('FUNCTION_CONSTRUCTOR');
        continue;
      }
    }
    if (scalar === null) continue;
    const receiverIsSafe =
      !GLOBAL_RECEIVER.has(receiver) &&
      bindingVisible(safeReceivers, receiver, scope) &&
      scalar.closed &&
      !scalar.escaped &&
      !scalar.interpolated;
    if (receiverIsSafe) continue;
    if (!scalar.closed || scalar.escaped || scalar.interpolated || scalar.value === 'eval') kinds.add('EVAL_CALL');
    if (!scalar.closed || scalar.escaped || scalar.interpolated || scalar.value === 'Function') {
      kinds.add('FUNCTION_CONSTRUCTOR');
    }
  }

  // The import proof is a FILE-level fact: a per-line pass sees the call
  // without the `import { pathToFileURL } from 'node:url'` that licenses it,
  // so the driver threads the whole file in as context.
  const fileUrlProven = importsFileUrlBuilder(fileContext);
  for (const match of masked.matchAll(DYNAMIC_IMPORT_CALLEE)) {
    const argumentOffset = match.index + match[0].length;
    // The call must CLOSE in the text under analysis. A line pass sees
    // `const mod = import(` truncated at the newline; the collapsed
    // whole-source pass owns that shape. An unclosed fragment is deferred to
    // a named pass that does decide it, never cleared here.
    if (commentStripped.indexOf(')', argumentOffset) === -1) continue;
    const scalar = stringScalarAt(commentStripped, argumentOffset);
    // ALLOWLIST: a complete, unescaped, uninterpolated literal whose scheme
    // is readable and safe — or a `pathToFileURL(...).href` specifier, whose
    // callee CONTRACT guarantees a `file:` URL and therefore can never carry
    // a blocked scheme. Anything else the classifier cannot READ
    // (`import(s)`, `import("data:" + x)`, `import(config.entry)`) can
    // resolve at runtime to the very data:/blob:/javascript: URL this gate
    // blocks when written literally, so it is residue. This is the same
    // null-scalar fail-open as the computed-member pass above; it survived
    // that fix because only the named site was swept (Codex review round 4
    // on PR #197, confirmed P1).
    if (scalar !== null) {
      if (!scalar.closed || scalar.escaped || scalar.interpolated || DANGEROUS_IMPORT_SCHEME.test(scalar.value)) {
        kinds.add('DYNAMIC_IMPORT');
      }
      continue;
    }
    if (!(fileUrlProven && FILE_URL_SPECIFIER.test(commentStripped.slice(argumentOffset)))) {
      kinds.add('DYNAMIC_IMPORT');
    }
  }

  for (const match of masked.matchAll(STRING_TIMER_CALLEE)) {
    if (stringScalarAt(commentStripped, match.index + match[0].length) !== null) kinds.add('STRING_TIMER');
  }

  return [...kinds];
}

/**
 * Compatibility classifier for callers that need the first residue kind on a
 * physical line. The repository sweep consumes the complete source classifier.
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
    const source = readFileSync(file, 'utf8');
    const lines = source.split('\n');
    // Strip over the WHOLE file before splitting. A JSDoc interior line starts
    // with `*`, but a real continuation expression may too; only lexical
    // comment state can distinguish them without opening an evasion.
    const activeLines = stripCommentsPreservingStrings(source).split('\n');
    let found = false;
    for (let index = 0; index < activeLines.length; index += 1) {
      for (const kind of classifyDynamicCodeSource(activeLines[index]!, source)) {
        findings.push({ file: rel, line: index + 1, kind, text: lines[index]!.trim() });
        found = true;
      }
    }
    // Mirror effect-residue's second pass: strip comment text, then collapse
    // whitespace so split callees, computed properties, and import specifiers
    // cannot evade a classifier that otherwise sees physical lines. A prior
    // finding already blocks the zero-finding law, so per-file dedup is sound.
    if (!found) {
      const collapsed = activeLines.join(' ').replace(/\s+/gu, ' ');
      for (const kind of classifyDynamicCodeSource(collapsed)) {
        findings.push({
          file: rel,
          line: 0,
          kind,
          text: 'construct spans line boundaries (collapsed-source match)',
        });
      }
    }
  }
  return { findings, swept };
}
