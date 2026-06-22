/**
 * doctor — Cloudflare + consumer probes. The host-focused checks behind
 * `--target cloudflare` (Astro version, the @astrojs/cloudflare adapter,
 * Wrangler CLI + config, the Astro output mode, CSP advisory) plus the
 * `liteship.pnpm` consumer-context probe.
 *
 * Read-only or capture-spawn, same as the workspace family. No
 * world-mutation lives here.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnArgvCapture } from '../../lib/spawn.js';
import { findAstroConfig, hasDep, readCwdPackageJson, readInstalledVersion, readWranglerConfig } from './manifest.js';
import { DOCTOR_PROBE_TIMEOUT_MS, type DoctorCheck, parseMajor } from './types.js';

/**
 * Consumer-context probe — the `liteship` umbrella under pnpm's strict
 * `node_modules` does not hoist the transitive `@czap/*` packages it installs,
 * so `import '@czap/core'` dies with Node's raw ERR_MODULE_NOT_FOUND before
 * LiteShip can say anything. Returns null (probe skipped) when the host
 * package.json does not declare `liteship`, or when the layout is not
 * pnpm-strict (npm/yarn hoisted layouts expose the transitives).
 */
export function probeLiteshipPnpm(cwd: string): DoctorCheck | null {
  const manifest = readCwdPackageJson(cwd);
  if (manifest.kind !== 'ok') return null;
  const deps = manifest.value['dependencies'] as Record<string, string> | undefined;
  const devDeps = manifest.value['devDependencies'] as Record<string, string> | undefined;
  if (!(deps?.['liteship'] ?? devDeps?.['liteship'])) return null;
  if (!existsSync(resolve(cwd, 'node_modules/.pnpm'))) return null;
  if (existsSync(resolve(cwd, 'node_modules/@czap'))) {
    return {
      id: 'liteship.pnpm',
      label: 'liteship (pnpm)',
      status: 'ok',
      detail: '@czap/* packages resolvable beside liteship',
    };
  }
  return {
    id: 'liteship.pnpm',
    label: 'liteship (pnpm)',
    status: 'warn',
    detail: 'liteship is installed under pnpm, which does not expose its transitive @czap/* packages to imports',
    hint: 'Declare what you import: pnpm add @czap/core @czap/astro (or hoist the scope with public-hoist-pattern[]=@czap/* in .npmrc)',
  };
}

export function probeCloudflareAstro(cwd: string): DoctorCheck {
  const manifest = readCwdPackageJson(cwd);
  if (manifest.kind === 'unreadable') {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'warn',
      detail: `package.json unreadable: ${manifest.detail}`,
      hint: 'Fix the JSON before trusting dependency probes',
    };
  }
  if (!hasDep(manifest.kind === 'ok' ? manifest.value : null, cwd, 'astro')) {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'fail',
      detail: 'astro not in package.json or node_modules',
      hint: 'Add Astro 6+: pnpm add astro@^6',
    };
  }
  const installed = readInstalledVersion(cwd, 'astro');
  if (installed.kind === 'unreadable') {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'warn',
      detail: `installed astro manifest unreadable: ${installed.detail}`,
      hint: 'Run pnpm install',
    };
  }
  if (installed.kind === 'absent') {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'warn',
      detail: 'astro declared but package.json not resolved in node_modules',
      hint: 'Run pnpm install',
    };
  }
  const version = installed.value;
  const major = parseMajor(version);
  if (major === null || major < 6) {
    return {
      id: 'cloudflare.astro',
      label: 'Astro',
      status: 'fail',
      detail: `${version} (need >= 6 for @astrojs/cloudflare v13+)`,
      hint: 'Upgrade: pnpm add astro@^6',
    };
  }
  return { id: 'cloudflare.astro', label: 'Astro', status: 'ok', detail: version };
}

export function probeCloudflareAdapter(cwd: string): DoctorCheck {
  const manifest = readCwdPackageJson(cwd);
  if (manifest.kind === 'unreadable') {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: `package.json unreadable: ${manifest.detail}`,
      hint: 'Fix the JSON before trusting dependency probes',
    };
  }
  if (!hasDep(manifest.kind === 'ok' ? manifest.value : null, cwd, '@astrojs/cloudflare')) {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'fail',
      detail: '@astrojs/cloudflare not in package.json or node_modules',
      hint: 'Add the adapter: pnpm add @astrojs/cloudflare@^13',
    };
  }
  const installed = readInstalledVersion(cwd, '@astrojs/cloudflare');
  if (installed.kind === 'unreadable') {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: `installed adapter manifest unreadable: ${installed.detail}`,
      hint: 'Run pnpm install',
    };
  }
  if (installed.kind === 'absent') {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: 'adapter declared but not resolved in node_modules',
      hint: 'Run pnpm install',
    };
  }
  const version = installed.value;
  const major = parseMajor(version);
  if (major === null || major < 13) {
    return {
      id: 'cloudflare.adapter',
      label: '@astrojs/cloudflare',
      status: 'warn',
      detail: `${version} (Astro 6 requires @astrojs/cloudflare v13+)`,
      hint: 'Upgrade: pnpm add @astrojs/cloudflare@^13',
    };
  }
  return { id: 'cloudflare.adapter', label: '@astrojs/cloudflare', status: 'ok', detail: version };
}

export async function probeCloudflareWrangler(cwd: string): Promise<DoctorCheck> {
  const installed = readInstalledVersion(cwd, 'wrangler');
  const pkgVersion = installed.kind === 'ok' ? installed.value : null;
  const r = await spawnArgvCapture('wrangler', ['--version'], { cwd, timeoutMs: DOCTOR_PROBE_TIMEOUT_MS }).catch(
    () => null,
  );
  if (r?.timedOut) {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: `no response within ${DOCTOR_PROBE_TIMEOUT_MS}ms`,
      hint: 'Check wrangler directly: wrangler --version',
    };
  }
  const cliVersion = r && r.exitCode === 0 ? r.stdout.trim() : null;
  if (!cliVersion && installed.kind === 'unreadable') {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: `wrangler not on PATH and installed manifest unreadable: ${installed.detail}`,
      hint: 'Run pnpm install',
    };
  }
  if (!cliVersion && !pkgVersion) {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: 'wrangler not on PATH and not in node_modules',
      hint: 'Add Wrangler 4+: pnpm add -D wrangler@^4',
    };
  }
  const version = cliVersion ?? pkgVersion ?? 'unknown';
  const major = parseMajor(version);
  if (major !== null && major < 4) {
    return {
      id: 'cloudflare.wrangler',
      label: 'Wrangler',
      status: 'warn',
      detail: `${version} (recommend >= 4)`,
      hint: 'Upgrade: pnpm add -D wrangler@^4',
    };
  }
  return { id: 'cloudflare.wrangler', label: 'Wrangler', status: 'ok', detail: version };
}

export function probeCloudflareConfig(cwd: string): DoctorCheck {
  const config = readWranglerConfig(cwd);
  if (config.kind === 'unreadable') {
    return {
      id: 'cloudflare.config',
      label: 'Wrangler config',
      status: 'warn',
      detail: `wrangler config present but unreadable: ${config.detail}`,
    };
  }
  if (config.kind === 'absent') {
    return {
      id: 'cloudflare.config',
      label: 'Wrangler config',
      status: 'warn',
      detail: 'no wrangler.jsonc / wrangler.toml (optional when using adapter defaults)',
      hint: 'Add wrangler.jsonc when you need KV/D1/R2 bindings — see HOSTING.md',
    };
  }
  const raw = config.value;
  const issues: string[] = [];
  if (!/compatibility_date/i.test(raw)) issues.push('compatibility_date');
  if (!/nodejs_compat/i.test(raw)) issues.push('nodejs_compat');
  if (!/kv_namespaces/i.test(raw) && !/CZAP_BOUNDARY_CACHE/i.test(raw)) {
    issues.push('kv_namespaces binding for boundary cache');
  }
  if (issues.length > 0) {
    return {
      id: 'cloudflare.config',
      label: 'Wrangler config',
      status: 'warn',
      detail: `present but missing: ${issues.join(', ')}`,
      hint: 'Declare CZAP_BOUNDARY_CACHE in kv_namespaces when using @czap/edge boundary cache',
    };
  }
  return {
    id: 'cloudflare.config',
    label: 'Wrangler config',
    status: 'ok',
    detail: 'bindings and compatibility flags present',
  };
}

export function probeCloudflareOutput(cwd: string): DoctorCheck {
  const configPath = findAstroConfig(cwd);
  if (!configPath) {
    return {
      id: 'cloudflare.output',
      label: 'Astro output mode',
      status: 'warn',
      detail: 'no astro.config.* found',
      hint: 'Set output: "server" and adapter: cloudflare() in astro.config',
    };
  }
  let raw = '';
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (e) {
    return {
      id: 'cloudflare.output',
      label: 'Astro output mode',
      status: 'warn',
      detail: `astro.config unreadable: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  const hasAdapter = /@astrojs\/cloudflare|cloudflare\s*\(/.test(raw);
  const hasServer = /output\s*:\s*['"]server['"]/.test(raw);
  if (!hasAdapter || !hasServer) {
    const missing = [!hasServer ? 'output: server' : null, !hasAdapter ? 'adapter: cloudflare()' : null]
      .filter(Boolean)
      .join(', ');
    return {
      id: 'cloudflare.output',
      label: 'Astro output mode',
      status: 'warn',
      detail: `astro.config may be missing ${missing}`,
      hint: 'Use output: "server" and adapter: cloudflare() for Workers SSR',
    };
  }
  return {
    id: 'cloudflare.output',
    label: 'Astro output mode',
    status: 'ok',
    detail: 'server output + cloudflare adapter',
  };
}

export function probeCloudflareCsp(): DoctorCheck {
  return {
    id: 'cloudflare.csp',
    label: 'CSP / isolation',
    status: 'ok',
    detail: 'advisory — doctor cannot read deployed response headers',
    hint: "Host CSP: worker-src 'self' blob:; connect-src for SSE/LLM; add COOP/COEP if using client:worker",
  };
}
