/**
 * Gate: diagnostic-code-registered — the DIAGNOSTIC-CODE REGISTRY guard.
 *
 * Every stable diagnostic code LiteShip emits must be enrolled in the ONE catalogue
 * ({@link DIAGNOSTIC_REGISTRY} in `@liteship/error`), so a human or an agent can
 * `explainDiagnostic(code)` and get the code's title / explanation / remediation. This
 * gate is the INDEPENDENT source backstop for the exact TypeScript unions at each
 * emitter boundary: every static diagnostic `area/slug` identity in package source,
 * plus every check identity authored by CHECK_REGISTRY, must resolve through the
 * registry. It scans all eight declared areas and all quote styles without treating
 * planted governance facts as emitters.
 *
 * LEAF-LEGAL BY CONSTRUCTION: the gate reads the registry from `@liteship/error` (the
 * leaf every package imports — gauntlet imports error, never the reverse) and reads the
 * package emitters by SCANNING source text, so it never imports
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

/** Package source is the governed emitter corpus; error/codes.ts is the registry, not an emitter. */
const PACKAGE_SRC = /^packages\/[^/]+\/src\//;
const REGISTRY_FILE = 'packages/error/src/codes.ts';
const CHECK_REGISTRY_FILE = 'packages/command/src/checks/registry.ts';

/**
 * This gate's OWN source file — SELF-EXCLUDED from the scan. It legitimately carries
 * example / fixture code literals (a deliberately-UNREGISTERED `gauntlet/…` id inside a
 * red-fixture source string), which must NOT be flagged when the gate scans the real
 * tree. Its own emitted id ({@link RULE_ID}) is enrolled directly.
 */
const SELF_FILE_SUFFIX = '/gates/diagnostic-code-registered.ts';

/**
 * Every static diagnostic-code string literal in the seven runtime/gate areas. Check
 * identities have one authored owner (CHECK_REGISTRY) and use the adjacent pattern.
 * The emitter types reject dynamic/invented runtime identities; both regexes remain
 * deliberately independent and catch single, double, and no-substitution templates.
 */
const STABLE_DIAGNOSTIC_CODE = /(['"`])((?:gauntlet|core|schema|compiler|astro|cli|migrate)\/[a-zA-Z0-9_/-]+)\1/g;
const STABLE_CHECK_ID = /(['"`])(check\/[a-zA-Z0-9_/-]+)\1/g;

/** All the codes a single source file emits (comments stripped so a doc mention never counts). */
function codesIn(text: string, pattern: RegExp): readonly string[] {
  // Blank COMMENTS (keeping string literals, where the codes live) so a `{@link gauntlet/x}`
  // or a prose mention in a doc-comment is not mistaken for an emitted code.
  const code = commentsBlanked(text);
  const out: string[] = [];
  for (const match of code.matchAll(pattern)) {
    const captured = match[2];
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
    if (!PACKAGE_SRC.test(file) || file === REGISTRY_FILE) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;

    // A check identity is authored exactly once by CHECK_REGISTRY. Other package files
    // legitimately carry planted check ids as negative-control facts and test data; those
    // values are not emitted diagnostics. Diagnostic areas remain source-scanned across
    // the full package corpus because their codes may be routed through typed maps before
    // reaching the emitter.
    const pattern = file === CHECK_REGISTRY_FILE ? STABLE_CHECK_ID : STABLE_DIAGNOSTIC_CODE;
    for (const code of codesIn(text, pattern)) record(code, file);
  }
  return findings;
}

// ── Fixtures (synthetic package emitters — registered green, unregistered red) ──

/** A red world: a gauntlet gate source that emits a `gauntlet/…` ruleId no registry enrolls. */
const RED_CONTEXT = memoryContext({
  'packages/astro/src/__unregistered_fixture__.ts':
    'export const payload = { code: "astro/__unregistered_fixture_code__", message: "x" };\n',
  [CHECK_REGISTRY_FILE]: "export const CHECK_REGISTRY = [{ id: 'check/__unregistered_fixture_check__' }] as const;\n",
});

/** A green world: a gauntlet gate source + a check registry that emit only ENROLLED codes. */
const GREEN_CONTEXT = memoryContext({
  'packages/gauntlet/src/gates/__registered_fixture__.ts':
    "import { finding } from '../finding.js';\nexport const g = () => finding({ ruleId: 'gauntlet/no-placeholder', severity: 'error', level: 'L1', title: 'x', detail: 'x' });\n",
  'packages/command/src/checks/registry.ts':
    "export const CHECK_REGISTRY = [{ id: 'check/format' }, { id: 'check/typecheck' }] as const;\n",
  'packages/core/src/schema/__registered_fixture__.ts': 'export const issue = { code: `schema/type`, message: "x" };\n',
  'packages/compiler/src/__registered_fixture__.ts':
    "export const warning = { code: 'compiler/css/unknown-state-key', message: 'x' };\n",
  'packages/astro/src/__registered_fixture__.ts':
    'export const warning = { code: "astro/wgpu/webgpu-unavailable", message: "x" };\n',
  'packages/cli/src/__registered_fixture__.ts': "export const failure = { code: 'cli/usage', message: 'x' };\n",
  'packages/compiler/src/migrate/__registered_fixture__.ts':
    "export const warning = { code: 'migrate/malformed-input', message: 'x' };\n",
  // Planted governance facts are not check emitters. Only CHECK_REGISTRY owns check ids.
  'packages/gauntlet/src/gates/__negative_control_fixture__.ts':
    "export const facts = [{ id: 'check/example-not-an-emitter', blocking: true }] as const;\n",
});

/**
 * The diagnostic-code-registered gate — the registry-enrolment backstop. Self-proves via
 * synthetic gauntlet/command source (an unregistered ruleId reds; only enrolled codes pass).
 */
export const diagnosticCodeRegisteredGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    "Statically scans package source for every stable gauntlet/core/schema/compiler/astro/cli/migrate diagnostic identity plus every CHECK_REGISTRY-owned check identity, and reports any that is not a key in @liteship/error's DIAGNOSTIC_REGISTRY — the independent backstop that keeps every emitted diagnostic code explainable without treating planted governance facts as emitters.",
  run: scan,
  fixtures: {
    red: {
      name: 'an Astro emitter carrying an unregistered stable diagnostic identity',
      context: RED_CONTEXT,
    },
    green: {
      name: 'one enrolled code from each currently emitting diagnostic area',
      context: GREEN_CONTEXT,
    },
    mutation: {
      describe:
        "A mutant that treats every scanned code as registered (folds nothing) leaves the red fixture's unregistered Astro identity unflagged — the mutant must then fail the red.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: never flag anything (the toothless variant that lets an unregistered code
        // through). The red fixture then yields zero findings → red not caught → killed.
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
