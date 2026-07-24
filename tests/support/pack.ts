/**
 * Shared owner of the in-workspace `pnpm pack` mechanic (scar S0.5).
 *
 * Scar S0.5 (docs/plan/scar-ledger.md): `catalog:` refs broke a *standalone*
 * `pnpm pack` — `ERR_PNPM_CATALOG_ENTRY_NOT_FOUND` outside workspace context.
 * `catalog:` and `workspace:*` specs only resolve to concrete ranges when pnpm
 * packs from INSIDE the workspace. The real release path
 * (`.github/workflows/release.yml` → `scripts/build-release-artifacts.ts` →
 * the release-bundle owner) packs each package from its own directory *within
 * the monorepo*, so pnpm rewrites the specs. A pack
 * from a tmp copy severed from the workspace does not — that was the bug.
 *
 * Three tests need this exact mechanic: `tests/unit/ship-manifest.test.ts`,
 * `tests/unit/ship-verify-verdicts.test.ts`, and the release-pack residue smoke
 * (`tests/unit/devops/release-pack-residue.test.ts`). This module is the SINGLE
 * owner so the three do not each carry a private copy of the pack invocation —
 * the S0.4 class (one truth, many private parsers) applied to pack mechanics.
 *
 * @module
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { spawnArgv } from '../../scripts/lib/spawn.js';

/** Options for {@link packInWorkspace}. */
export interface PackInWorkspaceOptions {
  /**
   * Skip lifecycle scripts (`prepack`) via `--config.ignore-scripts=true`.
   *
   * pnpm's manifest transform (`catalog:`/`workspace:*` → concrete ranges) is
   * performed independently of lifecycle scripts — verified byte-identical with
   * and without this flag — so a guard or frozen release build that inspects the packed
   * `package.json` can skip the `prepack` `tsc` rebuild for speed and
   * hermeticity (no dist mutation racing sibling test workers) without weakening
   * what it asserts. The in-workspace resolution — the load-bearing S0.5
   * property — is unaffected. Default `false`; the frozen release-bundle owner
   * explicitly enables it after the one authoritative workspace build.
   */
  readonly ignoreScripts?: boolean;
}

/**
 * Pack `packageDir` IN-WORKSPACE into `destinationDir`, returning the absolute
 * path of the single `.tgz` produced.
 *
 * Packs with `cwd` set to the package directory (inside the monorepo) and
 * `--pack-destination` pointing at a scratch dir, exactly as the release path
 * does — so pnpm resolves `catalog:`/`workspace:*` — while leaving no artifact
 * behind in the source package. Snapshots `destinationDir` before and after and
 * asserts exactly one new `.tgz` appeared (mirrors the `package-smoke` pack
 * step). `spawnArgv` never throws on a nonzero exit; this owner branches on the
 * exit code and throws with the captured stderr tail.
 */
export async function packInWorkspace(
  packageDir: string,
  destinationDir: string,
  options: PackInWorkspaceOptions = {},
): Promise<string> {
  const before = new Set(readdirSync(destinationDir));
  const args = ['pack', '--pack-destination', destinationDir];
  if (options.ignoreScripts === true) args.push('--config.ignore-scripts=true');

  // Discard pnpm pack's stdout (the "Tarball Details" + file listing) so it does
  // not flood the test reporter; keep stderr piped so a failure's tail is captured.
  const result = await spawnArgv('pnpm', args, { cwd: packageDir, stdio: ['ignore', 'ignore', 'pipe'] });
  if (result.exitCode !== 0) {
    throw new Error(`pnpm pack failed in ${packageDir} (exit ${result.exitCode}): ${result.stderrTail.trim()}`);
  }

  const created = readdirSync(destinationDir).filter((entry) => !before.has(entry) && entry.endsWith('.tgz'));
  if (created.length !== 1) {
    throw new Error(
      `expected exactly one .tgz from packing ${packageDir}, found ${created.length}` +
        (created.length > 0 ? `: ${created.join(', ')}` : ''),
    );
  }
  return join(destinationDir, created[0]!);
}

/** The dependency-section fields of a packed `package.json` this owner reads. */
export interface PackedManifest {
  readonly name?: string;
  readonly version?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

/**
 * Extract one entry's UTF-8 payload from an uncompressed tar by exact path.
 *
 * A minimal USTAR walk (512-byte header blocks): reads the NUL-terminated name
 * (offset 0, 100 bytes) and the octal size (offset 124, 12 bytes), and returns
 * the payload of the first REGULAR-FILE entry (typeflag `0` or NUL, offset 156)
 * whose name equals `wantPath`. The typeflag guard prevents a PAX/global
 * metadata block that reuses the same name from masquerading as the file.
 * `package/package.json` is a short path pnpm packs as a plain USTAR entry, so
 * the GNU-long-name / PAX-`path=` / prefix-split encodings `parseTar` handles in
 * `@liteship/cli` are not reachable here. Returns `null` when the entry is absent.
 */
function extractTarEntryUtf8(tar: Uint8Array, wantPath: string): string | null {
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    let allZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        allZero = false;
        break;
      }
    }
    if (allZero) break; // end-of-archive marker

    let nameEnd = 0;
    while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
    const name = decoder.decode(header.subarray(0, nameEnd));

    const sizeText = decoder.decode(header.subarray(124, 136)).replace(/\0/g, '').trim();
    const size = sizeText === '' ? 0 : parseInt(sizeText, 8);

    const typeflag = header[156];
    const isRegularFile = typeflag === 0 || typeflag === 0x30; // NUL or '0'
    const dataStart = offset + 512;

    if (name === wantPath && isRegularFile) {
      return decoder.decode(tar.subarray(dataStart, dataStart + size));
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return null;
}

/**
 * Gunzip a packed `.tgz`'s bytes and parse its `package/package.json`.
 *
 * Pure Node (gunzip + {@link extractTarEntryUtf8}) — no `tar` subprocess and no
 * external dependency, so the residue guard is hermetic. Throws when the tarball
 * carries no `package/package.json` (a broken artifact regardless of contents).
 */
export function readPackedManifest(tgzBytes: Uint8Array): PackedManifest {
  const tar = gunzipSync(tgzBytes);
  const json = extractTarEntryUtf8(new Uint8Array(tar), 'package/package.json');
  if (json === null) {
    throw new Error('packed tarball has no package/package.json');
  }
  return JSON.parse(json) as PackedManifest;
}
