/**
 * CLI dispatch entry — accepts argv, emits a JSON receipt to stdout,
 * returns a process exit code.
 *
 * @module
 */

import { completion } from './commands/completion.js';
import { describe as describeCmd } from './commands/describe.js';
import { doctor } from './commands/doctor.js';
import { glossary } from './commands/glossary.js';
import { help } from './commands/help.js';
import { color, colorEnabled } from './lib/ansi.js';
import { sceneCompile } from './commands/scene-compile.js';
import { sceneDev } from './commands/scene-dev.js';
import { sceneRender } from './commands/scene-render.js';
import { sceneVerify } from './commands/scene-verify.js';
import { audit } from './commands/audit.js';
import { auditFloor } from './commands/audit-floor.js';
import { plumb } from './commands/plumb.js';
import { check } from './commands/check.js';
import { packageSmoke } from './commands/package-smoke.js';
import { checkInvariants } from './commands/check-invariants.js';
import { capsuleVerify as capsuleVerifyGate } from './commands/capsule-verify.js';
import { assetAnalyze } from './commands/asset-analyze.js';
import { assetVerify } from './commands/asset-verify.js';
import { capsuleInspect, capsuleList, capsuleVerify } from './commands/capsule.js';
import { gauntlet } from './commands/gauntlet.js';
import { ship } from './commands/ship.js';
import { verify } from './commands/ship-verify.js';
import { readCliVersion, version } from './commands/version.js';
import { emitError } from './receipts.js';

/** Run the CLI with the given argv slice. Returns a process exit code. */
export async function run(argv: readonly string[]): Promise<number> {
  const [rawCmd, ...rest] = argv;
  const cmd = normalizeTopLevel(rawCmd);

  switch (cmd) {
    case 'help':
      return help();
    case 'version':
      return version();
    case 'doctor': {
      const targetEq = parseFlag(rest, '--target');
      const targetIdx = rest.indexOf('--target');
      const targetRaw = targetEq ?? (targetIdx >= 0 ? rest[targetIdx + 1] : undefined);
      // A typo'd target must not silently fall back to the default profile —
      // that runs the wrong checks with no warning.
      if ((targetEq !== undefined || targetIdx >= 0) && targetRaw !== 'cloudflare') {
        emitError('doctor', `expected target: cloudflare (got: ${targetRaw ?? '<missing>'})`);
        return 1;
      }
      const target = targetRaw === 'cloudflare' ? ('cloudflare' as const) : undefined;
      return doctor({
        fix: rest.includes('--fix'),
        ci: rest.includes('--ci'),
        preflight: rest.includes('--preflight'),
        ...(target ? { target } : {}),
      });
    }
    case 'glossary': {
      const term = rest[0] && !rest[0].startsWith('-') ? rest[0] : null;
      return glossary(term);
    }
    case 'completion': {
      return completion(rest[0]);
    }
    case 'describe': {
      const formatRaw = parseFlag(rest, '--format');
      const format = formatRaw === 'json' || formatRaw === 'mcp' ? formatRaw : undefined;
      // An unknown format must not silently fall through to JSON mode.
      if (formatRaw !== undefined && format === undefined) {
        emitError('describe', `expected format: json | mcp (got: ${formatRaw})`);
        return 1;
      }
      process.stdout.write(JSON.stringify(describeCmd({ format })) + '\n');
      return 0;
    }
    case 'scene': {
      const [sub, ...subRest] = rest;
      const scene = positional(subRest);
      if (sub === 'compile' || sub === 'dev' || sub === 'verify' || sub === 'render') {
        // A missing positional must not flow downstream as '' (it surfaces
        // there as a blank-subject error like "scene not found: ").
        if (scene === undefined) {
          emitError(
            `scene.${sub}`,
            `usage: czap scene ${sub} <path-to-scene.ts>${sub === 'render' ? ' [-o <output.mp4>]' : ''}`,
          );
          return 1;
        }
      }
      if (sub === 'compile') return sceneCompile(scene ?? '');
      if (sub === 'dev') return sceneDev(scene ?? '');
      if (sub === 'render') {
        // Both space forms (-o X, --output X) must parse — with output now
        // DERIVED when empty, a missed flag form would silently discard the
        // user's explicit path instead of erroring like it used to.
        const outputIdx = subRest.findIndex((a) => a === '-o' || a === '--output');
        const outputNext = outputIdx >= 0 ? subRest[outputIdx + 1] : undefined;
        if (outputIdx >= 0 && (outputNext === undefined || outputNext.startsWith('-'))) {
          emitError('scene.render', 'usage: czap scene render <path-to-scene.ts> -o <output.mp4>');
          return 1;
        }
        const outputFlag = parseFlag(subRest, '--output');
        const force = subRest.includes('--force');
        // Empty output is the "derive <scene>.mp4" default, resolved in @czap/command.
        return sceneRender(scene ?? '', outputNext ?? outputFlag ?? '', force);
      }
      if (sub === 'verify') return sceneVerify(scene ?? '');
      emitError('scene', `unknown subcommand: ${sub ?? '<missing>'}`);
      return 1;
    }
    case 'asset': {
      const [sub, ...subRest] = rest;
      const id = positional(subRest);
      if (sub === 'analyze') {
        if (id === undefined) {
          emitError('asset.analyze', 'usage: czap asset analyze <asset-id> --projection=<beat|onset|waveform>');
          return 1;
        }
        const projectionRaw = parseFlag(subRest, '--projection');
        if (projectionRaw === undefined) {
          emitError(
            'asset.analyze',
            'missing --projection. Choose one: --projection=beat | onset | waveform. Example: czap asset analyze kick-loop --projection=beat',
          );
          return 1;
        }
        if (projectionRaw !== 'beat' && projectionRaw !== 'onset' && projectionRaw !== 'waveform') {
          emitError('asset.analyze', `expected projection: beat | onset | waveform (got: ${projectionRaw})`);
          return 1;
        }
        const force = subRest.includes('--force');
        return assetAnalyze(id, projectionRaw, force);
      }
      if (sub === 'verify') {
        if (id === undefined) {
          emitError('asset.verify', 'usage: czap asset verify <asset-id>');
          return 1;
        }
        return assetVerify(id);
      }
      emitError('asset', `unknown subcommand: ${sub ?? '<missing>'}`);
      return 1;
    }
    case 'capsule': {
      const [sub, ...subRest] = rest;
      const name = positional(subRest);
      if (sub === 'inspect' || sub === 'verify') {
        if (name === undefined) {
          emitError(`capsule.${sub}`, `usage: czap capsule ${sub} <capsule-name>`);
          return 1;
        }
        return sub === 'inspect' ? capsuleInspect(name) : capsuleVerify(name);
      }
      if (sub === 'list') return capsuleList(parseFlag(subRest, '--kind'));
      emitError('capsule', `unknown subcommand: ${sub ?? '<missing>'}`);
      return 1;
    }
    case 'audit': {
      const eq = parseFlag(rest, '--profile');
      const idx = rest.indexOf('--profile');
      const profile = eq ?? (idx >= 0 ? rest[idx + 1] : undefined);
      const consumer = rest.includes('--consumer');
      const findings = rest.includes('--findings');
      return audit({
        ...(profile ? { profile } : {}),
        ...(consumer ? { consumer } : {}),
        ...(findings ? { findings } : {}),
      });
    }
    case 'audit-floor': {
      return auditFloor();
    }
    case 'plumb': {
      return plumb();
    }
    case 'check': {
      return check();
    }
    case 'check-invariants': {
      return checkInvariants();
    }
    case 'package-smoke': {
      return packageSmoke();
    }
    case 'capsule-verify': {
      return capsuleVerifyGate();
    }
    case 'gauntlet': {
      return gauntlet(rest);
    }
    case 'ship': {
      return ship(rest);
    }
    case 'verify': {
      return verify(rest);
    }
    case 'mcp': {
      // @czap/mcp-server is an optional sibling install, not a dependency of
      // @czap/cli — an unguarded import would break the one-JSON-line-on-stderr
      // contract with a raw ERR_MODULE_NOT_FOUND stack trace.
      let mcpServer: { start: (opts: { readonly http?: string }) => Promise<void> };
      try {
        mcpServer = await import('@czap/mcp-server');
      } catch (err) {
        // Node puts ERR_MODULE_NOT_FOUND on err.code; wrapping loaders
        // (custom ESM hooks, test harnesses) carry the original on cause.
        const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
        if (code !== 'ERR_MODULE_NOT_FOUND') throw err;
        // Derive the install hint from the CLI's OWN version so the sibling
        // MCP server lands on the same minor line — a hard-coded pin drifts
        // every release and desyncs the command/tool schemas (Codex P2, #45).
        const [major, minor] = readCliVersion().split('.');
        emitError(
          'mcp',
          '@czap/mcp-server is not installed',
          `Install it next to @czap/cli on the same version line: pnpm add @czap/mcp-server@${major}.${minor}.x`,
        );
        return 1;
      }
      const httpFlag = parseFlag(rest, '--http');
      await mcpServer.start(httpFlag !== undefined ? { http: httpFlag } : {});
      return 0;
    }
    default: {
      // No command + no flags: friendly help on stdout, exit 0.
      if (rawCmd === undefined) return help();
      // Friendly text first; structured JSON envelope last so machine
      // consumers can read it as the trailing line of stderr.
      const on = colorEnabled();
      process.stderr.write(
        `${color('red', 'No such bearing:', on)} \`${rawCmd}\`.\nTry \`${color('cyan', 'czap help', on)}\` for the chart.\n`,
      );
      process.stderr.write(JSON.stringify({ error: 'unknown_command', command: rawCmd }) + '\n');
      return 1;
    }
  }
}

/**
 * Normalize top-level argv[0]. Standard help/version flags fold into
 * their verb counterparts so `czap --help` and `czap -h` behave like
 * `czap help`. Returns the input unchanged otherwise.
 */
function normalizeTopLevel(raw: string | undefined): string | undefined {
  if (raw === '--help' || raw === '-h') return 'help';
  if (raw === '--version' || raw === '-V' || raw === '-v') return 'version';
  return raw;
}

/** Parse a `--flag=value` style option out of the argv tail. Returns undefined if absent. */
function parseFlag(argv: readonly string[], flag: string): string | undefined {
  for (const a of argv) {
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return undefined;
}

/** First positional argument: argv[0] only when present and not a flag. */
function positional(argv: readonly string[]): string | undefined {
  const first = argv[0];
  return first !== undefined && !first.startsWith('-') ? first : undefined;
}
