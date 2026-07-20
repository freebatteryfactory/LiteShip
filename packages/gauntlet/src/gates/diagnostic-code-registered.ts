/**
 * Gate: diagnostic-code-registered — the DIAGNOSTIC-CODE REGISTRY guard.
 *
 * Every stable diagnostic code LiteShip emits must be enrolled in the ONE catalogue
 * ({@link DIAGNOSTIC_REGISTRY} in `@liteship/error`), so a human or an agent can
 * `explainDiagnostic(code)` and get the code's title / explanation / remediation. This
 * gate PROVES that enrolment by STATICALLY SCANNING the gauntlet's own source for the
 * codes it emits and the check registry for the `check/<slug>` ids it declares, then
 * asserting each is a key in the registry:
 *
 *  - every `ruleId: 'gauntlet/…'` literal (and every gate-id / `RULE_NS` / `RULE_ID` /
 *    `GATE_ID` root, which are all single-quoted `'gauntlet/…'` literals) in
 *    `packages/gauntlet/src/**` must be a registry key; AND
 *  - every `check/<slug>` id declared in `@liteship/command`'s check registry
 *    (`packages/command/src/checks/registry.ts`) must be a registry key.
 *
 * LEAF-LEGAL BY CONSTRUCTION: the gate reads the registry from `@liteship/error` (the
 * leaf every package imports — gauntlet imports error, never the reverse) and reads the
 * check ids by SCANNING `@liteship/command`'s registry source text, so it never imports
 * `@liteship/command` (the dependency arrow points the other way: command deps gauntlet).
 * It is a pure fold over the {@link GateContext}'s source bytes (no IR, no facts, no
 * clock) — the same lean shape as the no-placeholder scanner. It earns blocking authority
 * via its red / green / mutation fixtures.
 *
 * @module
 */

import { explainDiagnostic } from '@liteship/error';
import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { commentsBlanked } from './code-only.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/diagnostic-code-registered';

/** The gauntlet source tree this gate scans for emitted `gauntlet/…` ruleId codes. */
const GAUNTLET_SRC_PREFIX = 'packages/gauntlet/src/';

/** The check registry source — the ONE file declaring the `check/<slug>` ids (scanned, not imported). */
const CHECK_REGISTRY_FILE = 'packages/command/src/checks/registry.ts';

/**
 * This gate's OWN source file — SELF-EXCLUDED from the scan. It legitimately carries
 * example / fixture code literals (a deliberately-UNREGISTERED `gauntlet/…` id inside a
 * red-fixture source string), which must NOT be flagged when the gate scans the real
 * tree. Its own emitted id ({@link RULE_ID}) is enrolled directly.
 */
const SELF_FILE_SUFFIX = '/gates/diagnostic-code-registered.ts';

/**
 * Every single-quoted `'gauntlet/<slug>'` literal — the emitted-code roots. In gauntlet
 * source these are exactly the ruleId literals, the gate-id `id:`/`gateId:` values, and
 * the `RULE_ID`/`RULE_NS`/`GATE_ID` constant roots (sub-codes are built with backtick
 * templates, so they are not single-quoted and are not matched here — the base namespace
 * they extend IS matched, and that is what must be enrolled). A `gauntlet/…` slug is a
 * single path segment (`[a-z0-9-]`); a package path (`packages/gauntlet/…`) starts with
 * `packages/`, so it never matches.
 */
const GAUNTLET_CODE = /'(gauntlet\/[a-zA-Z0-9_-]+)'/g;

/** Every single-quoted `'check/<slug>'` literal — the P11 check ids declared in the registry. */
const CHECK_CODE = /'(check\/[a-zA-Z0-9_-]+)'/g;

/** All the codes a single source file emits (comments stripped so a doc mention never counts). */
function codesIn(text: string, pattern: RegExp): readonly string[] {
  // Blank COMMENTS (keeping string literals, where the codes live) so a `{@link gauntlet/x}`
  // or a prose mention in a doc-comment is not mistaken for an emitted code.
  const code = commentsBlanked(text);
  const out: string[] = [];
  for (const match of code.matchAll(pattern)) {
    const captured = match[1];
    if (captured !== undefined) out.push(captured);
  }
  return out;
}

/** Build one "unregistered code" finding — a diagnostic code that no registry entry explains. */
function unregisteredFinding(code: string, file: string): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Diagnostic code "${code}" is not registered`,
    detail: `${file} emits the diagnostic code "${code}", but it has no entry in @liteship/error's DIAGNOSTIC_REGISTRY. Every emitted code (a gauntlet gate ruleId, a check/<slug> id) must be enrolled so \`explainDiagnostic("${code}")\` returns its title/explanation/remediation — an unregistered code is a diagnostic a human or agent cannot look up.`,
    location: { file },
    remediation: {
      kind: 'instruction',
      description: 'Enroll the emitted diagnostic code in the DIAGNOSTIC_REGISTRY.',
      steps: [
        `Add a "${code}" key to DIAGNOSTIC_REGISTRY in packages/error/src/codes.ts with a { title, explanation, remediation, area } drawn from the emitter's own message/detail/remediation text.`,
        `Or, if the code was renamed, update the emitter to use an already-registered code.`,
      ],
    },
  });
}

/**
 * THE SCAN — fold every governed source file into unregistered-code findings. Reads the
 * UNSCOPED corpus (`allFiles()`, falling back to `files()`) so level-scoping never hides a
 * gauntlet source file or the check registry from this meta-gate (the same out-of-IR
 * evidence pattern the no-placeholder gate uses). Every path it reads is package source
 * (in the IR's coverage-digest domain), so it declares no `evidenceDigest`.
 */
function scan(context: GateContext): readonly Finding[] {
  const files = context.allFiles !== undefined ? context.allFiles() : context.files();
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const record = (code: string, file: string): void => {
    if (explainDiagnostic(code) !== undefined) return; // enrolled — nothing to flag
    if (seen.has(code)) return; // one finding per distinct unregistered code
    seen.add(code);
    findings.push(unregisteredFinding(code, file));
  };
  for (const file of [...files].sort()) {
    if (file.endsWith(SELF_FILE_SUFFIX)) continue; // self-exclude (carries example fixture ids)
    if (file.startsWith(GAUNTLET_SRC_PREFIX)) {
      const text = context.readFile(file);
      if (text !== undefined) for (const code of codesIn(text, GAUNTLET_CODE)) record(code, file);
    }
    if (file === CHECK_REGISTRY_FILE) {
      const text = context.readFile(file);
      if (text !== undefined) for (const code of codesIn(text, CHECK_CODE)) record(code, file);
    }
  }
  return findings;
}

// ── Fixtures (synthetic gauntlet/command source — a registered green, an unregistered red) ──

/** A red world: a gauntlet gate source that emits a `gauntlet/…` ruleId no registry enrolls. */
const RED_CONTEXT = memoryContext({
  'packages/gauntlet/src/gates/__unregistered_fixture__.ts':
    "import { finding } from '../finding.js';\nexport const g = () => finding({ ruleId: 'gauntlet/__unregistered_fixture_code__', severity: 'error', level: 'L1', title: 'x', detail: 'x' });\n",
});

/** A green world: a gauntlet gate source + a check registry that emit only ENROLLED codes. */
const GREEN_CONTEXT = memoryContext({
  'packages/gauntlet/src/gates/__registered_fixture__.ts':
    "import { finding } from '../finding.js';\nexport const g = () => finding({ ruleId: 'gauntlet/no-placeholder', severity: 'error', level: 'L1', title: 'x', detail: 'x' });\n",
  'packages/command/src/checks/registry.ts':
    "export const CHECK_REGISTRY = [{ id: 'check/format' }, { id: 'check/typecheck' }] as const;\n",
});

/**
 * The diagnostic-code-registered gate — the registry-enrolment backstop. Self-proves via
 * synthetic gauntlet/command source (an unregistered ruleId reds; only enrolled codes pass).
 */
export const diagnosticCodeRegisteredGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    "Statically scans packages/gauntlet/src for every emitted gauntlet/… ruleId literal and the check registry for every check/<slug> id, and reports any that is not a key in @liteship/error's DIAGNOSTIC_REGISTRY — the guard that keeps every emitted diagnostic code explainable via explainDiagnostic.",
  run: scan,
  fixtures: {
    red: {
      name: "a gauntlet gate source emitting the unregistered ruleId 'gauntlet/__unregistered_fixture_code__'",
      context: RED_CONTEXT,
    },
    green: {
      name: 'gauntlet + check-registry source emitting only enrolled codes (gauntlet/no-placeholder, check/format, check/typecheck)',
      context: GREEN_CONTEXT,
    },
    mutation: {
      describe:
        "A mutant that treats every scanned code as registered (folds nothing) leaves the red fixture's unregistered ruleId unflagged — the mutant must then fail the red.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: never flag anything (the toothless variant that lets an unregistered code
        // through). The red fixture then yields zero findings → red not caught → killed.
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
