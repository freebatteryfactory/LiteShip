/**
 * The minimal `add` copier must resolve assets from the installed CLI package,
 * never from a source checkout inferred from the consumer's cwd.
 *
 * @module
 */

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { add, createAddCommand, RICHER_GENERATORS_NOTE } from '../../../../packages/cli/src/commands/add.js';
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
    expect(existsSync(join(cwd, 'default', '.gitignore'))).toBe(true);
    expect(existsSync(join(cwd, 'default', 'gitignore'))).toBe(false);
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
    expect(JSON.parse(missing.stderr)).toMatchObject({
      code: 'cli/not-found',
      error: expect.stringContaining('no template fragment named'),
    });

    const destination = join(cwd, 'default');
    writeFileSync(destination, 'owned by consumer');
    const existing = await captureCli(() => add({ kind: 'template', name: 'default', cwd }));
    expect(existing.exit).toBe(1);
    expect(JSON.parse(existing.stderr)).toMatchObject({
      code: 'cli/conflict',
      error: expect.stringContaining('destination already exists'),
    });
    expect(readFileSync(destination, 'utf8')).toBe('owned by consumer');
  });

  it('stages fragment copies and returns a structured failure without leaving partial destinations', async () => {
    const cwd = consumerDir();
    const run = createAddCommand({
      copyTree: (_source, staging) => {
        writeFileSync(join(staging, 'partial.txt'), 'incomplete');
        throw new Error('simulated disk exhaustion');
      },
    });

    const { exit, stderr } = await captureCli(() => run({ kind: 'template', name: 'default', cwd }));

    expect(exit).toBe(1);
    expect(JSON.parse(stderr)).toMatchObject({
      status: 'failed',
      command: 'add',
      code: 'cli/command-failed',
      error: expect.stringContaining('simulated disk exhaustion'),
    });
    expect(existsSync(join(cwd, 'default'))).toBe(false);
    expect(readdirSync(cwd).filter((name) => name.startsWith('.liteship-add-'))).toEqual([]);
  });

  it('does not expose a partial destination when the final commit rename fails', async () => {
    const cwd = consumerDir();
    const run = createAddCommand({
      rename: () => {
        throw new Error('simulated destination race');
      },
    });

    const { exit, stderr } = await captureCli(() => run({ kind: 'example', name: '07-stagger-reveal', cwd }));

    expect(exit).toBe(1);
    expect(JSON.parse(stderr)).toMatchObject({
      code: 'cli/command-failed',
      error: expect.stringContaining('simulated destination race'),
    });
    expect(existsSync(join(cwd, '07-stagger-reveal'))).toBe(false);
    expect(readdirSync(cwd).filter((name) => name.startsWith('.liteship-add-'))).toEqual([]);
  });
});
