/** A typecheck config must own a non-empty population; inherited drift may not make it vacuous. @module */

import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import ts from 'typescript';

const repoRoot = resolve(import.meta.dirname, '../../..');
const normalizePath = (value: string): string => resolve(value).replaceAll('\\', '/');

function configFileAt(path: string): string {
  const absolute = resolve(path);
  return absolute.endsWith('.json') ? absolute : join(absolute, 'tsconfig.json');
}

function ownIncludeRoots(configPath: string, config: unknown): readonly string[] {
  if (config === null || typeof config !== 'object' || !('include' in config) || !Array.isArray(config.include)) {
    return [];
  }
  return config.include
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.split(/[\\/]/u)[0])
    .filter((entry): entry is string => entry !== undefined && entry.length > 0 && !/[*?]/u.test(entry))
    .map((entry) => normalizePath(isAbsolute(entry) ? entry : resolve(dirname(configPath), entry)));
}

/** Return every population failure reachable from one leaf or solution config. */
export function configPopulationViolations(configPath: string, requireOwnInclude = true): readonly string[] {
  const absoluteConfig = configFileAt(configPath);
  const read = ts.readConfigFile(absoluteConfig, ts.sys.readFile);
  if (read.error !== undefined) {
    return [`${absoluteConfig}: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`];
  }

  const raw = read.config as { readonly files?: unknown; readonly references?: unknown };
  const references = Array.isArray(raw.references)
    ? raw.references.flatMap((entry) =>
        entry !== null && typeof entry === 'object' && 'path' in entry && typeof entry.path === 'string'
          ? [entry.path]
          : [],
      )
    : [];
  if (Array.isArray(raw.files) && raw.files.length === 0 && references.length > 0) {
    return references.flatMap((reference) =>
      configPopulationViolations(resolve(dirname(absoluteConfig), reference), false),
    );
  }

  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(absoluteConfig));
  const roots = ownIncludeRoots(absoluteConfig, read.config);
  const resolvedFiles = parsed.fileNames.map(normalizePath);
  const ownFiles = resolvedFiles.filter((file) => roots.some((root) => file === root || file.startsWith(`${root}/`)));
  const label = absoluteConfig.replaceAll('\\', '/');
  const violations: string[] = [];
  if (resolvedFiles.length === 0) violations.push(`${label} resolves 0 files`);
  if (requireOwnInclude && roots.length === 0) violations.push(`${label} declares no own include roots`);
  else if (requireOwnInclude && ownFiles.length === 0) {
    violations.push(`${label} resolves no file under its own include roots (${roots.join(', ')})`);
  }
  return violations;
}

describe('project typecheck configs resolve a non-empty file set', () => {
  it('every leaf project config resolves at least one file that lives under its own include roots', () => {
    const violations = ['tsconfig.scripts.json', 'tsconfig.tests.json'].flatMap((path) =>
      configPopulationViolations(resolve(repoRoot, path)),
    );
    expect(violations).toEqual([]);
  });

  it('a solution-style config resolves every referenced project to a non-empty file set', () => {
    expect(configPopulationViolations(resolve(repoRoot, 'tsconfig.json'))).toEqual([]);
  });

  it('an inherited exclude that swallows an own include is caught (synthetic fixture)', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-tsconfig-population-'));
    try {
      mkdirSync(join(root, 'a'));
      writeFileSync(join(root, 'a', 'x.ts'), 'export const x = 1;\n');
      writeFileSync(join(root, 'base.json'), JSON.stringify({ exclude: ['a'] }));
      writeFileSync(join(root, 'child.json'), JSON.stringify({ extends: './base.json', include: ['a/**'] }));
      expect(configPopulationViolations(join(root, 'child.json'))).toEqual([
        expect.stringContaining('resolves 0 files'),
        expect.stringContaining('resolves no file under its own include roots'),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
