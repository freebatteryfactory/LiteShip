/**
 * The canonical command catalog (CUT A1, catalog collapse). One source of
 * command identity for every surface: CLI help / completion / describe and MCP
 * `tools/list` all project this registry instead of hand-maintaining their own
 * parallel tables.
 *
 * Migrated commands ({@link glossaryCommand}, {@link versionCommand}) contribute
 * their descriptor *and* handler; commands whose handlers are still legacy-backed
 * (routed by the CLI's own dispatch, pending migration) contribute a
 * descriptor-only entry here. Either way, identity lives in exactly one place.
 *
 * @module
 */
import type { CapsuleCommandDescriptor } from '@liteship/core';
import type { BenchmarkSubjectFacts, BenchSubject } from '@liteship/gauntlet';
import { createCommandRegistry, type CommandRegistry, type RegisteredCommand } from './registry.js';
import { glossaryCommand } from './commands/glossary.js';
import { versionCommand } from './commands/version.js';
import { capsuleInspectCommand, capsuleListCommand, capsuleVerifyCommand } from './commands/capsule.js';
import { assetAnalyzeCommand, assetVerifyCommand } from './commands/asset.js';
import { sceneVerifyCommand, sceneCompileCommand, sceneRenderCommand } from './commands/scene.js';
import { verifyCommand } from './commands/verify.js';
import { auditCommand } from './commands/audit.js';
import { auditFloorCommand } from './commands/audit-floor.js';
import { plumbCommand } from './commands/plumb.js';
import { packageSmokeCommand } from './commands/package-smoke.js';
import { checkInvariantsCommand } from './commands/check-invariants.js';
import { capsuleVerifyGateCommand } from './commands/capsule-verify.js';
import { checkGatesCommand } from './commands/check.js';
import { explainCommand } from './commands/explain.js';
import { contextCommand } from './commands/context.js';
import type { GlossaryPayload } from './commands/glossary.js';
import type { VersionPayload } from './commands/version.js';
import type { CapsuleInspectPayload, CapsuleListPayload, CapsuleVerifyResultPayload } from './commands/capsule.js';
import type { AssetAnalyzePayload, AssetVerifyPayload } from './commands/asset.js';
import type { SceneVerifyPayload, SceneCompilePayload, SceneRenderPayload } from './commands/scene.js';
import type { VerifyPayload } from './commands/verify.js';
import type { AuditPayload } from './commands/audit.js';
import type { AuditFloorPayload } from './commands/audit-floor.js';
import type { PlumbPayload } from './commands/plumb.js';
import type { PackageSmokePayload } from './commands/package-smoke.js';
import type { CheckInvariantsPayload } from './commands/check-invariants.js';
import type { CapsuleVerifyPayload } from './commands/capsule-verify.js';
import type { CheckPayload } from './commands/check.js';
import type { ExplainPayload } from './commands/explain.js';
import type { ContextPayload } from './commands/context.js';

/**
 * The name-keyed payload contract: for each handler-backed command, the `payload`
 * type its result carries. `dispatch<N extends keyof CommandMap>` reads this to
 * type its return as `CapsuleCommandResult<CommandMap[N]>`, so a caller of
 * `dispatch('glossary', …)` gets a compile-time `GlossaryPayload` with no cast.
 *
 * Assembled from the `*Payload` types each command module exports — every
 * handler-backed command maps to its own named payload type (no `unknown`), so a
 * `dispatch('capsule.inspect', …)` caller reads a precise `CapsuleInspectPayload`.
 */
export interface CommandMap {
  readonly glossary: GlossaryPayload;
  readonly version: VersionPayload;
  readonly 'capsule.inspect': CapsuleInspectPayload;
  readonly 'capsule.list': CapsuleListPayload;
  readonly 'capsule.verify': CapsuleVerifyResultPayload;
  readonly 'asset.analyze': AssetAnalyzePayload;
  readonly 'asset.verify': AssetVerifyPayload;
  readonly 'scene.verify': SceneVerifyPayload;
  readonly 'scene.compile': SceneCompilePayload;
  readonly 'scene.render': SceneRenderPayload;
  readonly verify: VerifyPayload;
  readonly audit: AuditPayload;
  readonly 'audit-floor': AuditFloorPayload;
  readonly plumb: PlumbPayload;
  readonly 'package-smoke': PackageSmokePayload;
  readonly 'check-invariants': CheckInvariantsPayload;
  readonly 'capsule-verify': CapsuleVerifyPayload;
  readonly 'check.gates': CheckPayload;
  readonly explain: ExplainPayload;
  readonly context: ContextPayload;
}

/**
 * Descriptors for commands whose execution is owned by the CLI (terminal
 * orchestration, destructive/streaming workflows, host-probe batteries, catalog
 * projections) — they intentionally have NO `@liteship/command` handler. They are
 * still first-class catalog entries for identity + discovery. Tagged
 * `executionKind: 'cli-orchestration'` structurally at assembly below, so a
 * CLI-owned entry can never silently look like a finite command that lost its
 * handler.
 */
const CLI_OWNED_DESCRIPTORS = [
  {
    name: 'check',
    summary:
      'Run the quick check profile by default; select quick/full/release/consumer/environment or print the execution plan.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: { type: 'string', enum: ['quick', 'full', 'release', 'consumer', 'environment'] },
        plan: { type: 'boolean' },
        json: { type: 'boolean' },
        cure: { type: 'boolean' },
        ir: { type: 'boolean' },
        'no-cache': { type: 'boolean' },
        symbols: { type: 'boolean' },
        'supply-chain': { type: 'boolean' },
        mutate: { type: 'boolean' },
        mcdc: { type: 'boolean' },
        simulate: { type: 'boolean' },
        taint: { type: 'boolean' },
        proof: { type: 'boolean' },
        composition: { type: 'boolean' },
        'capability-gate': { type: 'boolean' },
        'spine-relation': { type: 'boolean' },
      },
    },
    cli: { outputMode: 'json' },
    annotations: { readOnly: true, group: 'setup' },
  },
  {
    name: 'doctor',
    summary: 'Preflight environment check: Node, pnpm, workspace, build artifacts, git hooks.',
    inputSchema: {
      type: 'object',
      properties: {
        fix: { type: 'boolean' },
        ci: { type: 'boolean' },
        preflight: { type: 'boolean' },
        target: { type: 'string', enum: ['cloudflare', 'astro', 'consumer-app'] },
        deployed: { type: 'string' },
      },
    },
    cli: { outputMode: 'json' },
    annotations: { group: 'setup' },
  },
  {
    name: 'describe',
    summary: 'Dump the capsule catalog + command schema (the AI discovery surface).',
    inputSchema: { type: 'object', properties: { format: { type: 'string', enum: ['json', 'mcp'] } } },
    cli: { outputMode: 'json' },
    // NOT mcpExposed: describe is a catalog projection — MCP already serves that
    // via tools/list, so exposing it as a callable tool is duplicate ontology.
    annotations: { readOnly: true, group: 'setup' },
  },
  {
    name: 'help',
    summary: 'Print the CLI command list grouped by phase.',
    inputSchema: { type: 'object', properties: {} },
    cli: { outputMode: 'text' },
    annotations: { cliOnly: true, group: 'setup' },
  },
  {
    name: 'completion',
    summary: 'Emit a shell tab-completion script for sourcing into a shell rc.',
    inputSchema: {
      type: 'object',
      required: ['shell'],
      properties: { shell: { type: 'string', enum: ['bash', 'zsh', 'fish'] } },
    },
    cli: { outputMode: 'text', positionals: ['shell'] },
    annotations: { cliOnly: true, group: 'setup' },
  },
  {
    name: 'scene.dev',
    summary: 'Launch Vite + the browser scene player.',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'string' } } },
    cli: { outputMode: 'process', positionals: ['scene'] },
    annotations: { longRunning: true, group: 'compose' },
  },
  {
    name: 'astro.dev',
    summary: 'Launch Astro 7 dev in background mode for agent workflows.',
    inputSchema: { type: 'object', properties: {} },
    cli: { outputMode: 'json' },
    annotations: { longRunning: true, group: 'servers' },
  },
  {
    name: 'astro.status',
    summary: 'Report Astro 7 background dev-server status.',
    inputSchema: { type: 'object', properties: {} },
    cli: { outputMode: 'json' },
    annotations: { readOnly: true, group: 'servers' },
  },
  {
    name: 'astro.stop',
    summary: 'Stop the Astro 7 background dev server.',
    inputSchema: { type: 'object', properties: {} },
    cli: { outputMode: 'json' },
    annotations: { group: 'servers' },
  },
  {
    name: 'gauntlet',
    summary: 'Run the full release-grade gauntlet.',
    inputSchema: { type: 'object', properties: { 'dry-run': { type: 'boolean' } } },
    cli: { outputMode: 'process' },
    // NOT mcpExposed: gauntlet is a blocking spawnSync(stdio:inherit) that streams
    // the full `gauntlet:full` run to a terminal — terminal orchestration, not an MCP tool.
    annotations: { group: 'ship' },
  },
  {
    name: 'ship',
    summary: 'Mint ShipCapsule(s) and (unless --dry-run) hand off to pnpm publish (ADR-0011).',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string' },
        'dry-run': { type: 'boolean' },
        provenance: { type: 'boolean' },
        otp: { type: 'string' },
        'artifact-dir': { type: 'string' },
        'capsule-dir': { type: 'string' },
        help: { type: 'boolean' },
      },
    },
    cli: { outputMode: 'json', flagAliases: { '--help': ['-h'] } },
    annotations: { destructive: true, group: 'ship' },
  },
  {
    name: 'sbom',
    summary:
      'Emit the deterministic, content-addressed CycloneDX SBOM over the lockfile + workspace; fail on a lockfile-policy or completeness violation.',
    inputSchema: { type: 'object', properties: {} },
    cli: { outputMode: 'json' },
    // NOT mcpExposed: sbom writes a reviewable artifact to the working tree
    // (reports/sbom.json) — a host/file-orchestration verb, not an MCP tool.
    annotations: { group: 'ship' },
  },
  {
    name: 'mcp',
    summary: 'Start the MCP server (stdio default; --http=PORT for HTTP).',
    inputSchema: { type: 'object', properties: { http: { type: 'string' } } },
    cli: { outputMode: 'process' },
    annotations: { longRunning: true, cliOnly: true, group: 'servers' },
  },
  {
    name: 'lsp',
    summary:
      'Start the gauntlet LSP server over stdio — publishes Findings as live diagnostics + code actions (--ir for the IR-enriched fold).',
    inputSchema: { type: 'object', properties: { ir: { type: 'boolean' } } },
    cli: { outputMode: 'process' },
    annotations: { longRunning: true, cliOnly: true, group: 'servers' },
  },
  {
    name: 'dev',
    summary:
      'Launch the detected Astro/Vite host in a LiteShip application; repository-only --example/--tutorial selectors remain explicit.',
    inputSchema: {
      type: 'object',
      properties: { example: { type: 'string' }, tutorial: { type: 'boolean' } },
    },
    cli: { outputMode: 'process' },
    annotations: { longRunning: true, group: 'setup' },
  },
  {
    name: 'build',
    summary: 'Build a LiteShip consumer app (detects liteship.config.ts, runs the astro/vite host build).',
    inputSchema: { type: 'object', properties: {} },
    cli: { outputMode: 'json' },
    annotations: { group: 'setup' },
  },
  {
    name: 'info',
    summary: 'Report the host environment, the @liteship/* roster, catalog + capability summary (--json).',
    inputSchema: { type: 'object', properties: { json: { type: 'boolean' } } },
    cli: { outputMode: 'json' },
    annotations: { readOnly: true, group: 'setup' },
  },
  {
    name: 'add',
    summary: 'Copy a scaffold fragment (example/template) into the working directory; list them with no args.',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string' }, name: { type: 'string' } },
    },
    cli: { outputMode: 'json', positionals: ['kind', 'name'] },
    annotations: { group: 'setup' },
  },
] as const satisfies readonly CapsuleCommandDescriptor[];

/**
 * The closed union of CLI-owned command names, DERIVED from
 * {@link CLI_OWNED_DESCRIPTORS} (`as const`). The CLI's dispatch keys its
 * `CLI_EXECUTORS` record by this type, so a CLI-owned command declared here
 * without an executor is a COMPILE error and a stray executor is dead-code
 * flagged — the projection cannot silently drift from the catalog.
 */
export type CliOwnedName = (typeof CLI_OWNED_DESCRIPTORS)[number]['name'];

/** Finite, structured, handler-backed commands. Each is tagged `executionKind: 'handler'`. */
const HANDLER_COMMANDS: readonly RegisteredCommand[] = [
  glossaryCommand,
  versionCommand,
  capsuleInspectCommand,
  capsuleListCommand,
  capsuleVerifyCommand,
  assetAnalyzeCommand,
  assetVerifyCommand,
  sceneVerifyCommand,
  sceneCompileCommand,
  sceneRenderCommand,
  verifyCommand,
  auditCommand,
  auditFloorCommand,
  plumbCommand,
  packageSmokeCommand,
  checkInvariantsCommand,
  capsuleVerifyGateCommand,
  checkGatesCommand,
  explainCommand,
  contextCommand,
];

/**
 * Every registered command, with `executionKind` injected structurally by list
 * membership: handler-backed commands → `handler`; CLI-owned descriptors →
 * `cli-orchestration`. A command can never be misclassified — a `HandledCommand`
 * only lives in HANDLER_COMMANDS; a handler-less descriptor only in
 * CLI_OWNED_DESCRIPTORS — and the catalog tests enforce the law.
 */
const ALL_COMMANDS: readonly RegisteredCommand[] = [
  ...HANDLER_COMMANDS.map((command) => ({
    ...command,
    descriptor: {
      ...command.descriptor,
      cli: { outputMode: 'json' as const, ...command.descriptor.cli },
      executionKind: 'handler' as const,
    },
  })),
  ...CLI_OWNED_DESCRIPTORS.map((descriptor) => ({
    descriptor: { ...descriptor, executionKind: 'cli-orchestration' as const },
  })),
];

/** One exact, parser-qualified benchmark subject required by a command. */
export interface CommandBenchmarkEvidenceRef {
  readonly distribution: { readonly name: string; readonly file: string };
  readonly subject: BenchSubject;
}

/**
 * Explicit benchmark applicability for one command. `not-performance` is data,
 * never a guess from command prose; `performance-bearing` names every admitted
 * subject the command relies on for its performance evidence.
 */
export type CommandBenchmarkEligibility =
  | { readonly command: string; readonly classification: 'not-performance' }
  | {
      readonly command: string;
      readonly classification: 'performance-bearing';
      readonly evidence: readonly CommandBenchmarkEvidenceRef[];
    };

export type CommandBenchmarkEligibilityIssueKind =
  | 'missing-classification'
  | 'orphan-classification'
  | 'duplicate-classification'
  | 'missing-evidence'
  | 'duplicate-evidence'
  | 'unexecuted-evidence';

export interface CommandBenchmarkEligibilityIssue {
  readonly kind: CommandBenchmarkEligibilityIssueKind;
  readonly command: string;
  readonly detail: string;
}

const NOT_PERFORMANCE_COMMANDS = [
  'add',
  'asset.analyze',
  'asset.verify',
  'astro.dev',
  'astro.status',
  'astro.stop',
  'audit',
  'audit-floor',
  'build',
  'capsule-verify',
  'capsule.inspect',
  'capsule.list',
  'capsule.verify',
  'check-invariants',
  'check.gates',
  'completion',
  'context',
  'describe',
  'dev',
  'doctor',
  'explain',
  'gauntlet',
  'glossary',
  'help',
  'info',
  'lsp',
  'mcp',
  'package-smoke',
  'plumb',
  'sbom',
  'scene.compile',
  'scene.dev',
  'scene.render',
  'scene.verify',
  'ship',
  'verify',
  'version',
] as const;

/**
 * The one command benchmark eligibility table. Catalog coverage is checked by
 * {@link commandBenchmarkEligibilityIssues}, so adding a command without an
 * explicit classification is a deterministic red.
 */
export const COMMAND_BENCHMARK_ELIGIBILITY: readonly CommandBenchmarkEligibility[] = [
  ...NOT_PERFORMANCE_COMMANDS.map((command) => ({ command, classification: 'not-performance' as const })),
  {
    command: 'check',
    classification: 'performance-bearing',
    evidence: [
      {
        distribution: {
          name: 'command planChecks -- release profile',
          file: 'tests/bench/command.bench.ts',
        },
        subject: {
          role: 'sut',
          origin: { kind: 'module', specifier: '@liteship/command' },
          symbol: 'planChecks',
          binding: 'planChecks',
        },
      },
      {
        distribution: {
          name: 'command registry construction -- full catalog',
          file: 'tests/bench/command.bench.ts',
        },
        subject: {
          role: 'sut',
          origin: { kind: 'module', specifier: '@liteship/command' },
          symbol: 'createCommandRegistry',
          binding: 'createCommandRegistry',
        },
      },
      {
        distribution: {
          name: 'command cache identity -- structured inputs',
          file: 'tests/bench/command.bench.ts',
        },
        subject: {
          role: 'sut',
          origin: { kind: 'file', path: 'packages/command/src/host/idempotency.ts' },
          symbol: 'hashInputs',
          binding: 'hashInputs',
        },
      },
    ],
  },
];

function subjectKey(subject: BenchSubject): string {
  const origin =
    subject.origin.kind === 'module'
      ? `module:${subject.origin.specifier}`
      : subject.origin.kind === 'file'
        ? `file:${subject.origin.path}`
        : subject.origin.kind === 'intrinsic'
          ? `intrinsic:${subject.origin.name}`
          : `wasm:${subject.origin.crate}`;
  return `${subject.role}|${origin}|${subject.symbol}|${subject.binding}`;
}

/**
 * Fold the canonical command catalog against explicit eligibility data and the
 * existing parser-qualified benchmark facts. A performance-bearing command is
 * covered only when every named distribution is unique, its exact SUT is
 * qualifying, the whole distribution has no qualification issue, and its file
 * belongs to an executed benchmark lane.
 */
export function commandBenchmarkEligibilityIssues(
  catalog: readonly CapsuleCommandDescriptor[],
  eligibility: readonly CommandBenchmarkEligibility[],
  facts: BenchmarkSubjectFacts,
  executedBenchmarkFiles: readonly string[],
): readonly CommandBenchmarkEligibilityIssue[] {
  const issues: CommandBenchmarkEligibilityIssue[] = [];
  const catalogNames = new Set(catalog.map((descriptor) => descriptor.name));
  const rowsByCommand = new Map<string, CommandBenchmarkEligibility[]>();
  const executed = new Set(executedBenchmarkFiles);

  for (const row of eligibility) {
    const rows = rowsByCommand.get(row.command) ?? [];
    rows.push(row);
    rowsByCommand.set(row.command, rows);
    if (!catalogNames.has(row.command)) {
      issues.push({
        kind: 'orphan-classification',
        command: row.command,
        detail: `benchmark eligibility classifies unknown command "${row.command}"`,
      });
    }
  }

  for (const descriptor of catalog) {
    const rows = rowsByCommand.get(descriptor.name) ?? [];
    if (rows.length === 0) {
      issues.push({
        kind: 'missing-classification',
        command: descriptor.name,
        detail: `command "${descriptor.name}" has no explicit benchmark eligibility classification`,
      });
      continue;
    }
    if (rows.length > 1) {
      issues.push({
        kind: 'duplicate-classification',
        command: descriptor.name,
        detail: `command "${descriptor.name}" has ${rows.length} benchmark eligibility classifications`,
      });
      continue;
    }
    const row = rows[0]!;
    if (row.classification === 'not-performance') continue;
    if (row.evidence.length === 0) {
      issues.push({
        kind: 'missing-evidence',
        command: descriptor.name,
        detail: `performance-bearing command "${descriptor.name}" names no benchmark evidence`,
      });
      continue;
    }

    const seenEvidence = new Set<string>();
    for (const evidence of row.evidence) {
      const evidenceKey = `${evidence.distribution.file}::${evidence.distribution.name}::${subjectKey(evidence.subject)}`;
      if (seenEvidence.has(evidenceKey)) {
        issues.push({
          kind: 'duplicate-evidence',
          command: descriptor.name,
          detail: `command "${descriptor.name}" repeats benchmark evidence ${evidence.distribution.file}::${evidence.distribution.name}`,
        });
        continue;
      }
      seenEvidence.add(evidenceKey);

      const matches = facts.distributions.filter(
        (fact) => fact.file === evidence.distribution.file && fact.name === evidence.distribution.name,
      );
      if (matches.length !== 1) {
        issues.push({
          kind: matches.length === 0 ? 'missing-evidence' : 'duplicate-evidence',
          command: descriptor.name,
          detail:
            matches.length === 0
              ? `command "${descriptor.name}" requires missing benchmark ${evidence.distribution.file}::${evidence.distribution.name}`
              : `command "${descriptor.name}" maps to ${matches.length} benchmark facts for ${evidence.distribution.file}::${evidence.distribution.name}`,
        });
        continue;
      }
      const fact = matches[0]!;
      if (
        fact.qualification.issues.length > 0 ||
        !fact.qualification.qualifyingSutSubjects.some(
          (subject) => subjectKey(subject) === subjectKey(evidence.subject),
        )
      ) {
        issues.push({
          kind: 'missing-evidence',
          command: descriptor.name,
          detail: `command "${descriptor.name}" benchmark ${evidence.distribution.file}::${evidence.distribution.name} does not admit its exact SUT subject`,
        });
      }
      if (!executed.has(evidence.distribution.file)) {
        issues.push({
          kind: 'unexecuted-evidence',
          command: descriptor.name,
          detail: `command "${descriptor.name}" benchmark ${evidence.distribution.file} is not in an executed benchmark lane`,
        });
      }
    }
  }

  return issues;
}

/** The single canonical registry instance. CLI and MCP both project from this. */
export const commandRegistry: CommandRegistry = createCommandRegistry(ALL_COMMANDS);

/** The full catalog of descriptors, sorted by name. Mirrors {@link commandRegistry}.list(). */
export const COMMAND_CATALOG: readonly CapsuleCommandDescriptor[] = commandRegistry.list();

/** The MCP-exposed subset of the catalog (explicit opt-in via `annotations.mcpExposed`). */
export function mcpExposedDescriptors(): readonly CapsuleCommandDescriptor[] {
  return COMMAND_CATALOG.filter((descriptor) => descriptor.annotations?.mcpExposed === true);
}
