/**
 * The FIRST oracle-divergence gate (Slice B, B1 — the headline) + the
 * meta-gauntlet self-proof.
 *
 * Two oracles observe the `is-default-export` property over the repo-IR: the
 * AST-precise `ts-ast` (`file-proxy-only`) and the comment-blind `invariant-regex`
 * (`text-only`, running the canonical NO_DEFAULT_EXPORT rule over raw text). This
 * gate folds `ctx.ir.facts`, groups the `is-default-export` facts by
 * `(file, line)`, and for each line where the two oracles DISAGREE — one has the
 * fact, the other does not — emits a SELF-EXPLAINING, fully-traceable divergence
 * {@link Finding} per the ratified REPORT-not-DECIDE model.
 *
 * The classic disagreement, and the live dogfood: the `invariant-regex` oracle
 * fires on a line where the keyword pair appears INSIDE A COMMENT (a doc comment
 * that mentions the keyword form by name), while the `ts-ast` oracle correctly
 * stays silent (it is not a real declaration). That is the exact false-positive
 * that bit THIS slice's own development repeatedly — and the gate reports it as an
 * advisory divergence, the live proof the text-only oracle is imprecise and should
 * be retired in favour of the AST oracle.
 *
 * THE LAW (the 0.2.3 head-probe scar, as an engine invariant): the comparison is
 * computed from the LIVE oracle facts in the IR — never a hardcoded constant,
 * never a proxy. The engine picks NO winner; it names both oracles, both values,
 * both coverage classes, and the location, and the reader (human via LSP/CLI,
 * agent via MCP) decides.
 *
 * It REQUIRES the injected IR, so it runs only on the host path (the CLI builds +
 * injects the IR); the lean MCP/command path does not run it.
 *
 * @module
 */

import { defineGate, requireIR, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import {
  makeRepoIR,
  coverageClassSeverity,
  strongerCoverageClass,
  type Fact,
  type CoverageClass,
  type RepoIR,
} from '../repo-ir.js';

/** The shared rule id this gate's findings trace to. */
const RULE_ID = 'gauntlet/no-default-export-divergence';

/** The property the two oracles cross-check. */
const PROPERTY = 'is-default-export';

/** The two oracle ids that observe {@link PROPERTY} — the triangulation pair. */
const AST_ORACLE = 'ts-ast';
const REGEX_ORACLE = 'invariant-regex';

/** A `(file, line)` key for grouping facts about the same source site. */
function siteKey(file: string, line: number | undefined): string {
  return `${file}${line ?? 0}`;
}

/** One oracle's observation at a site — the coverage class + which oracle saw it. */
interface OracleObservation {
  readonly oracleId: string;
  readonly coverageClass: CoverageClass;
}

/** The two oracles' presence/absence at one `(file, line)` site. */
interface SiteObservations {
  readonly file: string;
  readonly line: number | undefined;
  /** The AST oracle's observation, if it saw the property here. */
  readonly ast?: OracleObservation;
  /** The regex oracle's observation, if it saw the property here. */
  readonly regex?: OracleObservation;
}

/**
 * Group the IR's {@link PROPERTY} facts by `(file, line)`, recording which of the
 * two oracles observed each site. Computed entirely from the LIVE facts (the
 * head-probe LAW — never a hardcoded expectation).
 */
function groupBySite(facts: readonly Fact[]): readonly SiteObservations[] {
  const byKey = new Map<string, { file: string; line: number | undefined; ast?: OracleObservation; regex?: OracleObservation }>();
  for (const fact of facts) {
    if (fact.property !== PROPERTY) continue;
    const key = siteKey(fact.file, fact.line);
    const entry = byKey.get(key) ?? { file: fact.file, line: fact.line };
    const obs: OracleObservation = { oracleId: fact.oracleId, coverageClass: fact.coverageClass };
    if (fact.oracleId === AST_ORACLE) entry.ast = obs;
    else if (fact.oracleId === REGEX_ORACLE) entry.regex = obs;
    byKey.set(key, entry);
  }
  // Stable order for determinism: file then line.
  return [...byKey.values()].sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
}

/**
 * Build the self-explaining divergence finding for a site where exactly ONE
 * oracle observed the property. Names BOTH oracles, their values (present vs
 * absent), their coverage classes, and the location — the reader decides; the
 * engine picks no winner. Severity is calibrated from the coverage-class pair via
 * the redlinable {@link coverageClassSeverity} matrix.
 */
function divergenceFinding(site: SiteObservations): Finding {
  // Exactly one is present at a divergence. The present oracle's class is the
  // higher-confidence evidence the finding carries; severity is calibrated from
  // the PAIR (present-class, absent-class).
  const present = site.ast ?? site.regex!;
  const absentOracle = site.ast !== undefined ? REGEX_ORACLE : AST_ORACLE;
  // The absent oracle's class is structural (each oracle has a fixed class): the
  // AST oracle is file-proxy-only, the regex oracle is text-only.
  const absentClass: CoverageClass = absentOracle === AST_ORACLE ? 'file-proxy-only' : 'text-only';
  const severity = coverageClassSeverity(present.coverageClass, absentClass);
  const carriedClass = strongerCoverageClass(present.coverageClass, absentClass);

  const loc = `${site.file}:${site.line ?? 0}`;
  const presentDesc = `\`${present.oracleId}\` (${present.coverageClass})`;
  const absentDesc = `\`${absentOracle}\` (${absentClass})`;
  // The whole point of cross-class quiet: when the text-only oracle is the one
  // that fired and the AST did not, the explanation IS the coverage class.
  const why =
    present.oracleId === REGEX_ORACLE
      ? 'the text-only oracle cannot tell comment from code, so it likely fired on a comment/string occurrence the AST oracle correctly ignores — this is the signal to RETIRE the text-only oracle in favour of the AST oracle'
      : 'the AST oracle saw a real default-export form the text-only regex missed (e.g. `export =` or a `{ x as default }` re-export the keyword-pair regex cannot match)';

  return finding({
    ruleId: RULE_ID,
    severity,
    level: 'L1',
    title: `Oracle divergence on ${PROPERTY} at ${loc}`,
    detail: `${presentDesc} flags ${PROPERTY} at ${loc}; ${absentDesc} does not. ${why}. The engine picks no winner — the reader decides. (severity ${severity}: ${present.coverageClass === absentClass ? 'same-class contradiction' : 'cross-class coverage gap'}.)`,
    location: { file: site.file, ...(site.line !== undefined ? { line: site.line } : {}) },
    coverageClass: carriedClass,
    remediation: {
      kind: 'instruction',
      description: 'Resolve the oracle divergence — the engine reports, you decide.',
      steps: [
        `Open ${loc} and confirm whether it is a real default-export declaration.`,
        present.oracleId === REGEX_ORACLE
          ? 'If the keyword pair is inside a comment/string (the regex false-positive), this divergence is the evidence to retire the text-only invariant-regex oracle in favour of the AST oracle — no source change needed.'
          : 'If the AST oracle caught a real `export =` / `{ x as default }` form, the text-only regex is blind to it — prefer the AST oracle for this property.',
      ],
    },
  });
}

/**
 * Fold the IR's facts into divergence findings — one per `(file, line)` where the
 * two `is-default-export` oracles disagree. Agreement (both present, or both
 * absent) emits NOTHING.
 */
function fold(context: GateContext): readonly Finding[] {
  const ir = requireIR(context, RULE_ID);
  const findings: Finding[] = [];
  for (const site of groupBySite(ir.facts)) {
    const astSaw = site.ast !== undefined;
    const regexSaw = site.regex !== undefined;
    // Disagreement ⟺ exactly one oracle observed the property here.
    if (astSaw !== regexSaw) findings.push(divergenceFinding(site));
  }
  return findings;
}

/** A {@link GateContext} carrying ONLY an in-memory IR — for the fixtures. */
function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** A `(file, line)` `is-default-export` fact from `oracleId` with `coverageClass`. */
function fact(file: string, line: number, oracleId: string, coverageClass: CoverageClass): Fact {
  return { file, line, property: PROPERTY, value: true, oracleId, coverageClass };
}

const FILE = 'packages/x/src/a.ts';

/**
 * The oracle-divergence gate — the meta-gauntlet self-proof. Its red/green/mutation
 * fixtures are in-memory {@link RepoIR}s where the two oracles agree or disagree,
 * and they ARE the proof the gate catches an injected divergence. Earns blocking
 * authority via the existing ratchet — no engine change.
 */
export const noDefaultExportDivergenceGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L1',
  describe:
    'Reports a divergence when the AST (file-proxy) and invariant-regex (text-only) oracles disagree on is-default-export at a (file, line) — the regex fired on a comment the AST ignores. Reports, never decides.',
  run: fold,
  fixtures: {
    // RED: the two oracles DISAGREE — the regex flags a line the AST does not
    // (the comment-occurrence false-positive). The gate MUST emit ≥1 divergence.
    red: {
      name: 'an IR where invariant-regex flags a line the AST does not',
      context: irContext(
        makeRepoIR({
          files: [{ id: FILE, contentDigest: 'placeholder:no-content-address', packageName: null }],
          // Only the text-only regex saw line 42 (a comment-occurrence of the
          // keyword pair); the AST oracle did not. A genuine divergence.
          facts: [fact(FILE, 42, REGEX_ORACLE, 'text-only')],
        }),
      ),
    },
    // GREEN: the two oracles AGREE — both present at the same real site. 0 findings.
    green: {
      name: 'an IR where both oracles agree on a real default-export site',
      context: irContext(
        makeRepoIR({
          files: [{ id: FILE, contentDigest: 'placeholder:no-content-address', packageName: null }],
          facts: [fact(FILE, 7, AST_ORACLE, 'file-proxy-only'), fact(FILE, 7, REGEX_ORACLE, 'text-only')],
        }),
      ),
    },
    // MUTATION: a mutant that only compares SAME-oracle facts (it requires both
    // observations to come from the same oracle to count a divergence) never sees
    // the cross-oracle disagreement — so the red fixture goes unflagged and the
    // mutant is killed by red.
    mutation: {
      describe:
        'A mutant that only flags when the SAME oracle disagrees with itself (never cross-oracle) misses the red fixture\'s genuine ts-ast vs invariant-regex divergence — red must then catch nothing and kill it.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          const ir = requireIR(context, RULE_ID);
          // Mutant: ignore the disagreement entirely — only emit when BOTH oracles
          // are present (i.e. it treats agreement as the divergence, inverting the
          // logic). The red fixture (regex present, AST absent) yields nothing, so
          // red fails to catch and the mutant is killed.
          const findings: Finding[] = [];
          for (const site of groupBySite(ir.facts)) {
            if (site.ast !== undefined && site.regex !== undefined) findings.push(divergenceFinding(site));
          }
          return findings;
        },
      }),
    },
  },
});
