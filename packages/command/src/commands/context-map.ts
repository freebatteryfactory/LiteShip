/**
 * CONTEXT_MAP — the data table behind `liteship context --task <id>`.
 *
 * One entry per common authoring task an agent (or a new contributor) undertakes
 * in this repo. Each entry is an ORDERED list of {@link ContextPointer}s: the owner
 * files where the logic lives, the public entrypoint, the relevant checks, and the
 * proving tests — the exact places to read (and touch) to do that task, in the
 * order you would visit them.
 *
 * Every pointer's `path` is a REAL repo file (a test asserts each one resolves), so
 * the context an agent projects can never rot into a dangling reference: rename a
 * file and the pointer's existence check reds.
 *
 * @module
 */

/** The kind of thing a {@link ContextPointer} points at (aims how a reader treats it). */
export type ContextPointerKind = 'owner-file' | 'entrypoint' | 'check' | 'test' | 'doc';

/** One ordered pointer in a task's context — a real file + why it matters. */
export interface ContextPointer {
  /** How to treat this pointer (owner file / public entrypoint / a check / a proving test / a doc). */
  readonly kind: ContextPointerKind;
  /** Repo-relative path — always a real file (the context test asserts existence). */
  readonly path: string;
  /** One line on why this file is in the task's context. */
  readonly note: string;
  /** The `check/<slug>` id when `kind === 'check'`, else null. */
  readonly checkId: string | null;
}

/** One task's context: a title, a one-line summary, and its ordered pointers. */
export interface ContextTask {
  readonly title: string;
  readonly summary: string;
  readonly pointers: readonly ContextPointer[];
}

/** A file/entrypoint/test/doc pointer (checkId is always null for these kinds). */
function file(kind: Exclude<ContextPointerKind, 'check'>, path: string, note: string): ContextPointer {
  return { kind, path, note, checkId: null };
}

/** A check pointer: the `check/<slug>` id + a real file to read for it. */
function check(checkId: string, path: string, note: string): ContextPointer {
  return { kind: 'check', path, note, checkId };
}

/**
 * THE MAP — task id → its ordered context. The keys are the closed set of task
 * ids `context --task` accepts (surfaced as {@link CONTEXT_TASK_IDS}); an unknown
 * id fails structurally with the valid list.
 */
export const CONTEXT_MAP: Readonly<Record<string, ContextTask>> = {
  'add-boundary': {
    title: 'Add or extend a boundary primitive',
    summary:
      'A boundary partitions a continuous signal into named states. Author it in @liteship/core, evaluate it in @liteship/quantizer, and prove it with a boundary test.',
    pointers: [
      file(
        'owner-file',
        'packages/core/src/authoring/boundary.ts',
        'The boundary primitive — where a boundary is defined.',
      ),
      file(
        'entrypoint',
        'packages/core/src/index.ts',
        'The @liteship/core public barrel the boundary API is exported from.',
      ),
      file(
        'owner-file',
        'packages/quantizer/src/evaluate.ts',
        'Boundary evaluation — how an input resolves to a named state.',
      ),
      file('test', 'tests/integration/boundary-attribute-dedup.test.ts', 'A proving boundary test to mirror.'),
      check(
        'check/test',
        'packages/command/src/checks/registry.ts',
        'The fast unit lane that runs your new boundary test.',
      ),
      file('doc', 'GLOSSARY.md', 'The technical vocabulary for boundaries and named states.'),
    ],
  },
  'add-motion': {
    title: 'Add a motion / transition',
    summary:
      'Motion is a transition program lowered to motion windows. Author the program in @liteship/core/motion and drive it through the quantizer transition path.',
    pointers: [
      file('entrypoint', 'packages/core/src/motion/index.ts', 'The motion public barrel.'),
      file(
        'owner-file',
        'packages/core/src/motion/transition-program.ts',
        'A transition program — the composition that lowers to motion windows.',
      ),
      file(
        'owner-file',
        'packages/core/src/motion/interpret-transition.ts',
        'How a transition node is interpreted into a motion plan.',
      ),
      file(
        'owner-file',
        'packages/quantizer/src/transition.ts',
        'The quantizer transition path that animates between named states.',
      ),
      file('test', 'tests/unit/quantizer/animated-quantizer.test.ts', 'A proving animated-transition test to mirror.'),
      check(
        'check/test',
        'packages/command/src/checks/registry.ts',
        'The fast unit lane that runs your new motion test.',
      ),
    ],
  },
  'debug-check-failure': {
    title: 'Debug a failing check / gauntlet gate',
    summary:
      'A blocking check emits Findings via the gauntlet gate fold. Read the Finding, look up its diagnostic code with `liteship explain`, then trace the emitting gate.',
    pointers: [
      file(
        'owner-file',
        'packages/command/src/commands/check.ts',
        'The check command — the in-process gauntlet gate fold (litelaunchGauntlet).',
      ),
      file(
        'entrypoint',
        'packages/cli/src/commands/check.ts',
        'The `liteship check` CLI adapter (--ir, --json, gate flags).',
      ),
      file(
        'owner-file',
        'packages/gauntlet/src/engine.ts',
        'The gate engine — how gates fold a context into Findings.',
      ),
      file(
        'owner-file',
        'packages/gauntlet/src/finding.ts',
        'The Finding shape (ruleId, detail, remediation) you are reading.',
      ),
      file('owner-file', 'packages/error/src/codes.ts', 'The DIAGNOSTIC_REGISTRY behind `liteship explain <code>`.'),
      file('test', 'tests/unit/command/check.test.ts', 'The check command test — how a gate fold is exercised.'),
      check(
        'check/gates',
        'packages/command/src/checks/registry.ts',
        'The gauntlet gate-fold check the failing gate rides.',
      ),
    ],
  },
  'write-migration-adapter': {
    title: 'Write a migration adapter',
    summary:
      'A migration adapter translates external source syntax into ordinary LiteShip definitions or emits a stable diagnostic when the source cannot be represented faithfully.',
    pointers: [
      file(
        'entrypoint',
        'packages/compiler/src/migrate/index.ts',
        'The public migration-adapter entrypoint and supported source families.',
      ),
      file(
        'owner-file',
        'packages/compiler/src/migrate/types.ts',
        'The MigrationResult and diagnostic contracts every adapter returns.',
      ),
      file(
        'owner-file',
        'packages/compiler/src/migrate/from-media-queries.ts',
        'A representative adapter that preserves, diagnoses, or refuses source semantics.',
      ),
      file(
        'owner-file',
        'packages/error/src/codes.ts',
        'The stable migrate/* diagnostic identities used for lossy or unsupported inputs.',
      ),
      file(
        'test',
        'tests/unit/compiler/migrate/from-media-queries.test.ts',
        'A migration adapter test covering faithful conversion and loud refusal.',
      ),
      check(
        'check/test',
        'packages/command/src/checks/registry.ts',
        'The aggregate test suite your migration test joins.',
      ),
    ],
  },
  release: {
    title: 'Cut a release (mint ShipCapsules, publish)',
    summary:
      'Release mints a content-addressed ShipCapsule per package and hands off to publish. Read the ship command, the manifest, the release planner, and the SBOM.',
    pointers: [
      file(
        'entrypoint',
        'packages/cli/src/commands/ship.ts',
        'The `liteship ship` command — mint ShipCapsule(s) and publish (ADR-0011).',
      ),
      file('owner-file', 'packages/cli/src/ship-manifest.ts', 'The ShipCapsule manifest — what each capsule pins.'),
      file(
        'owner-file',
        'packages/command/src/commands/ship-planning.ts',
        'The release planner — target selection + build-env derivation.',
      ),
      file(
        'owner-file',
        'packages/cli/src/lib/sbom.ts',
        'The deterministic CycloneDX SBOM over the lockfile + workspace.',
      ),
      file('doc', 'docs/adr/0011-ship-capsule.md', 'ADR-0011 — the ShipCapsule design + release flow.'),
      file('test', 'tests/unit/ship-manifest.test.ts', 'The ship-manifest test to mirror.'),
      check(
        'check/package-smoke',
        'packages/command/src/checks/registry.ts',
        'The packed-tarball consumer smoke that gates a release.',
      ),
    ],
  },
  'extend-cli': {
    title: 'Add a CLI / MCP command',
    summary:
      'Commands are one catalog projected onto the CLI and MCP. Add the handler-backed command, register it in the catalog, and wire the CLI dispatch executor.',
    pointers: [
      file(
        'owner-file',
        'packages/command/src/catalog.ts',
        'The canonical command catalog — register your command here (HANDLER_COMMANDS + CommandMap).',
      ),
      file(
        'owner-file',
        'packages/command/src/registry.ts',
        'defineCommand / ok / failed — how a handler-backed command is built.',
      ),
      file(
        'entrypoint',
        'packages/cli/src/dispatch.ts',
        'The CLI dispatch — add the executor (HANDLER_EXECUTORS) so `liteship <verb>` routes.',
      ),
      file(
        'owner-file',
        'packages/command/src/checks/registry.ts',
        'The check registry — if your command owns a new root-script check.',
      ),
      file(
        'test',
        'tests/unit/command/catalog.test.ts',
        'The catalog law test — command identity, execution kind, mcpExposed subset.',
      ),
      check(
        'check/plumb-gate',
        'packages/command/src/checks/registry.ts',
        'The plumb gate that proves every declared export is reachable.',
      ),
    ],
  },
};

/** The closed set of task ids `context --task` accepts, sorted. */
export const CONTEXT_TASK_IDS: readonly string[] = Object.keys(CONTEXT_MAP).sort();
