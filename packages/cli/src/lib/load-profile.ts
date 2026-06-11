/**
 * DevopsProfile loader (CUT D9b-2) — resolves a `--profile <path>` into a
 * `@czap/audit` DevopsProfile for `czap audit`. Explicit path ONLY: no walk-up,
 * no auto-discovery, no implicit external default.
 *
 *   • no path        → the LiteShip default profile rooted at cwd
 *   • `.json`        → parsed + normalized (arrays → Sets); pure data, no code
 *   • `.js`/`.mjs`   → dynamic import; explicit operator-provided code execution
 *                      (default export, or a named `profile`/`devopsProfile`,
 *                      optionally a factory `(cwd) => profile`)
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { consumerDevopsProfile, liteshipDevopsProfile, withRepoRoot, type DevopsProfile } from '@czap/audit';

export interface LoadedProfile {
  readonly profile: DevopsProfile;
  readonly source: 'default' | 'file' | 'consumer';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Normalize a parsed JSON object into a DevopsProfile (arrays → Sets), failing clearly. */
function profileFromJson(raw: unknown, jsonPath: string, cwd: string): DevopsProfile {
  if (!isRecord(raw)) throw new Error(`profile JSON must be an object: ${jsonPath}`);
  const prefix = raw['internalPackagePrefix'];
  const topology = raw['packageTopology'];
  // Optional: every SurfacePolicyShape field defaults to "surface not
  // declared", so a profile with no Astro/Vite host simply omits it.
  const surface = raw['surfacePolicy'] ?? {};
  if (typeof prefix !== 'string') throw new Error(`profile JSON missing string "internalPackagePrefix": ${jsonPath}`);
  if (!isRecord(topology)) throw new Error(`profile JSON missing object "packageTopology": ${jsonPath}`);
  if (!isRecord(surface)) throw new Error(`profile JSON "surfacePolicy" must be an object when present: ${jsonPath}`);
  const exemptions = raw['dynamicImportExemptions'];
  if (exemptions !== undefined && !Array.isArray(exemptions)) {
    throw new Error(`profile JSON "dynamicImportExemptions" must be an array of strings: ${jsonPath}`);
  }
  const repoRoot = typeof raw['repoRoot'] === 'string' ? raw['repoRoot'] : cwd;
  return {
    repoRoot,
    internalPackagePrefix: prefix,
    packageTopology: topology as unknown as DevopsProfile['packageTopology'],
    dynamicImportExemptions: new Set((exemptions as string[] | undefined) ?? []),
    surfacePolicy: surface as unknown as DevopsProfile['surfacePolicy'],
  };
}

/** Coerce a module's export(s) into a DevopsProfile (object or `(cwd) => profile` factory). */
async function profileFromModule(modPath: string, cwd: string): Promise<DevopsProfile> {
  const mod = (await import(/* @vite-ignore */ pathToFileURL(modPath).href)) as Record<string, unknown>;
  const candidate = mod['default'] ?? mod['profile'] ?? mod['devopsProfile'];
  if (candidate === undefined) {
    throw new Error(`profile module must export a default (or named "profile"/"devopsProfile"): ${modPath}`);
  }
  const resolved = typeof candidate === 'function' ? await (candidate as (cwd: string) => unknown)(cwd) : candidate;
  if (!isRecord(resolved) || typeof resolved['internalPackagePrefix'] !== 'string') {
    throw new Error(`profile module export is not a DevopsProfile (missing internalPackagePrefix): ${modPath}`);
  }
  return resolved as unknown as DevopsProfile;
}

/**
 * Resolve a profile from an explicit path (or the LiteShip default rooted at cwd).
 * Throws a clear Error on an unknown extension, a missing file, or an invalid shape.
 *
 * `consumer: true` (czap audit --consumer) builds the profile from the
 * `@czap/*` packages installed under cwd's node_modules — still explicit,
 * no walk-up magic — and is mutually exclusive with `--profile`.
 */
export async function loadProfile(
  profilePath: string | undefined,
  cwd: string,
  opts: { readonly consumer?: boolean } = {},
): Promise<LoadedProfile> {
  if (opts.consumer) {
    if (profilePath) throw new Error('--consumer and --profile are mutually exclusive');
    return { profile: consumerDevopsProfile(cwd), source: 'consumer' };
  }
  if (!profilePath) {
    return { profile: withRepoRoot(liteshipDevopsProfile, cwd), source: 'default' };
  }
  const abs = resolve(cwd, profilePath);
  if (!existsSync(abs)) throw new Error(`--profile path not found: ${profilePath}`);

  if (abs.endsWith('.json')) {
    return { profile: profileFromJson(JSON.parse(readFileSync(abs, 'utf8')), abs, cwd), source: 'file' };
  }
  if (abs.endsWith('.js') || abs.endsWith('.mjs') || abs.endsWith('.ts')) {
    return { profile: await profileFromModule(abs, cwd), source: 'file' };
  }
  throw new Error(`--profile must be a .json, .js, or .mjs file (no walk-up discovery): ${profilePath}`);
}
