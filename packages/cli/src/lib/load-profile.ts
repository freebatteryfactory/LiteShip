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
import { NotFoundError, ParseError, ValidationError } from '@czap/error';

export interface LoadedProfile {
  readonly profile: DevopsProfile;
  readonly source: 'default' | 'file' | 'consumer';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Appended to missing-field errors so the fix is copy-pasteable. */
const MINIMAL_PROFILE = 'A minimal profile: { "internalPackagePrefix": "@acme/", "packageTopology": {} }';

/** Normalize a parsed JSON object into a DevopsProfile (arrays → Sets), failing clearly. */
function profileFromJson(raw: unknown, jsonPath: string, cwd: string): DevopsProfile {
  if (!isRecord(raw)) throw ValidationError('profile.load', `profile JSON must be an object: ${jsonPath}`);
  const prefix = raw['internalPackagePrefix'];
  const topology = raw['packageTopology'];
  // Optional: every SurfacePolicyShape field defaults to "surface not
  // declared", so a profile with no Astro/Vite host simply omits it.
  const surface = raw['surfacePolicy'] ?? {};
  if (typeof prefix !== 'string') {
    throw ValidationError(
      'profile.load',
      `profile JSON missing string "internalPackagePrefix": ${jsonPath}. ${MINIMAL_PROFILE}`,
    );
  }
  if (!isRecord(topology)) {
    throw ValidationError(
      'profile.load',
      `profile JSON missing object "packageTopology": ${jsonPath}. ${MINIMAL_PROFILE}`,
    );
  }
  if (!isRecord(surface))
    throw ValidationError('profile.load', `profile JSON "surfacePolicy" must be an object when present: ${jsonPath}`);
  const exemptions = raw['dynamicImportExemptions'];
  if (exemptions !== undefined && !Array.isArray(exemptions)) {
    throw ValidationError(
      'profile.load',
      `profile JSON "dynamicImportExemptions" must be an array of strings: ${jsonPath}`,
    );
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
    throw ParseError(
      'profile-module',
      `profile module must export a default (or named "profile"/"devopsProfile"): ${modPath}`,
      { code: 'malformed' },
    );
  }
  const resolved = typeof candidate === 'function' ? await (candidate as (cwd: string) => unknown)(cwd) : candidate;
  if (!isRecord(resolved) || typeof resolved['internalPackagePrefix'] !== 'string') {
    throw ParseError(
      'profile-module',
      `profile module export is not a DevopsProfile (missing internalPackagePrefix): ${modPath}`,
      { code: 'malformed' },
    );
  }
  return resolved as unknown as DevopsProfile;
}

/**
 * Resolve a profile from an explicit path (or the LiteShip default rooted at cwd).
 * Throws a clear Error on an unknown extension, a missing file, or an invalid shape.
 *
 * `consumer: true` (czap audit --consumer) builds the profile by discovering
 * the installed packages under cwd's node_modules — still explicit, no walk-up
 * magic. With `--profile`, that profile is the discovery BASE (its
 * `packageTopology` names which packages to find, its `surfacePolicy` drives the
 * surface pass), so a downstream can audit THEIR OWN topology; without it, the
 * base is LiteShip's `@czap/*`.
 */
export async function loadProfile(
  profilePath: string | undefined,
  cwd: string,
  opts: { readonly consumer?: boolean } = {},
): Promise<LoadedProfile> {
  if (opts.consumer) {
    // `--consumer` discovers the installed packages under cwd/node_modules and
    // audits them. With `--profile`, that profile is the discovery BASE — its
    // `packageTopology` names which packages to discover and its `surfacePolicy`
    // drives the surface pass — so a downstream can audit THEIR OWN topology, not
    // just LiteShip's `@czap/*`. Without `--profile`, the base is LiteShip's own.
    const base = profilePath ? await loadProfileFromPath(profilePath, cwd) : undefined;
    return {
      profile: base ? consumerDevopsProfile(cwd, base) : consumerDevopsProfile(cwd),
      source: 'consumer',
    };
  }
  if (!profilePath) {
    return { profile: withRepoRoot(liteshipDevopsProfile, cwd), source: 'default' };
  }
  return { profile: await loadProfileFromPath(profilePath, cwd), source: 'file' };
}

/**
 * Load an explicit `--profile <path>` into a {@link DevopsProfile}. Explicit
 * path only — no walk-up discovery; the file must be `.json`, `.js`, `.mjs`, or
 * `.ts`. Shared by the default audit and the `--consumer` base.
 */
async function loadProfileFromPath(profilePath: string, cwd: string): Promise<DevopsProfile> {
  const abs = resolve(cwd, profilePath);
  if (!existsSync(abs)) throw NotFoundError('file', profilePath, '--profile path not found');
  if (abs.endsWith('.json')) {
    return profileFromJson(JSON.parse(readFileSync(abs, 'utf8')), abs, cwd);
  }
  if (abs.endsWith('.js') || abs.endsWith('.mjs')) {
    return profileFromModule(abs, cwd);
  }
  throw ValidationError(
    'profile.load',
    `--profile must be a .json, .js, or .mjs file (no walk-up discovery): ${profilePath}`,
  );
}
