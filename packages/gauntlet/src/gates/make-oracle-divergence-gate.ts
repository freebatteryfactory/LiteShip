/**
 * The PARAMETRIC oracle-divergence layer (Slice B, B3.2) — the reusable factory
 * that turns ANY `(property)` observed by both the AST-precise `ts-ast`
 * (`file-proxy-only`) oracle and the comment-blind `invariant-regex`
 * (`text-only`) oracle into a self-proving, self-explaining divergence
 * {@link Gate}.
 *
 * This is the GENERALIZATION of the B3.1 `no-default-export-divergence` gate: that
 * gate is now ONE instance of {@link makeOracleDivergenceGate}, alongside the two
 * B3.2 instances (`no-var-divergence`, `no-require-divergence`). The divergence
 * FOLD — group facts by `(file, line)`, report the site where exactly one oracle
 * fired, skip a sanctioned POLICY EXCLUDE read from a live marker fact — is written
 * ONCE here; each gate supplies only its descriptor (the property, the marker
 * property, the human prose). That a SINGLE fold proves itself green over three
 * distinct LiteShip check-invariants is the parametric proof: the triangulated
 * oracle layer is a LAYER, not a one-off.
 *
 * The ratified contract is unchanged (it is the whole point of factoring, not
 * re-deciding it):
 *   • REPORT-not-DECIDE — the finding names BOTH oracles, BOTH coverage classes,
 *     BOTH values, and the location; the engine picks no winner.
 *   • THE LAW (the 0.2.3 head-probe scar) — the comparison is computed from the
 *     LIVE oracle facts in the IR, never a hardcoded constant or a proxy. The
 *     exclude set, too, is read from live marker facts, never a path list baked
 *     into the gate.
 *   • Severity is calibrated from the coverage-class PAIR via the redlinable
 *     {@link coverageClassSeverity} matrix (cross-class = advisory + a
 *     retire-the-weak-oracle signal; same-class = a loud contradiction).
 *
 * Each instantiated gate {@link requireIR}, so it runs ONLY on the host path (the
 * CLI builds + injects the IR); the lean MCP/command path does not run it.
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
import type { AssuranceLevel } from '../assurance.js';

/** The two oracle ids every divergence gate triangulates — the fixed pair. */
const AST_ORACLE = 'ts-ast';
const REGEX_ORACLE = 'invariant-regex';

/** The fixed coverage class each oracle carries (structural — never per-fact). */
const AST_CLASS: CoverageClass = 'file-proxy-only';
const REGEX_CLASS: CoverageClass = 'text-only';

/**
 * The per-property descriptor — the ONLY thing that varies between the three
 * divergence gates. Everything else (the fold, the grouping, the exclude-vs-miss
 * refinement, the self-proof fixtures) is shared by {@link makeOracleDivergenceGate}.
 */
export interface OracleDivergenceSpec {
  /** The gate id; namespaces every finding (traceability). */
  readonly gateId: string;
  /** The property both oracles observe (e.g. `is-default-export`, `var-declaration`). */
  readonly property: string;
  /**
   * The property a host oracle emits to record a POLICY EXCLUDE for this rule (the
   * exclude-vs-miss seam — e.g. `default-export-check-excluded`,
   * `var-check-excluded`). A file carrying this marker is a sanctioned exclude:
   * the regex's silence there is by design, not a coverage miss.
   */
  readonly excludedMarkerProperty: string;
  /** The assurance level the gate operates at. */
  readonly level: AssuranceLevel;
  /** A short human name for the thing checked (e.g. a default export, a legacy binding). */
  readonly subject: string;
  /** The one-line gate description. */
  readonly describe: string;
  /**
   * The prose explaining an AST-present/regex-absent divergence — the case the
   * AST caught a REAL form the comment-blind regex missed (per-rule, because the
   * forms differ: `export =` vs the keyword regex; a real `var` the regex's word
   * boundary missed, etc.).
   */
  readonly astSawWhy: string;
  /** The remediation step for the AST-present/regex-absent direction. */
  readonly astSawStep: string;
}

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
  readonly ast?: OracleObservation;
  readonly regex?: OracleObservation;
}

/**
 * Group the IR's `property` facts by `(file, line)`, recording which of the two
 * oracles observed each site. Computed entirely from the LIVE facts (the
 * head-probe LAW — never a hardcoded expectation).
 */
function groupBySite(facts: readonly Fact[], property: string): readonly SiteObservations[] {
  const byKey = new Map<
    string,
    { file: string; line: number | undefined; ast?: OracleObservation; regex?: OracleObservation }
  >();
  for (const fact of facts) {
    if (fact.property !== property) continue;
    const key = siteKey(fact.file, fact.line);
    const entry = byKey.get(key) ?? { file: fact.file, line: fact.line };
    const obs: OracleObservation = { oracleId: fact.oracleId, coverageClass: fact.coverageClass };
    if (fact.oracleId === AST_ORACLE) entry.ast = obs;
    else if (fact.oracleId === REGEX_ORACLE) entry.regex = obs;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
}

/**
 * The set of files the `invariant-regex` oracle was TOLD to exclude — read from
 * the LIVE marker facts (the exclude-vs-miss seam), NEVER a hardcoded path list
 * (the head-probe LAW). A file here is a sanctioned POLICY EXCLUDE: the regex's
 * silence is by design, so an AST-present/regex-absent site on it is NOT a
 * divergence.
 */
function policyExcludedFiles(facts: readonly Fact[], excludedMarkerProperty: string): ReadonlySet<string> {
  const excluded = new Set<string>();
  for (const fact of facts) {
    if (fact.property === excludedMarkerProperty && fact.oracleId === REGEX_ORACLE) excluded.add(fact.file);
  }
  return excluded;
}

/**
 * Build the self-explaining divergence finding for a site where exactly ONE
 * oracle observed the property. Names BOTH oracles, their values (present vs
 * absent), their coverage classes, and the location — the reader decides; the
 * engine picks no winner. Severity is calibrated from the coverage-class pair.
 */
function divergenceFinding(spec: OracleDivergenceSpec, site: SiteObservations): Finding {
  const present = site.ast ?? site.regex!;
  const absentOracle = site.ast !== undefined ? REGEX_ORACLE : AST_ORACLE;
  const absentClass: CoverageClass = absentOracle === AST_ORACLE ? AST_CLASS : REGEX_CLASS;
  const severity = coverageClassSeverity(present.coverageClass, absentClass);
  const carriedClass = strongerCoverageClass(present.coverageClass, absentClass);

  const loc = `${site.file}:${site.line ?? 0}`;
  const presentDesc = `\`${present.oracleId}\` (${present.coverageClass})`;
  const absentDesc = `\`${absentOracle}\` (${absentClass})`;
  const why =
    present.oracleId === REGEX_ORACLE
      ? 'the text-only oracle cannot tell comment from code, so it likely fired on a comment/string occurrence the AST oracle correctly ignores — this is the signal to RETIRE the text-only oracle in favour of the AST oracle'
      : spec.astSawWhy;

  return finding({
    ruleId: spec.gateId,
    severity,
    level: spec.level,
    title: `Oracle divergence on ${spec.property} at ${loc}`,
    detail: `${presentDesc} flags ${spec.property} at ${loc}; ${absentDesc} does not. ${why}. The engine picks no winner — the reader decides. (severity ${severity}: ${present.coverageClass === absentClass ? 'same-class contradiction' : 'cross-class coverage gap'}.)`,
    location: { file: site.file, ...(site.line !== undefined ? { line: site.line } : {}) },
    coverageClass: carriedClass,
    remediation: {
      kind: 'instruction',
      description: 'Resolve the oracle divergence — the engine reports, you decide.',
      steps: [
        `Open ${loc} and confirm whether it is a real ${spec.subject}.`,
        present.oracleId === REGEX_ORACLE
          ? `If the keyword is inside a comment/string (the regex false-positive), this divergence is the evidence to retire the text-only invariant-regex oracle in favour of the AST oracle — no source change needed.`
          : spec.astSawStep,
      ],
    },
  });
}

/**
 * The shared divergence fold — folds `ctx.ir.facts`, groups the `property` facts
 * by `(file, line)`, and reports each site where exactly one oracle fired UNLESS
 * the silence is a sanctioned policy exclude (read from a live marker fact). The
 * exclude only sanctions the AST-present/regex-absent direction; a regex that
 * FIRED on an excluded file is still a real anomaly.
 */
function foldDivergences(spec: OracleDivergenceSpec, context: GateContext): readonly Finding[] {
  const ir = requireIR(context, spec.gateId);
  const excluded = policyExcludedFiles(ir.facts, spec.excludedMarkerProperty);
  const findings: Finding[] = [];
  for (const site of groupBySite(ir.facts, spec.property)) {
    const astSaw = site.ast !== undefined;
    const regexSaw = site.regex !== undefined;
    if (astSaw === regexSaw) continue;
    if (astSaw && !regexSaw && excluded.has(site.file)) continue;
    findings.push(divergenceFinding(spec, site));
  }
  return findings;
}

/** A {@link GateContext} carrying ONLY an in-memory IR — for the fixtures. */
function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** A `(file, line)` `property` fact from `oracleId` with `coverageClass`. */
function propFact(
  spec: OracleDivergenceSpec,
  file: string,
  line: number,
  oracleId: string,
  coverageClass: CoverageClass,
): Fact {
  return { file, line, property: spec.property, value: true, oracleId, coverageClass };
}

/**
 * The host's POLICY-EXCLUDE marker fact for `file` — the live evidence the regex
 * oracle was TOLD to ignore this file (the exclude-vs-miss seam). A file-level
 * fact (line 1) under the rule's `excludedMarkerProperty`, emitted by the regex
 * oracle, its value naming the rule.
 */
function excludedMarker(spec: OracleDivergenceSpec, file: string, ruleName: string): Fact {
  return {
    file,
    line: 1,
    property: spec.excludedMarkerProperty,
    value: ruleName,
    oracleId: REGEX_ORACLE,
    coverageClass: REGEX_CLASS,
  };
}

/** A fixtures-only file id under `packages/x/src/`. */
const FIXTURE_FILE = 'packages/x/src/a.ts';
/** A fixtures-only EXCLUDED file id (a sanctioned policy exclude). */
const FIXTURE_EXCLUDED_FILE = 'packages/x/src/excluded.ts';
const PLACEHOLDER = 'placeholder:no-content-address';

/**
 * Build the shared red/green/mutation fixtures for an instance — the same
 * fixture SHAPE every divergence gate self-proves over (only the property/marker
 * vary). This is the fixture-builder the factory shares (B3.2 deliverable):
 *  - RED: the regex flags a line the AST does not (the comment-occurrence
 *    false-positive) → ≥1 divergence.
 *  - GREEN: an agreement site AND a sanctioned policy-excluded site (AST present,
 *    regex silent + a live marker says WHY) → 0 findings.
 *  - MUTATION: a mutant that ignores the policy-exclude marker re-flags the
 *    excluded site in green → green dirty → killed.
 */
function buildFixtures(spec: OracleDivergenceSpec) {
  const fixtureRuleName = spec.excludedMarkerProperty;
  return {
    red: {
      name: `an IR where invariant-regex flags a ${spec.subject} line the AST does not`,
      context: irContext(
        makeRepoIR({
          files: [{ id: FIXTURE_FILE, contentDigest: PLACEHOLDER, packageName: null }],
          facts: [propFact(spec, FIXTURE_FILE, 42, REGEX_ORACLE, REGEX_CLASS)],
        }),
      ),
    },
    green: {
      name: `an IR with an agreement site AND a sanctioned policy-excluded ${spec.subject} (neither is a divergence)`,
      context: irContext(
        makeRepoIR({
          files: [
            { id: FIXTURE_FILE, contentDigest: PLACEHOLDER, packageName: null },
            { id: FIXTURE_EXCLUDED_FILE, contentDigest: PLACEHOLDER, packageName: '@czap/x' },
          ],
          facts: [
            propFact(spec, FIXTURE_FILE, 7, AST_ORACLE, AST_CLASS),
            propFact(spec, FIXTURE_FILE, 7, REGEX_ORACLE, REGEX_CLASS),
            propFact(spec, FIXTURE_EXCLUDED_FILE, 3, AST_ORACLE, AST_CLASS),
            excludedMarker(spec, FIXTURE_EXCLUDED_FILE, fixtureRuleName),
          ],
        }),
      ),
    },
    mutation: {
      describe:
        'A mutant that ignores the policy-exclude marker re-flags the sanctioned policy-excluded site in the green fixture — green is then no longer clean and the mutant is killed.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          const ir = requireIR(context, spec.gateId);
          const findings: Finding[] = [];
          for (const site of groupBySite(ir.facts, spec.property)) {
            if ((site.ast !== undefined) !== (site.regex !== undefined)) findings.push(divergenceFinding(spec, site));
          }
          return findings;
        },
      }),
    },
  };
}

/**
 * Make a triangulated oracle-divergence {@link Gate} for one `spec` — the
 * parametric factory the three LiteShip divergence gates share. The fold, the
 * exclude-vs-miss refinement, and the self-proving red/green/mutation fixtures are
 * shared; the spec supplies only the property, the marker property, and the prose.
 */
export function makeOracleDivergenceGate(spec: OracleDivergenceSpec): Gate {
  return defineGate({
    id: spec.gateId,
    level: spec.level,
    describe: spec.describe,
    run: (context: GateContext) => foldDivergences(spec, context),
    fixtures: buildFixtures(spec),
  });
}
