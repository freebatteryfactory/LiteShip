/**
 * Wire-contract registry drift guard — pins the typed `liteship:*` event union,
 * stream `data-liteship-*` attributes, and generated docs to the single sources
 * in `packages/web/src/wire/*` (ADR-0028 / ADR-0018 pattern).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  LITESHIP_EVENT_DOCS,
  LITESHIP_EVENT_NAMES,
  STREAM_WIRE_ATTRIBUTES,
  STREAM_WIRE_ATTR_KEYS,
  renderWireContractDoc,
  streamWireAttr,
  type LiteshipEventDetailMap,
  type LiteshipEventName,
} from '@liteship/web';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const WEB_README = resolve(REPO_ROOT, 'packages/web/README.md');

/** Extract `liteship:…` event literals from runtime source (not the wire module). */
function collectRuntimeLiteshipEventLiterals(): readonly string[] {
  const roots = [
    resolve(REPO_ROOT, 'packages/web/src'),
    resolve(REPO_ROOT, 'packages/astro/src/runtime'),
    resolve(REPO_ROOT, 'packages/vite/src'),
  ];
  const found = new Set<string>();
  const pattern = /['"]liteship:[a-z0-9-]+['"]/g;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'wire') continue;
        walk(path);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      const src = readFileSync(path, 'utf8');
      for (const match of src.matchAll(pattern)) {
        found.add(match[0].slice(1, -1));
      }
    }
  };

  for (const root of roots) walk(root);
  return [...found].sort();
}

/** Raw `new CustomEvent('liteship:…')` bypasses — only `wire/dispatch.ts` may construct. */
function collectRawLiteshipCustomEventDispatches(): readonly string[] {
  const roots = [
    resolve(REPO_ROOT, 'packages/web/src'),
    resolve(REPO_ROOT, 'packages/astro/src/runtime'),
    resolve(REPO_ROOT, 'packages/vite/src'),
  ];
  const pattern = /new\s+CustomEvent\s*\(\s*['"]liteship:[a-z0-9-]+['"]/g;
  const violations: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'wire') continue;
        walk(path);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      const rel = path.slice(REPO_ROOT.length + 1);
      const src = readFileSync(path, 'utf8');
      for (const match of src.matchAll(pattern)) {
        violations.push(`${rel}: ${match[0]}`);
      }
    }
  };

  for (const root of roots) walk(root);
  return violations.sort();
}

describe('wire-contract registry — typed liteship:* union + stream attributes', () => {
  test('LITESHIP_EVENT_NAMES matches LITESHIP_EVENT_DOCS and every name is liteship:-prefixed', () => {
    expect(Object.keys(LITESHIP_EVENT_DOCS).sort()).toEqual([...LITESHIP_EVENT_NAMES].sort());
    for (const name of LITESHIP_EVENT_NAMES) {
      expect(name.startsWith('liteship:')).toBe(true);
    }
    // Cardinality pin — interface keys must stay in sync via `satisfies`.
    const _exhaustive: Record<LiteshipEventName, true> = Object.fromEntries(
      LITESHIP_EVENT_NAMES.map((name) => [name, true]),
    ) as Record<LiteshipEventName, true>;
    void _exhaustive;
    void ({} as LiteshipEventDetailMap);
  });

  test('streamWireAttr projects keys into canonical data-liteship-* names', () => {
    expect(streamWireAttr('url')).toBe('data-liteship-stream-url');
    expect(streamWireAttr('artifact')).toBe('data-liteship-stream-artifact');
    expect(streamWireAttr('morph')).toBe('data-liteship-stream-morph');
    expect(streamWireAttr('snapshotUrl')).toBe('data-liteship-snapshot-url');
    expect(streamWireAttr('replayUrl')).toBe('data-liteship-replay-url');
    expect([...STREAM_WIRE_ATTRIBUTES].sort()).toEqual(
      STREAM_WIRE_ATTR_KEYS.map((key) => streamWireAttr(key)).sort(),
    );
  });

  test('generated WIRE-CONTRACT block matches renderWireContractDoc (run `pnpm run docs:gen`)', () => {
    const readme = readFileSync(WEB_README, 'utf8').replace(/\r\n/g, '\n');
    const expected = renderWireContractDoc();
    const re = /<!-- BEGIN WIRE-CONTRACT[^]*?-->\n([^]*?)\n<!-- END WIRE-CONTRACT -->/;
    const match = readme.match(re);
    expect(match, 'packages/web/README.md missing WIRE-CONTRACT markers').not.toBeNull();
    expect(match![1]).toBe(expected);
  });

  test('runtime liteship:* literals in web+astro+vite runtime are registered (no fabricated names)', () => {
    const literals = collectRuntimeLiteshipEventLiterals();
    const registered = new Set<string>(LITESHIP_EVENT_NAMES);
    // Dev/HMR and detect-owned events are out of scope for this registry slice.
    const allowUnregistered = new Set(['liteship:update', 'liteship:detect-ready', 'liteship:scene-update']);
    const missing = literals.filter((name) => !registered.has(name) && !allowUnregistered.has(name));
    expect(missing, `add to LITESHIP_EVENT_NAMES: ${missing.join(', ')}`).toEqual([]);
  });

  test('fabricated stream event names are not in the registry (the dogfood bug class)', () => {
    expect(LITESHIP_EVENT_NAMES).not.toContain('liteship:stream-reconnecting');
  });

  test('runtime liteship:* dispatches route through dispatchLiteshipEvent (no raw CustomEvent bypass)', () => {
    const violations = collectRawLiteshipCustomEventDispatches();
    expect(
      violations,
      `use dispatchLiteshipEvent instead of raw CustomEvent:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
