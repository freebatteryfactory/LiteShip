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
import { astroDev } from './commands/astro-dev.js';
import { capsuleInspect, capsuleList, capsuleVerify } from './commands/capsule.js';
import { gauntlet } from './commands/gauntlet.js';
import { lsp } from './commands/lsp.js';
import { ship } from './commands/ship.js';
import { verify } from './commands/ship-verify.js';
import { sbom } from './commands/sbom.js';
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
      // `--target` / `--deployed` are value-taking: neither may swallow a following
      // token that begins with `-` (that token is the NEXT flag). Before, `doctor
      // --deployed --fix` read deployed='--fix' and probed the literal string
      // "--fix" as a URL; `takeFlagValue` refuses it (F-PROTO-4).
      const target = takeFlagValue(rest, '--target');
      const deployed = takeFlagValue(rest, '--deployed');
      const targetRaw = target.value;
      if (target.present && targetRaw !== 'cloudflare' && targetRaw !== 'astro' && targetRaw !== 'consumer-app') {
        emitError('doctor', `expected target: cloudflare | astro | consumer-app (got: ${targetRaw ?? '<missing>'})`);
        return 1;
      }
      if (deployed.present && !deployed.value) {
        emitError('doctor', 'usage: liteship doctor --deployed <url>');
        return 1;
      }
      return doctor({
        fix: rest.includes('--fix'),
        ci: rest.includes('--ci'),
        preflight: rest.includes('--preflight'),
        ...(targetRaw === 'cloudflare' || targetRaw === 'astro' || targetRaw === 'consumer-app'
          ? { target: targetRaw }
          : {}),
        ...(deployed.value ? { deployed: deployed.value } : {}),
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
            `usage: liteship scene ${sub} <path-to-scene.ts>${sub === 'render' ? ' [-o <output.mp4>]' : ''}`,
          );
          return 1;
        }
      }
      if (sub === 'compile') return sceneCompile(scene ?? '');
      if (sub === 'dev') return sceneDev(scene ?? '');
      if (sub === 'render') {
        // Both space forms (-o X, --output X) and the `--output=X` equals form parse
        // through one rule (`takeFlagValue`). A present `-o`/`--output` with no value
        // — end of argv, or a following token that is itself a flag — errors instead
        // of silently discarding the user's path (with output now DERIVED when empty).
        const output = takeFlagValue(subRest, ['-o', '--output']);
        if (output.present && output.value === undefined) {
          emitError('scene.render', 'usage: liteship scene render <path-to-scene.ts> -o <output.mp4>');
          return 1;
        }
        const force = subRest.includes('--force');
        // Empty output is the "derive <scene>.mp4" default, resolved in @liteship/command.
        return sceneRender(scene ?? '', output.value ?? '', force);
      }
      if (sub === 'verify') return sceneVerify(scene ?? '');
      emitError('scene', `unknown subcommand: ${sub ?? '<missing>'}`);
      return 1;
    }
    case 'astro': {
      const [sub] = rest;
      if (sub === 'dev' || sub === 'status' || sub === 'stop') {
        return astroDev(sub);
      }
      emitError('astro', `unknown subcommand: ${sub ?? '<missing>'}`);
      return 1;
    }
    case 'asset': {
      const [sub, ...subRest] = rest;
      const id = positional(subRest);
      if (sub === 'analyze') {
        if (id === undefined) {
          emitError('asset.analyze', 'usage: liteship asset analyze <asset-id> --projection=<beat|onset|waveform>');
          return 1;
        }
        const projectionRaw = parseFlag(subRest, '--projection');
        if (projectionRaw === undefined) {
          emitError(
            'asset.analyze',
            'missing --projection. Choose one: --projection=beat | onset | waveform. Example: liteship asset analyze kick-loop --projection=beat',
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
          emitError('asset.verify', 'usage: liteship asset verify <asset-id>');
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
          emitError(`capsule.${sub}`, `usage: liteship capsule ${sub} <capsule-name>`);
          return 1;
        }
        return sub === 'inspect' ? capsuleInspect(name) : capsuleVerify(name);
      }
      if (sub === 'list') return capsuleList(parseFlag(subRest, '--kind'));
      emitError('capsule', `unknown subcommand: ${sub ?? '<missing>'}`);
      return 1;
    }
    case 'audit': {
      // `--profile <name>` is value-taking — the same swallow guard as doctor's
      // flags: `audit --profile --consumer` must not read profile='--consumer'.
      const profile = takeFlagValue(rest, '--profile').value;
      const consumer = rest.includes('--consumer');
      const consumerApp = rest.includes('--consumer-app');
      const findings = rest.includes('--findings');
      return audit({
        ...(profile ? { profile } : {}),
        ...(consumer ? { consumer } : {}),
        ...(consumerApp ? { consumerApp: true } : {}),
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
      // `--ir` opts into the CLI-ONLY IR-enriched path (the triangulated
      // oracle-divergence cross-check + the B2 verdict cache via @liteship/audit);
      // `--no-cache` bypasses that cache. WITHOUT `--ir`, `liteship check` stays the
      // lean, IR-free, MCP-safe six-regex fold (the MCP server exposes only that
      // lean handler — `--ir` never crosses into @liteship/command / @liteship/mcp-server).
      const ir = rest.includes('--ir');
      const noCache = rest.includes('--no-cache');
      // `--symbols` adds the heavy symbol-evidenced LanguageService oracle (B3.3) —
      // only meaningful with `--ir`; the cache key is namespaced by this mode.
      const symbols = rest.includes('--symbols');
      // `--supply-chain` composes the avionics-tier supplyChainGate (Slice C, L4) on
      // + injects the host-computed supply-chain facts — only meaningful with `--ir`;
      // opt-in (no SBOM cost + no not-evidenced noise on the default `--ir` run); the
      // cache key is namespaced by this mode (mirrors --symbols).
      const supplyChain = rest.includes('--supply-chain');
      // `--mutate` composes the avionics-tier mutationDivergenceGate (Slice C, L4) on
      // + runs the per-mutant vitest runner over the live effective-L4 trust-spine
      // seams (each mutant → an isolated subprocess; the score's survivors surface as
      // findings). Only meaningful with `--ir`; opt-in (a covering-test suite run per
      // mutant is HEAVY); the cache key is namespaced by this mode. It mutates real
      // source files IN PLACE (verified-restored), so it must run in ISOLATION.
      const mutate = rest.includes('--mutate');
      // `--mcdc` composes the avionics-tier mcdcCoverageGate (L4 — DO-178B Level A's
      // Modified Condition/Decision Coverage via CONDITION-LEVEL MUTATION) on + runs the
      // per-pin vitest runner over the live effective-L4 trust-spine seams: each atomic
      // condition's force-true/force-false pin → an isolated subprocess; a condition whose
      // independent effect is unobserved (a surviving pin) surfaces as an MC/DC-gap finding
      // (L4 demands full MC/DC). Only meaningful with `--ir`; opt-in (a covering-test suite
      // run per pin, two per condition, is HEAVY); the cache key is namespaced by this
      // mode. It mutates real source files IN PLACE (verified-restored), so it must run in
      // ISOLATION.
      const mcdc = rest.includes('--mcdc');
      // `--simulate` composes the avionics-tier simulationDeterminismGate (L4 — the
      // determinism spine, DST) on + drives the committed scenario corpus through the
      // `@liteship/core/simulation` seeded world (each scenario replayed twice; a
      // byte-exact divergence is a real nondeterminism bug surfaced as an L4 finding
      // carrying the seed). Only meaningful with `--ir`; opt-in (no not-evidenced
      // advisory on the default `--ir` run); the cache key is namespaced by this mode.
      const simulate = rest.includes('--simulate');
      // `--taint` composes the taintFlowGate (the TAINT-ANALYSIS family, L4) on + traces
      // the source→sink dataflow via @liteship/audit's generic taint oracle, classified by
      // the LiteShip-LOCAL source/sink/sanitizer registry the CLI injects (the shader
      // fetch→compile, the AI-cast graph-apply, the runtime-URL SSRF seam). An
      // UNSANITIZED untrusted-value→dangerous-sink flow is a finding. Only meaningful
      // with `--ir`; opt-in (a whole-corpus ts.Program + checker trace is HEAVY); the
      // cache key is namespaced by this mode.
      const taint = rest.includes('--taint');
      // `--proof` composes the proofPropagationGate (the LOCAL-VS-GLOBAL correctness
      // family — the lax-functor, L4) on + reads the proof signals (mutation/coverage/
      // property/invariant), blends a per-module scalar, and propagates it along the dep
      // DAG (the min-fixpoint): a trust-spine module whose GLOBAL proof drops below its
      // floor via a weak dependency is a finding. Only meaningful with `--ir`; opt-in
      // (LIGHT — artifact reads + a corpus scan); the cache key is namespaced by this mode.
      const proof = rest.includes('--proof');
      // `--composition` composes the compositionCoverageGate (the LOCAL-VS-GLOBAL family —
      // "locally green, globally untested interaction", L4) on + derives the interaction
      // edges from the IR call graph (both endpoints individually tested) and classifies
      // each integration-covered/uncovered (the sound static-reference proxy): an UNCOVERED
      // trust-spine interaction edge is a finding. Only meaningful with `--ir`; opt-in
      // (LIGHT — a corpus scan); the cache key is namespaced by this mode.
      const composition = rest.includes('--composition');
      // `--capability-gate` composes the capabilityGateLinkGate (codex round-8, #1b — the
      // capability-link dataflow proof, L4) on + proves every sanctioned skip's guard DERIVES FROM its
      // declared capability's probe (the canonical capability symbol table); an unrelated/mislabeled
      // guard is a finding. Only meaningful with `--ir`; opt-in (a ts.Program over the sanctioned
      // files + capability modules); the cache key is namespaced by this mode.
      const capabilityGate = rest.includes('--capability-gate');
      // `--spine-relation` composes the spineRelationGate (Wave 8.5, the public constitution's
      // STATIC-projection half, L4) on + probes each admitted @liteship/_spine mirror type's
      // bidirectional assignability against its runtime source (a ts.Program probe over the
      // spine + runtime surface): a mirror whose observed relation no longer satisfies its
      // admitted (frozen) relation, or no longer resolves, is a public-contract drift finding.
      // Only meaningful with `--ir`; opt-in (a second ts.Program build, ~3.25s, is HEAVY) but
      // REQUIRED in the release/CI profile; the cache key is namespaced by this mode.
      const spineRelation = rest.includes('--spine-relation');
      // `--no-cache` / `--symbols` / `--supply-chain` / `--mutate` / `--simulate` /
      // `--taint` / `--proof` / `--composition` / `--capability-gate` / `--spine-relation` are
      // only meaningful on the IR path (the lean path has no cache + no IR). A bare flag there
      // is a no-op, never a silent wrong run.
      return check({
        ...(ir ? { ir } : {}),
        ...(noCache ? { noCache } : {}),
        ...(symbols ? { symbols } : {}),
        ...(supplyChain ? { supplyChain } : {}),
        ...(mutate ? { mutate } : {}),
        ...(mcdc ? { mcdc } : {}),
        ...(simulate ? { simulate } : {}),
        ...(taint ? { taint } : {}),
        ...(proof ? { proof } : {}),
        ...(composition ? { composition } : {}),
        ...(capabilityGate ? { capabilityGate } : {}),
        ...(spineRelation ? { spineRelation } : {}),
      });
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
    case 'sbom': {
      return sbom(rest);
    }
    case 'mcp': {
      // @liteship/mcp-server is an optional sibling install, not a dependency of
      // @liteship/cli — an unguarded import would break the one-JSON-line-on-stderr
      // contract with a raw ERR_MODULE_NOT_FOUND stack trace.
      let mcpServer: { start: (opts: { readonly http?: string }) => Promise<void> };
      try {
        mcpServer = await import('@liteship/mcp-server');
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
          '@liteship/mcp-server is not installed',
          `Install it next to @liteship/cli on the same version line: pnpm add @liteship/mcp-server@${major}.${minor}.x`,
        );
        return 1;
      }
      const httpFlag = parseFlag(rest, '--http');
      await mcpServer.start(httpFlag !== undefined ? { http: httpFlag } : {});
      return 0;
    }
    case 'lsp': {
      // The THIRD JSON-RPC skin: launch the gauntlet LSP rigor server over stdio
      // (the editor spawns `liteship lsp` as its language server). The runner is built
      // in the CLI host and injected, so @liteship/mcp-server stays lean — see
      // commands/lsp.ts. `--ir` selects the IR-enriched fold.
      return lsp({ ir: rest.includes('--ir') });
    }
    default: {
      // No command + no flags: friendly help on stdout, exit 0.
      if (rawCmd === undefined) return help();
      // Friendly text first; structured JSON envelope last so machine
      // consumers can read it as the trailing line of stderr.
      const on = colorEnabled();
      process.stderr.write(
        `${color('red', 'No such bearing:', on)} \`${rawCmd}\`.\nTry \`${color('cyan', 'liteship help', on)}\` for the chart.\n`,
      );
      process.stderr.write(JSON.stringify({ error: 'unknown_command', command: rawCmd }) + '\n');
      return 1;
    }
  }
}

/**
 * Normalize top-level argv[0]. Standard help/version flags fold into
 * their verb counterparts so `liteship --help` and `liteship -h` behave like
 * `liteship help`. Returns the input unchanged otherwise.
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

/** A value-taking flag read from argv: whether it appeared at all, and its parsed value (if any). */
interface FlagValue {
  /** The flag token appeared (either `--flag=…` or a bare `--flag`). */
  readonly present: boolean;
  /**
   * The parsed value — `undefined` when the flag is absent OR is present in space
   * form with no usable value (end of argv, or the next token is itself a flag).
   * Callers tell "omitted" (`!present`) apart from "given without a value"
   * (`present && value === undefined`).
   */
  readonly value: string | undefined;
}

/**
 * Read a value-taking flag from argv in either the `--flag=value` or the
 * `--flag value` space form. One or more names may be given so aliases
 * (`['-o', '--output']`) resolve through the same rule.
 *
 * The load-bearing rule (F-PROTO-4): a space-form flag must NEVER consume a
 * following token that begins with `-`. That token is the NEXT flag, not this
 * flag's value — so `doctor --deployed --fix` reads as "--deployed with no value"
 * (a clean usage error), not "--deployed=--fix" (which then probed the literal
 * string "--fix" as a URL). This is the guard the scene-render `-o` path already
 * had, lifted into one shared parser for every value-taking flag.
 */
function takeFlagValue(argv: readonly string[], flag: string | readonly string[]): FlagValue {
  const names = typeof flag === 'string' ? [flag] : flag;
  for (const a of argv) {
    for (const name of names) {
      if (a.startsWith(`${name}=`)) return { present: true, value: a.slice(name.length + 1) };
    }
  }
  const idx = argv.findIndex((a) => names.includes(a));
  if (idx < 0) return { present: false, value: undefined };
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith('-')) return { present: true, value: undefined };
  return { present: true, value: next };
}

/** First positional argument: argv[0] only when present and not a flag. */
function positional(argv: readonly string[]): string | undefined {
  const first = argv[0];
  return first !== undefined && !first.startsWith('-') ? first : undefined;
}
