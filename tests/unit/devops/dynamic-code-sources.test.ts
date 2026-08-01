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
import { classifyDynamicCodeLine, scanShippedDynamicCode } from '../../../scripts/lib/dynamic-code-residue.js';

const ROOT = resolve(import.meta.dirname, '../../..');
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

    it('a multiline computed eval and dangerous import are found by the collapsed source pass', () => {
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
        expect(findings.map((finding) => finding.kind).sort()).toEqual(['DYNAMIC_IMPORT', 'EVAL_CALL']);
        expect(findings.every((finding) => finding.line === 0)).toBe(true);
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
