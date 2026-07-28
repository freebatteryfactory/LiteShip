/** Canonical dotfile-restoration and generated-projection properties. */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  restoredTemplateName,
  restoreTemplateNames,
  TEMPLATE_RENAMES,
} from '../../packages/create-liteship/src/template-renames.js';
import { GENERATED_TEMPLATE_RENAMES } from '../../packages/cli/src/internal/template-renames.generated.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-template-rename-'));
  roots.push(root);
  return root;
}

const fileBytes = fc.uint8Array({ minLength: 0, maxLength: 4_096 });

describe('canonical template filename restoration', () => {
  it('keeps the CLI projection byte-for-byte equal to the create-liteship owner', () => {
    expect(GENERATED_TEMPLATE_RENAMES).toEqual(TEMPLATE_RENAMES);
    expect(Object.keys(GENERATED_TEMPLATE_RENAMES).sort()).toEqual(Object.keys(TEMPLATE_RENAMES).sort());
    expect(Object.values(GENERATED_TEMPLATE_RENAMES).sort()).toEqual(Object.values(TEMPLATE_RENAMES).sort());
  });

  it('freezes both canonical and generated maps against runtime drift', () => {
    expect(Object.isFrozen(TEMPLATE_RENAMES)).toBe(true);
    expect(Object.isFrozen(GENERATED_TEMPLATE_RENAMES)).toBe(true);
  });

  it('keeps every authored mapping local, relative, and traversal-free', () => {
    for (const [from, to] of Object.entries(TEMPLATE_RENAMES)) {
      expect(from).not.toMatch(/[\\/]/u);
      expect(to).not.toMatch(/[\\/]/u);
      expect(from).not.toBe('.');
      expect(to).not.toBe('.');
      expect(from).not.toBe('..');
      expect(to).not.toBe('..');
      expect(from.startsWith('.')).toBe(false);
      expect(to.startsWith('.')).toBe(true);
    }
  });

  it('projects only canonical placeholder names and leaves every other filename unchanged', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        expect(restoredTemplateName(name)).toBe(TEMPLATE_RENAMES[name] ?? name);
      }),
      { seed: 0x7e4d_0107, numRuns: 200 },
    );
  });

  it('moves arbitrary bytes to the public dotfile name without transformation', () => {
    fc.assert(
      fc.property(fileBytes, (bytes) => {
        const root = fixture();
        writeFileSync(join(root, 'gitignore'), bytes);
        restoreTemplateNames(root);
        expect(existsSync(join(root, 'gitignore'))).toBe(false);
        expect(existsSync(join(root, '.gitignore'))).toBe(true);
        expect(readFileSync(join(root, '.gitignore'))).toEqual(Buffer.from(bytes));
      }),
      { seed: 0x7e4d_0101, numRuns: 160 },
    );
  });

  it('is idempotent after the package-safe placeholder has been restored', () => {
    fc.assert(
      fc.property(fileBytes, (bytes) => {
        const root = fixture();
        writeFileSync(join(root, 'gitignore'), bytes);
        restoreTemplateNames(root);
        restoreTemplateNames(root);
        restoreTemplateNames(root);
        expect(readFileSync(join(root, '.gitignore'))).toEqual(Buffer.from(bytes));
        expect(existsSync(join(root, 'gitignore'))).toBe(false);
      }),
      { seed: 0x7e4d_0102, numRuns: 120 },
    );
  });

  it('leaves unrelated files and directories byte-identical', () => {
    fc.assert(
      fc.property(
        fileBytes,
        fc.array(fc.tuple(fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/u), fileBytes), { minLength: 1, maxLength: 12 }),
        (gitignore, unrelated) => {
          const root = fixture();
          writeFileSync(join(root, 'gitignore'), gitignore);
          for (const [name, bytes] of unrelated) {
            const path = join(root, 'nested', name, 'content.bin');
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, bytes);
          }
          restoreTemplateNames(root);
          for (const [name, bytes] of unrelated) {
            expect(readFileSync(join(root, 'nested', name, 'content.bin'))).toEqual(Buffer.from(bytes));
          }
        },
      ),
      { seed: 0x7e4d_0103, numRuns: 100 },
    );
  });

  it('does nothing when a fragment contains no package-safe placeholder', () => {
    fc.assert(
      fc.property(fileBytes, (bytes) => {
        const root = fixture();
        writeFileSync(join(root, 'ordinary.txt'), bytes);
        restoreTemplateNames(root);
        expect(readFileSync(join(root, 'ordinary.txt'))).toEqual(Buffer.from(bytes));
        expect(existsSync(join(root, '.gitignore'))).toBe(false);
      }),
      { seed: 0x7e4d_0104, numRuns: 120 },
    );
  });

  it('preserves an already-authored dotfile when no placeholder is present', () => {
    fc.assert(
      fc.property(fileBytes, (bytes) => {
        const root = fixture();
        writeFileSync(join(root, '.gitignore'), bytes);
        restoreTemplateNames(root);
        expect(readFileSync(join(root, '.gitignore'))).toEqual(Buffer.from(bytes));
      }),
      { seed: 0x7e4d_0105, numRuns: 120 },
    );
  });

  it('never creates a file outside the copied template root', () => {
    fc.assert(
      fc.property(fileBytes, fileBytes, (inside, sentinel) => {
        const root = fixture();
        const template = join(root, 'template');
        mkdirSync(template);
        writeFileSync(join(template, 'gitignore'), inside);
        writeFileSync(join(root, '.gitignore'), sentinel);
        restoreTemplateNames(template);
        expect(readFileSync(join(template, '.gitignore'))).toEqual(Buffer.from(inside));
        expect(readFileSync(join(root, '.gitignore'))).toEqual(Buffer.from(sentinel));
      }),
      { seed: 0x7e4d_0106, numRuns: 120 },
    );
  });
});
