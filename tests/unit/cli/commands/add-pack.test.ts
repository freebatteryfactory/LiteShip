/**
 * Release-artifact proof for the minimal `add` copier's packaged assets.
 *
 * @module
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { scaledTimeout } from '../../../../vitest.shared.js';
import { packInWorkspace } from '../../../support/pack.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..');
const FLEET_VERSION = (JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as { readonly version: string })
  .version;

/** Extract one short-path regular file from a pnpm package tarball. */
function extractEntry(tgz: Uint8Array, wantPath: string): Uint8Array | undefined {
  const tar = new Uint8Array(gunzipSync(tgz));
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) return undefined;
    const nameEnd = header.indexOf(0);
    const name = decoder.decode(header.subarray(0, nameEnd === -1 ? 100 : Math.min(nameEnd, 100)));
    const size = Number.parseInt(decoder.decode(header.subarray(124, 136)).replaceAll('\0', '').trim() || '0', 8);
    const type = header[156];
    const dataStart = offset + 512;
    if (name === wantPath && (type === 0 || type === 0x30)) return tar.slice(dataStart, dataStart + size);
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return undefined;
}

describe('packed @liteship/cli fragments', () => {
  it(
    'contains byte-identical template and example projections',
    async () => {
      const scratch = mkdtempSync(join(tmpdir(), 'liteship-cli-fragment-pack-'));
      try {
        const tarball = await packInWorkspace(resolve(REPO, 'packages/cli'), scratch, { ignoreScripts: true });
        const bytes = new Uint8Array(readFileSync(tarball));
        const template = extractEntry(bytes, 'package/fragments/template/default/package.json');
        const example = extractEntry(bytes, 'package/fragments/example/07-stagger-reveal/stagger-preset.ts');
        const showcaseManifest = extractEntry(bytes, 'package/fragments/example/showcase/package.json');

        expect(template).toEqual(
          new Uint8Array(readFileSync(resolve(REPO, 'packages/create-liteship/templates/default/package.json'))),
        );
        expect(example).toEqual(
          new Uint8Array(readFileSync(resolve(REPO, 'examples/07-stagger-reveal/stagger-preset.ts'))),
        );
        const parsed = JSON.parse(new TextDecoder().decode(showcaseManifest)) as {
          readonly dependencies: Readonly<Record<string, string>>;
        };
        expect(Object.values(parsed.dependencies)).not.toContain('workspace:*');
        expect(parsed.dependencies['@liteship/core']).toBe(FLEET_VERSION);
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    },
    scaledTimeout(30000),
  );
});
