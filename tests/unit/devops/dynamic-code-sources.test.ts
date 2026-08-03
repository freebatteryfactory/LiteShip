/**
 * Shipped non-TypeScript sources carry no dynamic code evaluation.
 *
 * The defect class (PR #185 review): the blocking ESLint `no-eval` /
 * `no-new-func` / `no-implied-eval` authority sweeps only `**​/*.ts`, so an
 * `eval` in published Astro frontmatter (e.g. `packages/astro/src/Adaptive.astro`)
 * would pass `check/lint` untouched. This law is the equivalent authority for
 * every shipped `.astro`/`.js`/`.mjs`/`.cjs` admitted by a package manifest,
 * plus the package source trees consumed by the build.
 */
import { describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import {
  EXTENSIONS_WITHOUT_EXECUTABLE_CODE,
  classifyDynamicCodeLine,
  classifyDynamicCodeSource,
  dynamicCodeSourceExtensions,
  executableRegions,
  findDynamicCodeResidue,
  scanShippedDynamicCode,
} from '../../../scripts/lib/dynamic-code-residue.js';

const ROOT = resolve(import.meta.dirname, '../../..');
/**
 * A representative body per swept extension. THE REGION LAW below requires one
 * for every extension the sweep reaches, so enrolling a new extension forces an
 * explicit answer to "what does executable code look like in this format?"
 * rather than letting it inherit the whole-file-is-a-program assumption.
 */
const EXTENSION_PROBES: Readonly<Record<string, string>> = {
  '.tsx': 'const value = 1;\n',
  '.js': 'const value = 1;\n',
  '.jsx': 'const value = 1;\n',
  '.mjs': 'const value = 1;\n',
  '.cjs': 'const value = 1;\n',
  '.astro': '---\nconst value = 1;\n---\n<div>ok</div>\n',
  '.css': '.a { color: red }\n',
};
const RUNTIME_EXTENSIONS = ['.astro', '.js', '.mjs', '.cjs'] as const;
// Floor observed when the manifest-derived sweep first enrolled the authored
// published runtime surface. This is a shrink alarm, never a target or ceiling.
const PUBLISHED_RUNTIME_SWEEP_FLOOR = 34;
const EVASIONS = [
  { name: 'global receiver eval', source: 'globalThis.eval(x)' },
  { name: 'computed global receiver eval', source: 'window["eval"](x)' },
  { name: 'indirect eval', source: '(0, eval)(x)' },
  { name: 'aliased eval reference', source: 'const e = eval; e(x)' },
  { name: 'global receiver Function', source: 'globalThis.Function("x")' },
  { name: 'data URL dynamic import', source: 'import("data:text/javascript,export default 1")' },
  // Codex review on PR #197, confirmed P1: a computed member whose key is not
  // a string literal was silently skipped, so any indirection past the global
  // receiver escaped. The key spelling is an open grammar; only a literal the
  // classifier can read is provably safe.
  { name: 'identifier-keyed global member', source: "const key = 'eval'; globalThis[key](payload)" },
  { name: 'concatenation-keyed global member', source: 'window["ev" + "al"](payload)' },
  { name: 'computed-key global member', source: 'self[KEYS.eval](payload)' },
  // Codex review round 4 on PR #197, confirmed P1: the SAME null-scalar
  // fail-open as the computed-member arms, in the sibling call site of the
  // same function. A non-literal specifier can resolve at runtime to the
  // very data:/blob:/javascript: URL this gate blocks when written out.
  { name: 'identifier dynamic-import specifier', source: 'const s = payload; import(s)' },
  { name: 'concatenated dynamic-import specifier', source: 'import("data:" + payload)' },
  { name: 'member dynamic-import specifier', source: 'import(config.entry)' },
  // A pathToFileURL-shaped specifier whose binding does NOT resolve to
  // node:url proves nothing — the callee-contract clearance is only as good
  // as the referent (the R9 lesson, applied here before it was reported).
  { name: 'shadowed pathToFileURL specifier', source: 'const pathToFileURL = (v) => v; import(pathToFileURL(x).href)' },
  // THE PARSER SHAPES. Measured against the masked-text classifier before the
  // AST inversion: NINE of twelve probed shapes were invisible, and every one
  // of them asks a question about STRUCTURE that a character test can only
  // approximate. Each is now decided by the tree.
  //
  // An escaped identifier: the scanner decodes `a` into the identifier's
  // text, so `eval` IS `eval` to a parser and is not to a regex.
  { name: 'escaped global member', source: 'globalThis.ev\\u0061l(payload)' },
  { name: 'escaped bare identifier', source: 'ev\\u0061l(payload)' },
  // A property VALUE and a type annotation are both "a colon then a name".
  // Only the tree distinguishes them, and the old colon test cleared both.
  { name: 'object-literal property value', source: 'const runner = { run: eval }; runner.run(payload)' },
  // The same colon again, meaning the opposite thing: this READS the global.
  { name: 'destructured global alias', source: 'const { eval: run } = globalThis; run(payload)' },
  { name: 'nested destructured alias', source: 'const { g: { eval: run } } = holder; run(payload)' },
  // A computed callee never reached the timer pattern, which anchored on the
  // bare name followed by a paren.
  { name: 'computed timer callee', source: "window['setTimeout']('doEvil()', 0)" },
  { name: 'computed interval callee', source: "globalThis['setInterval']('x', 1)" },
  // `Reflect.get(o, k)` IS `o[k]`; string masking erased the key entirely.
  { name: 'reflective global read', source: "Reflect.get(globalThis, 'eval')(payload)" },
  // A timer argument that is not PROVEN callable is implied eval, whatever it
  // is spelled as.
  { name: 'timer argument not proven callable', source: 'setTimeout(handler, 0)' },
] as const;

function runtimeSource(path: string): boolean {
  return RUNTIME_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function walkFiles(dir: string, files: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(path, files);
    else files.push(path);
  }
}

function filesGlobRegExp(pattern: string): RegExp {
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

/** Independently enumerate runtime files admitted by each manifest's `files` field. */
function independentlyPublishedRuntimeSources(repoRoot: string): readonly string[] {
  const published = new Set<string>();
  const packagesDir = join(repoRoot, 'packages');
  for (const packageEntry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const packageDir = join(packagesDir, packageEntry.name);
    const manifestPath = join(packageDir, 'package.json');
    if (!statSync(manifestPath).isFile()) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly files?: unknown };
    if (!Array.isArray(manifest.files)) continue;
    const packageFiles: string[] = [];
    walkFiles(packageDir, packageFiles);
    for (const entry of manifest.files) {
      if (typeof entry !== 'string') continue;
      const matcher = filesGlobRegExp(entry);
      const directoryPrefix = entry.replaceAll('\\', '/').replace(/^\.\//u, '').replace(/\/$/u, '');
      const declaredPath = join(packageDir, directoryPrefix);
      const declaresDirectory =
        !directoryPrefix.includes('*') && existsSync(declaredPath) && statSync(declaredPath).isDirectory();
      for (const absolute of packageFiles) {
        const withinPackage = relative(packageDir, absolute).replaceAll('\\', '/');
        const admitted =
          matcher.test(withinPackage) || (declaresDirectory && withinPackage.startsWith(`${directoryPrefix}/`));
        if (admitted && runtimeSource(withinPackage)) {
          published.add(relative(repoRoot, absolute).replaceAll('\\', '/'));
        }
      }
    }
  }
  return [...published].sort();
}

describe('dynamic code in shipped non-TypeScript sources', () => {
  describe('the dynamic-code classifier sees every callee spelling', () => {
    it.each(EVASIONS)('$name is residue', ({ source }) => {
      expect(classifyDynamicCodeLine(source)).not.toBeNull();
    });

    it.each(['data:', 'blob:', 'javascript:'] as const)('%s dynamic imports are residue', (scheme) => {
      expect(classifyDynamicCodeLine(`import("${scheme}payload")`)).toBe('DYNAMIC_IMPORT');
    });

    it('a template-composed import specifier is refused when its scheme cannot be classified', () => {
      expect(classifyDynamicCodeLine('import(`da${piece}ta:payload`)')).toBe('DYNAMIC_IMPORT');
      expect(classifyDynamicCodeLine('import(`https://safe.example/module.js`)')).toBeNull();
    });

    it('refuses a pathToFileURL spelling that shadows the imported node:url binding', () => {
      const source = [
        "import { pathToFileURL as real } from 'node:url';",
        "const pathToFileURL = () => ({ href: 'data:text/javascript,export default 1' });",
        'import(pathToFileURL().href);',
      ].join('\n');
      expect(classifyDynamicCodeSource(source)).toContain('DYNAMIC_IMPORT');
    });

    it.each([
      {
        name: 'direct ESM import',
        source: "import { pathToFileURL } from 'node:url'; import(pathToFileURL(file).href);",
      },
      {
        name: 'aliased ESM import',
        source: "import { pathToFileURL as real } from 'node:url'; import(real(file).href);",
      },
      {
        name: 'direct CJS destructuring',
        source: "const { pathToFileURL } = require('node:url'); import(pathToFileURL(file).href);",
      },
      {
        name: 'aliased CJS destructuring',
        source: "const { pathToFileURL: real } = require('node:url'); import(real(file).href);",
      },
      {
        name: 'unrelated inner shadow',
        source: [
          "import { pathToFileURL } from 'node:url';",
          "{ const pathToFileURL = () => ({ href: 'data:text/javascript,evil' }); }",
          'import(pathToFileURL(file).href);',
        ].join('\n'),
      },
    ])('$name file-URL imports are admitted by their resolved binding', ({ source }) => {
      expect(classifyDynamicCodeSource(source)).not.toContain('DYNAMIC_IMPORT');
    });

    it.each([
      {
        name: 'same-name ESM redeclaration',
        source: [
          "import { pathToFileURL } from 'node:url';",
          "const pathToFileURL = () => ({ href: 'data:text/javascript,evil' });",
          'import(pathToFileURL().href);',
        ].join('\n'),
      },
      {
        name: 'relevant inner shadow',
        source: [
          "import { pathToFileURL } from 'node:url';",
          "{ const pathToFileURL = () => ({ href: 'data:text/javascript,evil' }); import(pathToFileURL().href); }",
        ].join('\n'),
      },
      {
        name: 'unrelated node:url require',
        source: [
          "const { fileURLToPath } = require('node:url');",
          "const pathToFileURL = () => ({ href: 'data:text/javascript,evil' });",
          'import(pathToFileURL().href);',
        ].join('\n'),
      },
      {
        name: 'shadowed require',
        source: [
          "const require = () => ({ pathToFileURL: () => ({ href: 'data:text/javascript,evil' }) });",
          "const { pathToFileURL } = require('node:url');",
          'import(pathToFileURL().href);',
        ].join('\n'),
      },
      {
        name: 'mutable CJS destructuring',
        source: [
          "let { pathToFileURL } = require('node:url');",
          "pathToFileURL = () => ({ href: 'data:text/javascript,evil' });",
          'import(pathToFileURL().href);',
        ].join('\n'),
      },
    ])('$name cannot license a file-URL import', ({ source }) => {
      expect(classifyDynamicCodeSource(source)).toContain('DYNAMIC_IMPORT');
    });

    it('an interleaved comment cannot hide a global eval reference', () => {
      expect(classifyDynamicCodeLine('globalThis /* decoy */ . eval(input)')).toBe('EVAL_CALL');
    });

    it('strings, comments, distinct local bindings, and unrelated properties are admitted', () => {
      expect(classifyDynamicCodeLine('const text = "eval(input) and Function(body)";')).toBeNull();
      expect(classifyDynamicCodeLine('const text = `eval(input)`;')).toBeNull();
      expect(classifyDynamicCodeLine('const text = "`${eval(input)}`";')).toBeNull();
      expect(classifyDynamicCodeLine('const value = 1; // eval(input)')).toBeNull();
      expect(classifyDynamicCodeLine('const eval = (source) => localParser(source); eval(input);')).toBeNull();
      expect(classifyDynamicCodeLine('const Function = (body) => body; Function(input);')).toBeNull();
      expect(classifyDynamicCodeLine('const parser = { eval: (value) => value }; parser.eval(input);')).toBeNull();
      expect(classifyDynamicCodeLine('const parser = { eval: (value) => value }; parser["eval"](input);')).toBeNull();
    });

    it('scope leaks and aliases of a global dynamic-code capability are findings', () => {
      expect(classifyDynamicCodeLine('{ const eval = (value) => value; } eval(input);')).toBe('EVAL_CALL');
      expect(classifyDynamicCodeLine('const eval = globalThis.eval; eval(input);')).toBe('EVAL_CALL');
      expect(classifyDynamicCodeLine('const parser = globalThis; parser.eval(input);')).toBe('EVAL_CALL');
      expect(classifyDynamicCodeLine('unknownParser["eval"](input);')).toBe('EVAL_CALL');
      expect(classifyDynamicCodeLine('const eval = (x) => x; { const eval = alias; eval(x); }')).toBe('EVAL_CALL');
      expect(
        classifyDynamicCodeLine('const parser = { eval: (x) => x }; { const parser = globalThis; parser.eval(x); }'),
      ).toBe('EVAL_CALL');
    });

    it('template text is inert but template interpolation executes', () => {
      expect(classifyDynamicCodeLine('const text = `eval(input)`;')).toBeNull();
      expect(classifyDynamicCodeLine('const text = `${eval(input)}`;')).toBe('EVAL_CALL');
    });

    // Line-spanning constructs used to be found by a second, collapsed-source
    // pass that could only report `line: 0` — it had thrown away the offsets.
    // A parsed construct is ONE node however it is wrapped, so the finding now
    // names the line the construct starts on and there is no second pass to
    // keep in step with the first.
    it('a multiline computed eval and dangerous import report the line each construct starts on', () => {
      const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-multiline-'));
      try {
        const packageDir = join(fixture, 'packages', 'evil');
        const src = join(packageDir, 'src');
        mkdirSync(src, { recursive: true });
        writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'evil', files: ['src'] }));
        writeFileSync(
          join(src, 'main.mjs'),
          'const mod = import(\n  // lazy\n  "blob:payload"\n);\nwindow[\n  "eval"\n](mod);\n',
        );
        const findings = scanShippedDynamicCode(fixture).findings;
        expect(findings).toEqual([
          { file: 'packages/evil/src/main.mjs', line: 1, kind: 'DYNAMIC_IMPORT', text: 'const mod = import(' },
          { file: 'packages/evil/src/main.mjs', line: 5, kind: 'EVAL_CALL', text: 'window[' },
        ]);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    });

    it('a multiplication continuation beginning with * is code, not a JSDoc exemption', () => {
      const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-star-'));
      try {
        const packageDir = join(fixture, 'packages', 'evil');
        const src = join(packageDir, 'src');
        mkdirSync(src, { recursive: true });
        writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'evil', files: ['src'] }));
        writeFileSync(
          join(src, 'main.mjs'),
          '/**\n * eval(input) is prose here\n */\nconst value = 2\n  * eval(input);\n',
        );
        expect(scanShippedDynamicCode(fixture).findings).toEqual([
          {
            file: 'packages/evil/src/main.mjs',
            line: 5,
            kind: 'EVAL_CALL',
            text: '* eval(input);',
          },
        ]);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    });
  });

  it("sweeps every non-TypeScript runtime source independently admitted by package manifests' files fields", () => {
    const scan = scanShippedDynamicCode(ROOT);
    const published = independentlyPublishedRuntimeSources(ROOT);
    expect(published.length).toBeGreaterThan(0);
    const missing = published.filter((file) => !scan.swept.includes(file));
    expect(missing).toEqual([]);
  });

  it('the shipped tree has zero findings and the sweep saw the real population', () => {
    const scan = scanShippedDynamicCode(ROOT);
    expect(scan.findings).toEqual([]);
    // Anti-vacuity: the one currently-shipped non-.ts runtime source must be in
    // the swept inventory — if the walk stops finding it, the zero above is hollow.
    expect(scan.swept).toContain('packages/astro/src/Adaptive.astro');
    expect(scan.swept.length).toBeGreaterThanOrEqual(PUBLISHED_RUNTIME_SWEEP_FLOOR);
  });

  it('classifies every dynamic-code form by name (negative controls)', () => {
    expect(classifyDynamicCodeLine('const v = eval(input);')).toBe('EVAL_CALL');
    expect(classifyDynamicCodeLine('const f = new Function("return 1");')).toBe('FUNCTION_CONSTRUCTOR');
    expect(classifyDynamicCodeLine('const g = Function("return 1");')).toBe('FUNCTION_CONSTRUCTOR');
    expect(classifyDynamicCodeLine('setTimeout("doWork()", 100);')).toBe('STRING_TIMER');
    expect(classifyDynamicCodeLine("setInterval('tick()', 5);")).toBe('STRING_TIMER');
  });

  it('does not misclassify ordinary code or prose about the rules', () => {
    expect(classifyDynamicCodeLine('setTimeout(() => tick(), 5);')).toBeNull();
    expect(classifyDynamicCodeLine('if (isFunction(handler)) handler();')).toBeNull();
    expect(classifyDynamicCodeLine('const kind: Function = fn;')).toBeNull();
    expect(classifyDynamicCodeLine('evaluate(model);')).toBeNull();
    expect(classifyDynamicCodeLine('// never call eval( on user input')).toBeNull();
    expect(classifyDynamicCodeLine(' * eval( is banned by this law')).toBeNull();
  });

  /**
   * THE REGION LAW — every swept extension is parsed or declared inert.
   *
   * The engine classifies a TREE, and a tree needs a program. 28 of the 37
   * swept files are `.astro`, which is not one: it is frontmatter, optional
   * `<script>` blocks, and markup carrying `{expression}` holes. An extension
   * with no extractor and no stated reason would sweep to zero findings and
   * report that as a pass, which is precisely the silent-hole shape this batch
   * exists to close.
   */
  describe('THE REGION LAW: every swept extension is parsed or declared inert', () => {
    it('every swept extension has a representative sample in this law', () => {
      // The forcing function: an extension entering the sweep with no sample
      // here cannot be classified by the tests below, so it fails loudly rather
      // than passing by never being examined.
      const missing = dynamicCodeSourceExtensions(ROOT).filter((extension) => !(extension in EXTENSION_PROBES));
      expect(missing, `swept extension(s) with no representative sample: ${missing.join(', ')}`).toEqual([]);
    });

    it('no swept extension is both unparsed and unexplained', () => {
      const unexplained = dynamicCodeSourceExtensions(ROOT).filter((extension) => {
        const regions = executableRegions(`probe${extension}`, EXTENSION_PROBES[extension] ?? '');
        return regions.length === 0 && !(extension in EXTENSIONS_WITHOUT_EXECUTABLE_CODE);
      });
      expect(
        unexplained,
        `swept extension(s) with no executable-region extractor and no stated reason: ${unexplained.join(', ')} — ` +
          'a file the engine cannot parse sweeps to zero findings and reports it as a pass',
      ).toEqual([]);
    });

    it('an extension declared inert really yields nothing, and really is swept', () => {
      // Both directions, so the reason list can neither rot into a stale
      // denylist exempting something the sweep no longer reaches, nor claim
      // inertness for an extension the extractor actually parses.
      const swept = new Set(dynamicCodeSourceExtensions(ROOT));
      for (const [extension, reason] of Object.entries(EXTENSIONS_WITHOUT_EXECUTABLE_CODE)) {
        expect(swept.has(extension), `${extension} is declared inert but is not swept`).toBe(true);
        expect(reason.length, `${extension} is declared inert with no reason`).toBeGreaterThan(0);
        expect(
          executableRegions(`probe${extension}`, EXTENSION_PROBES[extension] ?? ''),
          `${extension} is declared inert but yields executable regions`,
        ).toEqual([]);
      }
    });

    it('an .astro component yields its frontmatter, its scripts, and its markup holes', () => {
      const source = [
        '---',
        'const fromFrontmatter = 1;',
        '---',
        '<style>.a { color: red }</style>',
        '<!-- {notAnExpression} -->',
        '<div>{fromMarkup}</div>',
        '<script>const fromScript = 2;</script>',
      ].join('\n');
      const regions = executableRegions('Component.astro', source);
      const texts = regions.map((region) => region.text.trim());
      expect(texts).toContain('const fromFrontmatter = 1;');
      expect(texts).toContain('const fromScript = 2;');
      expect(texts).toContain('fromMarkup');
      // A CSS rule body is braces without being an expression, and an HTML
      // comment is not code; neither may be mistaken for a markup hole.
      expect(texts.some((text) => text.includes('color: red'))).toBe(false);
      expect(texts).not.toContain('notAnExpression');
    });

    it.each([
      { name: 'frontmatter', source: '---\nconst v = eval(code);\n---\n<div>ok</div>\n' },
      { name: 'a markup expression', source: '---\nconst v = 1;\n---\n<div>{eval(code)}</div>\n' },
      { name: 'a script block', source: '---\nconst v = 1;\n---\n<script>eval(code);</script>\n' },
    ])('an eval planted in $name of an .astro component is residue', ({ source }) => {
      expect(findDynamicCodeResidue(source, 'Component.astro').map((entry) => entry.kind)).toContain('EVAL_CALL');
    });
  });

  it('the scanner reds a planted eval in a shipped .astro source (executed mutant)', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-code-'));
    try {
      const packageDir = join(fixture, 'packages', 'evil');
      const src = join(packageDir, 'src');
      mkdirSync(src, { recursive: true });
      writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'evil', files: ['src'] }));
      writeFileSync(join(src, 'Component.astro'), '---\nconst v = eval(Astro.props.code);\n---\n<div>{v}</div>\n');
      const scan = scanShippedDynamicCode(fixture);
      expect(scan.findings).toEqual([
        {
          file: 'packages/evil/src/Component.astro',
          line: 2,
          kind: 'EVAL_CALL',
          text: 'const v = eval(Astro.props.code);',
        },
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('a package-published bin script is swept even without a src tree', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-bin-'));
    try {
      const packageDir = join(fixture, 'packages', 'evil');
      const bin = join(packageDir, 'bin');
      mkdirSync(bin, { recursive: true });
      writeFileSync(
        join(packageDir, 'package.json'),
        JSON.stringify({ name: 'evil', files: ['bin'], bin: { evil: './bin/x.mjs' } }),
      );
      writeFileSync(join(bin, 'x.mjs'), 'const value = eval(input);\n');
      const scan = scanShippedDynamicCode(fixture);
      expect(scan.swept).toContain('packages/evil/bin/x.mjs');
      expect(scan.findings).toEqual([
        {
          file: 'packages/evil/bin/x.mjs',
          line: 1,
          kind: 'EVAL_CALL',
          text: 'const value = eval(input);',
        },
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('a package with no publication authority is refused, not an empty contribution', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-authority-'));
    try {
      const packageDir = join(fixture, 'packages', 'evil');
      mkdirSync(packageDir, { recursive: true });
      writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'evil' }));
      expect(() => scanShippedDynamicCode(fixture)).toThrow(/declares no files, exports, or bin authority/u);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('a malformed package manifest is refused, not skipped', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-manifest-'));
    try {
      const packageDir = join(fixture, 'packages', 'evil');
      mkdirSync(packageDir, { recursive: true });
      writeFileSync(join(packageDir, 'package.json'), '{ "files": [');
      expect(() => scanShippedDynamicCode(fixture)).toThrow(/cannot parse/u);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
