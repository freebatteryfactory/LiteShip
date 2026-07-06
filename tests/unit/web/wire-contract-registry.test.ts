/**
 * Wire-contract registry drift guard — pins the typed `czap:*` event union,
 * stream `data-czap-*` attributes, and generated docs to the single sources
 * in `packages/web/src/wire/*` (ADR-0028 / ADR-0018 pattern).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  CZAP_EVENT_DOCS,
  CZAP_EVENT_NAMES,
  STREAM_WIRE_ATTRIBUTES,
  STREAM_WIRE_ATTR_KEYS,
  renderWireContractDoc,
  streamWireAttr,
  type CzapEventDetailMap,
  type CzapEventName,
} from '@czap/web';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const WEB_README = resolve(REPO_ROOT, 'packages/web/README.md');

/** Extract `czap:…` event literals from runtime source (not the wire module). */
function collectRuntimeCzapEventLiterals(): readonly string[] {
  const roots = [
    resolve(REPO_ROOT, 'packages/web/src'),
    resolve(REPO_ROOT, 'packages/astro/src/runtime'),
  ];
  const found = new Set<string>();
  const pattern = /['"]czap:[a-z0-9-]+['"]/g;

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

/** Raw `new CustomEvent('czap:…')` bypasses — only `wire/dispatch.ts` may construct. */
function collectRawCzapCustomEventDispatches(): readonly string[] {
  const roots = [
    resolve(REPO_ROOT, 'packages/web/src'),
    resolve(REPO_ROOT, 'packages/astro/src/runtime'),
  ];
  const pattern = /new\s+CustomEvent\s*\(\s*['"]czap:[a-z0-9-]+['"]/g;
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

describe('wire-contract registry — typed czap:* union + stream attributes', () => {
  test('CZAP_EVENT_NAMES matches CZAP_EVENT_DOCS and every name is czap:-prefixed', () => {
    expect(Object.keys(CZAP_EVENT_DOCS).sort()).toEqual([...CZAP_EVENT_NAMES].sort());
    for (const name of CZAP_EVENT_NAMES) {
      expect(name.startsWith('czap:')).toBe(true);
    }
    // Cardinality pin — interface keys must stay in sync via `satisfies`.
    const _exhaustive: Record<CzapEventName, true> = Object.fromEntries(
      CZAP_EVENT_NAMES.map((name) => [name, true]),
    ) as Record<CzapEventName, true>;
    void _exhaustive;
    void ({} as CzapEventDetailMap);
  });

  test('streamWireAttr projects keys into canonical data-czap-* names', () => {
    expect(streamWireAttr('url')).toBe('data-czap-stream-url');
    expect(streamWireAttr('artifact')).toBe('data-czap-stream-artifact');
    expect(streamWireAttr('morph')).toBe('data-czap-stream-morph');
    expect(streamWireAttr('snapshotUrl')).toBe('data-czap-snapshot-url');
    expect(streamWireAttr('replayUrl')).toBe('data-czap-replay-url');
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

  test('runtime czap:* literals in web+astro runtime are registered (no fabricated names)', () => {
    const literals = collectRuntimeCzapEventLiterals();
    const registered = new Set<string>(CZAP_EVENT_NAMES);
    // Dev/HMR and detect-owned events are out of scope for this registry slice.
    const allowUnregistered = new Set(['czap:update', 'czap:detect-ready', 'czap:scene-update']);
    const missing = literals.filter((name) => !registered.has(name) && !allowUnregistered.has(name));
    expect(missing, `add to CZAP_EVENT_NAMES: ${missing.join(', ')}`).toEqual([]);
  });

  test('fabricated stream event names are not in the registry (the dogfood bug class)', () => {
    expect(CZAP_EVENT_NAMES).not.toContain('czap:stream-reconnecting');
  });

  test('runtime czap:* dispatches route through dispatchCzapEvent (no raw CustomEvent bypass)', () => {
    const violations = collectRawCzapCustomEventDispatches();
    expect(
      violations,
      `use dispatchCzapEvent instead of raw CustomEvent:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
