/** Alternate-template properties for the published create-liteship engine. */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@liteship/error';
import { scaffold, type ScaffoldError } from '../../packages/create-liteship/src/index.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'create-liteship-template-prop-'));
  roots.push(root);
  return root;
}

const safeSegment = fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/u);
const fileBytes = fc.uint8Array({ minLength: 0, maxLength: 2_048 });

describe('create-liteship alternate-template contract', () => {
  test('copies arbitrary template bytes through a relative parent path without escaping either root', () => {
    fc.assert(
      fc.property(safeSegment, safeSegment, fileBytes, fileBytes, (templateName, targetName, payload, sentinel) => {
        const root = fixture();
        const workspace = join(root, 'workspace');
        const template = join(root, 'templates', templateName);
        mkdirSync(workspace, { recursive: true });
        mkdirSync(join(template, 'nested'), { recursive: true });
        writeFileSync(join(template, 'package.json'), '{"name":"fixture","private":true}\n');
        writeFileSync(join(template, 'gitignore'), payload);
        writeFileSync(join(template, 'nested', 'payload.bin'), payload);
        writeFileSync(join(root, 'sentinel.bin'), sentinel);

        const result = scaffold(join('apps', targetName), {
          cwd: workspace,
          templateDir: join('..', 'templates', templateName),
        });

        expect(result.projectDir).toBe(join(workspace, 'apps', targetName));
        expect(readFileSync(join(result.projectDir, '.gitignore'))).toEqual(Buffer.from(payload));
        expect(readFileSync(join(result.projectDir, 'nested', 'payload.bin'))).toEqual(Buffer.from(payload));
        expect(readFileSync(join(root, 'sentinel.bin'))).toEqual(Buffer.from(sentinel));
        expect(existsSync(join(root, '.gitignore'))).toBe(false);
      }),
      { seed: 0x5ca6_0101, numRuns: 100 },
    );
  });

  test('rejects every non-object JSON manifest before creating destination bytes', () => {
    const invalidManifests = fc.oneof(
      fc.constant(null),
      fc.boolean(),
      fc.double({ noNaN: true }),
      fc.string(),
      fc.array(fc.jsonValue()),
    );
    fc.assert(
      fc.property(invalidManifests, (manifest) => {
        const root = fixture();
        const template = join(root, 'template');
        const target = join(root, 'target');
        mkdirSync(template);
        writeFileSync(join(template, 'package.json'), `${JSON.stringify(manifest)}\n`);

        let thrown: unknown;
        try {
          scaffold(target, { templateDir: template });
        } catch (error) {
          thrown = error;
        }

        expect(hasTag(thrown, 'ValidationError')).toBe(true);
        expect((thrown as ScaffoldError).reason).toBe('template-invalid-manifest');
        expect(existsSync(target)).toBe(false);
      }),
      { seed: 0x5ca6_0102, numRuns: 100 },
    );
  });
});
