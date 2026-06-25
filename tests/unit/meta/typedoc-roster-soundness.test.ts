/**
 * TypeDoc roster soundness — the source-of-truth guard that closes the `docs:check` false-green.
 *
 * `docs:check` regenerates the API docs from `typedoc.json`'s `entryPoints` and diffs against the
 * committed `docs/api`. That makes it blind to OMISSION: a published package absent from the roster
 * has no generated page, so there is nothing to diff, so the gate stays green while the package is
 * undocumented (the exact hole that let new `@czap/gauntlet` exports "pass" docs:check — the package
 * was never in the roster). A gate that cannot see a gap is a gate giving false green.
 *
 * This guard makes the roster CHECKED-AGAINST-SOURCE: every non-private package in the workspace MUST
 * appear in `typedoc.json` (or be a VISIBLE, justified exemption). Adding a publishable package without
 * a TypeDoc entry reds HERE — at the source of truth — not silently in a far-downstream missing page.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');

/**
 * Documented exemptions from the API-docs roster — a VISIBLE allowlist, never a silent skip.
 * `create-liteship` is a project SCAFFOLDER (a `bin` + template generator), not a library with an
 * importable API surface, so it has no meaningful TypeDoc page. Any OTHER publishable package must be
 * in the roster. An exemption that stops being a real published package reds (second test below).
 */
const ROSTER_EXEMPT = new Set(['create-liteship']);

function publishablePackages(): { name: string; dir: string }[] {
  const out: { name: string; dir: string }[] = [];
  for (const dir of readdirSync(resolve(ROOT, 'packages'))) {
    let pkg: { name?: string; private?: boolean };
    try {
      pkg = JSON.parse(readFileSync(resolve(ROOT, 'packages', dir, 'package.json'), 'utf8')) as typeof pkg;
    } catch {
      continue; // not a package dir
    }
    if (pkg.private === true || pkg.name === undefined) continue;
    out.push({ name: pkg.name, dir });
  }
  return out;
}

function rosterDirs(): Set<string> {
  const typedoc = JSON.parse(readFileSync(resolve(ROOT, 'typedoc.json'), 'utf8')) as { entryPoints: string[] };
  const dirs = new Set<string>();
  for (const ep of typedoc.entryPoints) {
    const m = /^packages\/([^/]+)\//.exec(ep);
    if (m !== null) dirs.add(m[1]!);
  }
  return dirs;
}

describe('typedoc roster soundness — every publishable package has API docs (closes the docs:check false-green)', () => {
  it('every non-private package (except a documented exemption) is in typedoc.json entryPoints', () => {
    const roster = rosterDirs();
    const missing = publishablePackages()
      .filter((p) => !ROSTER_EXEMPT.has(p.name) && !roster.has(p.dir))
      .map((p) => p.name)
      .sort();
    expect(
      missing,
      `published packages absent from typedoc.json — they have NO generated API docs, and docs:check cannot see the gap: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('every roster exemption is still a real publishable package (a stale exemption reds)', () => {
    const names = new Set(publishablePackages().map((p) => p.name));
    for (const ex of ROSTER_EXEMPT) {
      expect(names.has(ex), `roster exemption '${ex}' is not a current publishable package — remove it from ROSTER_EXEMPT`).toBe(
        true,
      );
    }
  });

  it('every roster entryPoint resolves to a real, non-private package (no stale/typo/private entry sneaks IN)', () => {
    const pubDirs = new Set(publishablePackages().map((p) => p.dir));
    const stray = [...rosterDirs()].filter((dir) => !pubDirs.has(dir)).sort();
    expect(stray, `typedoc.json entryPoints reference non-publishable/nonexistent package dirs: ${stray.join(', ')}`).toEqual(
      [],
    );
  });
});
