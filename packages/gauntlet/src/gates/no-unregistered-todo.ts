/**
 * Gate: no unregistered todo — an intent-debt marker (`TODO` / `FIXME` / `HACK`) left in
 * `packages/&#42;/src` that was never converted into a REGISTERED obligation.
 *
 * This is the enforcement teeth of the P17 OBLIGATIONS LEDGER (Program C). A bare
 * intent-debt marker is a signed promise of unfinished work that reads as done while
 * doing nothing — the same lie {@link noPlaceholderGate} always-blocks. This gate adds
 * the LEDGER discriminant: a genuine, time-boxed deferral is registered in
 * `traceability/obligations.yaml` and named on the SAME line by an `OBL-<AREA>-<slug>`
 * reference (a standalone `OBLIGATION: OBL-…` marker, or a `TODO(OBL-…): …`
 * directive that cites its obligation). A directive that names NO obligation is an
 * UNREGISTERED todo — a finding. Convert it: register the obligation and cite it, or
 * finish the work and delete the marker.
 *
 * PRECISION — the honest CODE-vs-STRING floor. The gate scans {@link stringsBlanked}
 * text (string + regex literals blanked to spaces, COMMENTS kept), then matches only the
 * DIRECTIVE FORM: a comment opener (slash-slash, slash-star, or a leading jsdoc star)
 * followed — after only whitespace — by a marker keyword as a WHOLE WORD. That means the
 * guardrail-scanner code that legitimately carries the keyword as a STRING or REGEX
 * literal (this gate's own directive pattern, `no-placeholder.ts`, `skip-allowlist.ts`,
 * `integrity.ts`, the `codes.ts` catalogue) does NOT trip — its keyword lives in a
 * blanked literal — and a mid-sentence prose mention (the token not the first thing after
 * the opener) does NOT trip either. A gate with a dirty green floor never earns blocking
 * authority; this one stays surgically on unregistered directive comments.
 *
 * SCOPE — the published, downstream-installable tree only: `packages/&#42;/src` (the judged
 * `files()`), never the `tests/` corpus (the always-blocking `no-placeholder` covers the
 * test tree). Every path it reads is package source (in the IR's coverage-digest domain),
 * so it declares no `evidenceDigest`.
 *
 * It ships red / green / mutation fixtures, so it self-proves.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stringsBlanked } from './code-only.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/no-unregistered-todo';

/**
 * DIRECTIVE FORM: a comment opener (slash-slash, slash-star, or a leading jsdoc star),
 * only whitespace, then an intent-debt keyword as a WHOLE WORD. The opener +
 * leading-whitespace-only anchor means a mid-sentence prose mention is NOT a violation.
 * Scanned over strings-blanked text so the keyword inside a string/regex literal vanishes.
 */
const DEBT_DIRECTIVE = /(?:\/\/|\/\*|\*)\s*\b(?:TODO|FIXME|HACK)\b/;

/** A registered-obligation reference on the SAME line — an `OBL-<AREA>-<slug>` id. */
const OBLIGATION_REF = /\bOBL-[A-Z0-9-]+/;

/** A `.ts` file this gate judges — published package source (`packages/<pkg>/src/**`). */
const PACKAGE_SRC = /^packages\/[^/]+\/src\//;

/** The governed corpus: the judged `files()`, filtered to published package `.ts` source, sorted. */
function governedFiles(context: GateContext): readonly string[] {
  return [...context.files()].filter(isGoverned).sort();
}

/** Is `file` a `.ts` under a `packages/<pkg>/src/` tree (the judged, published surface)? */
function isGoverned(file: string): boolean {
  return file.endsWith('.ts') && PACKAGE_SRC.test(file);
}

/**
 * Fold the governed corpus into findings — one per unregistered directive line. When
 * `allowRegistered` is true (the real gate) a directive that ALSO cites an `OBL-*`
 * obligation is allowed; the mutant passes false (flags every directive, even registered
 * ones), which its own green fixture kills.
 */
function scanCorpus(context: GateContext, allowRegistered: boolean): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Blank STRINGS + REGEX (so a keyword in a literal does not count) but KEEP comments —
    // the directive lives in one. One finding per offending line.
    const lines = stringsBlanked(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (!DEBT_DIRECTIVE.test(line)) continue;
      if (allowRegistered && OBLIGATION_REF.test(line)) continue; // a registered, cited deferral
      findings.push(
        finding({
          ruleId: RULE_ID,
          severity: 'error',
          level: 'L1',
          title: 'Unregistered intent-debt marker (TODO / FIXME / HACK)',
          detail: `${file}:${i + 1} carries a bare intent-debt directive comment (TODO / FIXME / HACK) that names no registered obligation. An unregistered marker is a signed promise of unfinished work left in shipped source — it reads as done while doing nothing. A genuine deferral belongs in the OBLIGATIONS LEDGER (traceability/obligations.yaml), cited on the line by its OBL-<AREA>-<slug> id.`,
          location: { file, line: i + 1 },
          remediation: {
            kind: 'instruction',
            description:
              'Register the deferral as an obligation and cite it, or finish the work and remove the marker.',
            steps: [
              'If the work is genuinely deferred: add an OBL-<AREA>-<slug> entry to traceability/obligations.yaml (id, class, owner, review-by, pointer, note), then replace the bare marker with `// OBLIGATION: OBL-<AREA>-<slug>` (or `// TODO(OBL-<AREA>-<slug>): …`) so it names the registered obligation.',
              'If the work is done or in scope for this change: do it and delete the marker — an unregistered marker is never shippable.',
              'If a path is genuinely unsupported, throw a tagged @liteship/error UnsupportedError that names exactly what is unsupported and why — an honest, catchable failure, never a marker that ships green.',
            ],
          },
        }),
      );
    }
  }
  return findings;
}

/** The real scan — a registered, cited directive is allowed; a bare one is a finding. */
function scan(context: GateContext): readonly Finding[] {
  return scanCorpus(context, true);
}

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const noUnregisteredTodoGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L1',
  describe:
    'Flags a bare intent-debt directive comment (TODO / FIXME / HACK) in packages/*/src that names no registered obligation — a genuine deferral must be enrolled in traceability/obligations.yaml and cited by its OBL-<AREA>-<slug> id.',
  run: scan,
  fixtures: {
    red: {
      name: 'a bare `// TODO` in package source that cites no registered obligation',
      context: memoryContext({
        // A leading directive comment naming no OBL-* obligation — the unregistered
        // intent-debt lie the gate must catch. (The keyword is a real comment, not a string.)
        'packages/demo/src/widget.ts':
          '// TODO: wire up the richer widget generator\nexport function widget() {\n  return 1;\n}\n',
      }),
    },
    green: {
      name: 'a registered obligation marker + a cited TODO directive + a descriptive string/regex — all clean',
      context: memoryContext({
        // (1) the canonical standalone marker, (2) a directive that CITES its obligation, and
        // (3) the keyword only inside a string + a regex literal (blanked) and mid-sentence prose.
        'packages/demo/src/add.ts':
          '// OBLIGATION: OBL-FEATURE-ADD\n// TODO(OBL-FEATURE-ADD): richer scaffold generators are forthcoming\nconst note = "richer generators replace this TODO marker with the real thing";\nconst pat = /TODO|FIXME|HACK/;\nexport function add() {\n  return note.length + pat.source.length;\n}\n',
      }),
    },
    mutation: {
      describe:
        'A mutant that drops the registered-obligation exception (flags EVERY directive, even one that cites its OBL-* obligation) reds the green fixture — the cited `// TODO(OBL-FEATURE-ADD)` line — so the mutant must DIFFER from the original on the green fixture (it finds a violation where the original allows the registered deferral).',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: allowRegistered = false — the OBL-* citation no longer excuses the
        // directive, so the green fixture's cited TODO is flagged → green not clean → killed.
        run: (context: GateContext): readonly Finding[] => scanCorpus(context, false),
      }),
    },
  },
});
