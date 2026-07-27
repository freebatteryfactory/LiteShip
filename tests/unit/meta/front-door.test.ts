// @vitest-environment node
/**
 * README front-door gate — locks the Front-Door Cut's two structural wins so the
 * "clean lobby" cannot silently regress:
 *
 *   1. the "I want to…" router is the reader's first turn after the pitch;
 *   2. the `@liteship/*` package inventory does NOT sit above the first get-started command
 *      (it lives in ARCHITECTURE.md). Package names are derived from
 *      `packages/<name>/package.json`, so a NEW package cannot re-clutter the lobby without
 *      reding here — the threshold is a ratchet, not a hand-kept list.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const README = readFileSync(join(REPO, 'README.md'), 'utf8').replace(/\r\n/g, '\n');

/** Source of truth for package names: every `@liteship/*` workspace. */
function liteshipPackageNames(): string[] {
  const names: string[] = [];
  for (const dir of readdirSync(join(REPO, 'packages'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(REPO, 'packages', dir, 'package.json'), 'utf8')) as { name?: string };
      if (pkg.name?.startsWith('@liteship/')) names.push(pkg.name);
    } catch {
      // not a package directory
    }
  }
  return names;
}

/** Everything above the first line-anchored `npm/pnpm/yarn create|add` — the "front door". */
function frontDoor(): string {
  const lines = README.split('\n');
  const idx = lines.findIndex((line) => /^(npm|pnpm|yarn)\s+(create|add)\b/.test(line.trim()));
  return (idx === -1 ? lines : lines.slice(0, idx)).join('\n');
}

// Distinct @liteship/* package names a newcomer should meet before the first command. Low by
// design: the package inventory belongs in ARCHITECTURE.md, not the lobby.
const FRONT_DOOR_PACKAGE_BUDGET = 3;

describe('README front door', () => {
  test('the "I want to…" router is the reader\'s first turn', () => {
    expect(README).toContain('## I want to…');
  });

  test(`the front door names at most ${FRONT_DOOR_PACKAGE_BUDGET} @liteship packages (the inventory lives in ARCHITECTURE.md)`, () => {
    const front = frontDoor();
    const present = liteshipPackageNames().filter((name) => front.includes(name));
    expect(
      present.length,
      `@liteship packages above the first get-started command: [${present.join(', ')}]`,
    ).toBeLessThanOrEqual(FRONT_DOOR_PACKAGE_BUDGET);
  });
});
