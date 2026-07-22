/**
 * The minimal `add` copier must resolve assets from the installed CLI package,
 * never from a source checkout inferred from the consumer's cwd.
 *
 * @module
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { add, RICHER_GENERATORS_NOTE } from '../../../../packages/cli/src/commands/add.js';
import { captureCli } from '../../../integration/cli/capture.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..');
const scratch: string[] = [];

function consumerDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-add-consumer-'));
  scratch.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe.sequential('liteship add packaged fragments', () => {
  it('lists packaged templates and examples from an unrelated consumer directory', async () => {
    const cwd = consumerDir();
    const { exit, stdout, stderr } = await captureCli(() => add({ cwd }));

    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout) as {
      readonly status: string;
      readonly fragments: { readonly template: readonly string[]; readonly example: readonly string[] };
      readonly note: string;
    };
    expect(receipt.status).toBe('ok');
    expect(receipt.fragments.template).toContain('default');
    expect(receipt.fragments.example).toEqual(expect.arrayContaining(['03-cast-aria', 'tutorial']));
    expect(receipt.note).toBe(RICHER_GENERATORS_NOTE);
    expect(stderr).toContain('template: default');
  });

  it('copies the canonical default template projection without a workspace checkout', async () => {
    const cwd = consumerDir();
    const { exit, stdout } = await captureCli(() => add({ kind: 'template', name: 'default', cwd }));

    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout) as { readonly dest: string; readonly fileCount: number };
    expect(receipt.dest).toBe('default');
    expect(receipt.fileCount).toBeGreaterThan(0);
    const copied = join(cwd, 'default', 'package.json');
    expect(existsSync(copied)).toBe(true);
    expect(readFileSync(copied)).toEqual(
      readFileSync(resolve(REPO, 'packages/create-liteship/templates/default/package.json')),
    );
  });

  it('preserves the existing example-fragment capability from packaged projections', async () => {
    const cwd = consumerDir();
    const { exit } = await captureCli(() => add({ kind: 'example', name: '07-stagger-reveal', cwd }));

    expect(exit).toBe(0);
    expect(readFileSync(join(cwd, '07-stagger-reveal', 'stagger-preset.ts'))).toEqual(
      readFileSync(resolve(REPO, 'examples/07-stagger-reveal/stagger-preset.ts')),
    );
  });

  it('refuses unknown names and never overwrites an existing destination', async () => {
    const cwd = consumerDir();
    const missing = await captureCli(() => add({ kind: 'template', name: 'missing', cwd }));
    expect(missing.exit).toBe(1);
    expect(missing.stderr).toContain('no template fragment named');

    const destination = join(cwd, 'default');
    writeFileSync(destination, 'owned by consumer');
    const existing = await captureCli(() => add({ kind: 'template', name: 'default', cwd }));
    expect(existing.exit).toBe(1);
    expect(existing.stderr).toContain('destination already exists');
    expect(readFileSync(destination, 'utf8')).toBe('owned by consumer');
  });
});
