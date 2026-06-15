/**
 * Unit tests for the create-liteship scaffolder. Everything runs against
 * temp dirs and the real embedded template (packages/create-liteship/
 * templates/default) — no network, no published packages. A full
 * `astro build` e2e of the scaffolded app needs the published @czap/*
 * tarballs and is the post-publish smoke, not a unit concern.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  scaffold,
  ScaffoldError,
  defaultTemplateDir,
  projectNameFromDir,
  run,
  DEFAULT_DIR,
  type RunIo,
} from '../../../packages/create-liteship/src/index.js';

const EXPECTED_TREE = [
  '.gitignore',
  'README.md',
  'astro.config.ts',
  'package.json',
  'src/boundaries/layout.boundaries.ts',
  'src/layouts/Base.astro',
  'src/pages/index.astro',
  'src/tokens/base.tokens.ts',
  'tsconfig.json',
];

describe('create-liteship scaffold', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'create-liteship-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('scaffolds the full file tree into a fresh directory', () => {
    const result = scaffold(join(workDir, 'my-app'));
    expect(result.projectDir).toBe(join(workDir, 'my-app'));
    expect([...result.files]).toEqual(EXPECTED_TREE);
    for (const file of EXPECTED_TREE) {
      expect(existsSync(join(result.projectDir, file)), file).toBe(true);
    }
    // The un-dotted template source name must not leak through.
    expect(existsSync(join(result.projectDir, 'gitignore'))).toBe(false);
  });

  it('writes a package.json with the dir-derived name and installable ranges', () => {
    const result = scaffold(join(workDir, 'My App!'));
    const manifest = JSON.parse(readFileSync(join(result.projectDir, 'package.json'), 'utf8')) as {
      name: string;
      private: boolean;
      type: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    expect(manifest.name).toBe('my-app');
    expect(result.projectName).toBe('my-app');
    expect(manifest.private).toBe(true);
    expect(manifest.type).toBe('module');
    expect(manifest.scripts['dev']).toBe('astro dev');
    expect(manifest.scripts['build']).toBe('astro build');
    // Every dependency must be a plain published range — workspace:/file:/link:
    // specs cannot install outside this monorepo.
    expect(Object.keys(manifest.dependencies)).toEqual(
      expect.arrayContaining(['@czap/astro', '@czap/core', 'astro', 'typescript']),
    );
    for (const [dep, spec] of Object.entries(manifest.dependencies)) {
      expect(spec, dep).toMatch(/^\^\d+\.\d+\.\d+/);
    }
  });

  it('scaffolds the working first-5-minutes idioms (boundary + satellite + @quantize)', () => {
    const result = scaffold(join(workDir, 'idioms'));
    const index = readFileSync(join(result.projectDir, 'src/pages/index.astro'), 'utf8');
    expect(index).toContain('satelliteAttrs({ boundary: layout');
    expect(index).toContain('@quantize layout {');
    const boundary = readFileSync(join(result.projectDir, 'src/boundaries/layout.boundaries.ts'), 'utf8');
    expect(boundary).toContain('Boundary.make(');
    expect(boundary).toContain("import { Boundary } from '@czap/core'");
    const config = readFileSync(join(result.projectDir, 'astro.config.ts'), 'utf8');
    expect(config).toContain("import { integration } from '@czap/astro'");
    expect(index).toContain('@czap/genui');
    expect(readFileSync(join(result.projectDir, 'README.md'), 'utf8')).toContain('@czap/genui');
  });

  it('accepts an existing but empty directory', () => {
    const target = join(workDir, 'empty');
    mkdirSync(target);
    const result = scaffold(target);
    expect([...result.files]).toEqual(EXPECTED_TREE);
  });

  it('refuses a non-empty directory with a teaching error and leaves it untouched', () => {
    const target = join(workDir, 'taken');
    mkdirSync(target);
    writeFileSync(join(target, 'precious.txt'), 'do not eat');
    expect(() => scaffold(target)).toThrowError(ScaffoldError);
    expect(() => scaffold(target)).toThrowError(/never overwrites/);
    expect(readFileSync(join(target, 'precious.txt'), 'utf8')).toBe('do not eat');
    expect(existsSync(join(target, 'package.json'))).toBe(false);
  });

  it('refuses when the target exists as a file', () => {
    const target = join(workDir, 'a-file');
    writeFileSync(target, 'hi');
    expect(() => scaffold(target)).toThrowError(/is a file, not a directory/);
  });

  it('projectNameFromDir sanitizes to a valid npm name', () => {
    expect(projectNameFromDir('My App!')).toBe('my-app');
    expect(projectNameFromDir('--weird--')).toBe('weird');
    expect(projectNameFromDir('ok-name')).toBe('ok-name');
    expect(projectNameFromDir('!!!')).toBe('liteship-app');
  });

  it('embedded template itself carries no workspace:/file: specs (ship-tarball truth)', () => {
    const manifest = JSON.parse(readFileSync(join(defaultTemplateDir(), 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    for (const [dep, spec] of Object.entries(manifest.dependencies)) {
      expect(spec, dep).not.toMatch(/^(workspace|file|link):/);
    }
  });

  // Drift guard: a scaffolded app must pull the SAME release line the workspace
  // is publishing, not a stale one. `^0.1.5` once survived into a 0.2.0 cut
  // because nothing pinned the template's @czap/* ranges to the release version
  // — `npm create liteship@latest` would then hand users a previous-minor app.
  // Pin the LAW (major.minor must match the workspace version), not the exact
  // patch, so caret-compatible patch releases need no template churn.
  it('template @czap/* ranges track the workspace release line (no stale-minor drift)', () => {
    const root = JSON.parse(readFileSync(join(defaultTemplateDir(), '../../../../package.json'), 'utf8')) as {
      version: string;
    };
    const [rootMajor, rootMinor] = root.version.split('.');
    const manifest = JSON.parse(readFileSync(join(defaultTemplateDir(), 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const czapDeps = Object.entries(manifest.dependencies).filter(([dep]) => dep.startsWith('@czap/'));
    expect(czapDeps.length, 'template should depend on at least one @czap/* package').toBeGreaterThan(0);
    for (const [dep, spec] of czapDeps) {
      const match = spec.match(/^\^(\d+)\.(\d+)\.\d+/);
      expect(match, `${dep} spec ${spec} should be a caret range`).not.toBeNull();
      const [, major, minor] = match!;
      expect(`${major}.${minor}`, `${dep} (${spec}) must track workspace ${root.version}`).toBe(
        `${rootMajor}.${rootMinor}`,
      );
    }
  });
});

describe('create-liteship run (CLI surface)', () => {
  let workDir: string;
  let out: string[];
  let err: string[];

  const io = (prompt?: (q: string) => Promise<string>): RunIo => ({
    out: (text) => void out.push(text),
    err: (text) => void err.push(text),
    ...(prompt ? { prompt } : {}),
  });

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'create-liteship-run-'));
    out = [];
    err = [];
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('scaffolds the argv dir, prints next steps, exits 0', async () => {
    const target = join(workDir, 'cli-app');
    const code = await run([target], io());
    expect(code).toBe(0);
    expect(existsSync(join(target, 'astro.config.ts'))).toBe(true);
    const text = out.join('');
    expect(text).toContain('pnpm install');
    expect(text).toContain('pnpm dev');
    expect(text).toContain('cd ');
  });

  it('prompts when no dir is given and uses the answer', async () => {
    const target = join(workDir, 'prompted-app');
    const questions: string[] = [];
    const code = await run(
      [],
      io(async (q) => {
        questions.push(q);
        return target;
      }),
    );
    expect(code).toBe(0);
    expect(questions[0]).toContain(DEFAULT_DIR);
    expect(existsSync(join(target, 'package.json'))).toBe(true);
  });

  it('exits 1 with the teaching error on a non-empty target', async () => {
    const target = join(workDir, 'occupied');
    mkdirSync(target);
    writeFileSync(join(target, 'x.txt'), 'x');
    const code = await run([target], io());
    expect(code).toBe(1);
    expect(err.join('')).toContain('never overwrites');
  });

  it('prints help and exits 0 on --help', async () => {
    const code = await run(['--help'], io());
    expect(code).toBe(0);
    expect(out.join('')).toContain('npm create liteship');
  });
});
