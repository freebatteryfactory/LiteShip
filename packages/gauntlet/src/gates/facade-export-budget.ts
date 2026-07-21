/**
 * Gate: facade export budget — the `liteship` package ROOT (`.` entry) is a
 * CURATED, BUDGETED authoring surface, not the umbrella's whole-fleet re-export.
 *
 * It is a pure fold over two files read through the {@link GateContext}:
 *  1. `packages/liteship/src/export-budget.ts` — the reviewed ALLOWLIST as DATA:
 *     the `ROOT_VALUE_BUDGET` / `ROOT_TYPE_BUDGET` string arrays (a SUPERSET that
 *     carries a few reserved-but-absent slots).
 *  2. `packages/liteship/dist/index.d.ts` — the BUILT root declaration surface,
 *     whose value + type exports are the reality being judged.
 *
 * The gate asserts the SUBSET law (per kind): every VALUE export the root ships is
 * listed in `ROOT_VALUE_BUDGET`, every TYPE export in `ROOT_TYPE_BUDGET` — so a
 * reserved-but-absent slot is legal (a listed symbol need not be exported) but an
 * UNLISTED export reds. It also asserts the two hard CAPS ({@link VALUE_CAP} /
 * {@link TYPE_CAP}): at most 30 value exports and 30 type exports, so the curated
 * surface cannot sprawl even while staying nominally "listed".
 *
 * READS-DIST, LEAN-ONLY: the judged evidence is the BUILT `dist/index.d.ts`, so
 * the gate is inert until `liteship` is built (an unbuilt tree folds empty rather
 * than red — the same absent-evidence discretion the fact gates use). It rides the
 * lean {@link LITESHIP_GATES} set ONLY (never the cached IR-host set): its dist read
 * is out-of-IR, but the lean path is cache-free, so there is no stale-verdict
 * hazard and thus no `evidenceDigest` obligation. The allowlist file it also reads
 * is package source, inside the IR coverage-digest domain.
 *
 * It ships red / green / mutation fixtures, so it self-proves.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';

/** The `liteship` root allowlist source — the reviewed budget DATA. */
const BUDGET_FILE = 'packages/liteship/src/export-budget.ts';

/** The `liteship` root BUILT declaration surface — the judged reality. */
const ROOT_DTS_FILE = 'packages/liteship/dist/index.d.ts';

const RULE_ID = 'gauntlet/facade-export-budget';

/** The hard cap on VALUE exports the root `.` entry may carry. */
const VALUE_CAP = 30;

/** The hard cap on TYPE exports the root `.` entry may carry. */
const TYPE_CAP = 30;

/** The parsed root export surface: the value + type export name sets. */
interface RootSurface {
  readonly values: readonly string[];
  readonly types: readonly string[];
}

/** The parsed allowlist: the permitted value + type name sets. */
interface Budget {
  readonly values: ReadonlySet<string>;
  readonly types: ReadonlySet<string>;
}

/**
 * Strip block + line comments so a keyword inside a JSDoc block (the d.ts is
 * heavily commented) is never mistaken for an export statement. Strings are left
 * intact — export specifiers carry no string literals we scan for.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Extract the exported names from a `{ ... }` clause body, returning them split by
 * kind. An entry prefixed `type ` is a TYPE export; `X as Y` exports the alias `Y`.
 * Empty / whitespace entries (a trailing comma) are dropped.
 */
function namesFromClause(body: string): { readonly values: string[]; readonly types: string[] } {
  const values: string[] = [];
  const types: string[] = [];
  for (const raw of body.split(',')) {
    const entry = raw.trim();
    if (entry.length === 0) continue;
    const isType = /^type\s+/.test(entry);
    const spec = entry.replace(/^type\s+/, '').trim();
    // `X as Y` → the EXPORTED name is `Y`; a bare `X` exports `X`.
    const asMatch = /\bas\s+([A-Za-z_$][\w$]*)\s*$/.exec(spec);
    const name = asMatch ? asMatch[1] : spec;
    if (name === undefined || name.length === 0) continue;
    (isType ? types : values).push(name);
  }
  return { values, types };
}

/**
 * Parse a built `.d.ts` root surface into its value + type export name sets.
 * Handles every shape tsc emits for a facade + local-data root:
 *  - `export { A, B } from '…'`          → values (unless an entry is `type X`)
 *  - `export type { X, Y } from '…'`     → types
 *  - `export { A } ;` / `export type { X } ;` (re-export composition, no `from`)
 *  - `export declare const|function|class|enum|namespace NAME` → value
 *  - `export type NAME =` / `export interface NAME`            → type
 */
function parseRootSurface(dts: string): RootSurface {
  const src = stripComments(dts);
  const values = new Set<string>();
  const types = new Set<string>();

  // `export [type] { … } [from '…']` — the brace clause forms.
  const clauseRe = /export\s+(type\s+)?\{([^}]*)\}/g;
  for (let m = clauseRe.exec(src); m !== null; m = clauseRe.exec(src)) {
    const typeClause = m[1] !== undefined;
    const parsed = namesFromClause(m[2] ?? '');
    if (typeClause) {
      for (const n of [...parsed.values, ...parsed.types]) types.add(n);
    } else {
      for (const n of parsed.values) values.add(n);
      for (const n of parsed.types) types.add(n);
    }
  }

  // `export declare const|function|class|abstract class|enum|namespace NAME` — local values.
  const valueDeclRe =
    /export\s+declare\s+(?:const|let|var|function|(?:abstract\s+)?class|enum|namespace)\s+([A-Za-z_$][\w$]*)/g;
  for (let m = valueDeclRe.exec(src); m !== null; m = valueDeclRe.exec(src)) {
    if (m[1] !== undefined) values.add(m[1]);
  }

  // `export type NAME =` / `export interface NAME` — local types (NOT the `type {` clause,
  // which the brace form above already consumed; the `[A-Za-z_$]` after `type ` excludes `{`).
  const typeDeclRe = /export\s+(?:type\s+([A-Za-z_$][\w$]*)\s*[=<]|interface\s+([A-Za-z_$][\w$]*))/g;
  for (let m = typeDeclRe.exec(src); m !== null; m = typeDeclRe.exec(src)) {
    const name = m[1] ?? m[2];
    if (name !== undefined) types.add(name);
  }

  return { values: [...values], types: [...types] };
}

/**
 * Extract a `readonly`-array string-literal allowlist from the budget source: the
 * quoted entries between `export const <NAME> = [` and its closing `]`. A source
 * parse (not a TypeScript import) so the gate stays lean + fixture-drivable.
 */
function parseBudgetList(source: string, constName: string): readonly string[] {
  const anchor = new RegExp(`export\\s+const\\s+${constName}\\s*=\\s*\\[`).exec(source);
  if (anchor === null) return [];
  const start = anchor.index + anchor[0].length;
  const end = source.indexOf(']', start);
  if (end === -1) return [];
  const body = source.slice(start, end);
  const names: string[] = [];
  const litRe = /['"]([^'"]+)['"]/g;
  for (let m = litRe.exec(body); m !== null; m = litRe.exec(body)) {
    if (m[1] !== undefined) names.push(m[1]);
  }
  return names;
}

/** Parse the budget allowlist source into its value + type permitted sets. */
function parseBudget(source: string): Budget {
  return {
    values: new Set(parseBudgetList(source, 'ROOT_VALUE_BUDGET')),
    types: new Set(parseBudgetList(source, 'ROOT_TYPE_BUDGET')),
  };
}

function unlistedFinding(kind: 'value' | 'type', name: string): Finding {
  const budgetConst = kind === 'value' ? 'ROOT_VALUE_BUDGET' : 'ROOT_TYPE_BUDGET';
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: 'Root export outside the facade budget',
    detail: `The \`liteship\` root ("." entry) exports the ${kind} \`${name}\`, which is not listed in ${BUDGET_FILE}'s ${budgetConst}. The root is a CURATED authoring surface — every symbol it ships must be an allowlisted, reviewed entry, so the umbrella cannot silently sprawl back into a whole-fleet re-export.`,
    location: { file: ROOT_DTS_FILE, line: 1 },
    remediation: {
      kind: 'instruction',
      description: `Either drop the \`${name}\` export from the root facade, or (if it genuinely belongs on the curated root) add it to ${budgetConst} in ${BUDGET_FILE} as a reviewed allowlist entry.`,
      steps: [
        `If \`${name}\` belongs on a domain subpath instead (liteship/schema, liteship/reactive, …), move the re-export there and remove it from packages/liteship/src/index.ts.`,
        `If \`${name}\` genuinely belongs on the curated root, add it to ${budgetConst} in ${BUDGET_FILE} — a reviewed budget edit, not an accidental one.`,
      ],
    },
  });
}

function overCapFinding(kind: 'value' | 'type', count: number, cap: number): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: 'Root export budget cap exceeded',
    detail: `The \`liteship\` root ("." entry) ships ${count} ${kind} exports, over the hard cap of ${cap}. The curated root must stay small even while every symbol is nominally listed — a surface that grows past the cap is no longer a facade.`,
    location: { file: ROOT_DTS_FILE, line: 1 },
    remediation: {
      kind: 'instruction',
      description: `Move some ${kind} exports off the root onto a domain subpath so the root stays within its ${cap}-symbol budget.`,
      steps: [
        `Re-home the least-central ${kind} root exports onto liteship/<domain> subpaths until the root is at or under ${cap}.`,
      ],
    },
  });
}

/**
 * The fold: read the allowlist + the built root surface, then assert the per-kind
 * SUBSET law and the two caps. Absent evidence (an unbuilt `dist` or a missing
 * budget file) folds EMPTY — the gate cannot judge a surface it cannot read.
 */
function scan(context: GateContext): readonly Finding[] {
  const budgetSource = context.readFile(BUDGET_FILE);
  const dts = context.readFile(ROOT_DTS_FILE);
  if (budgetSource === undefined || dts === undefined) return [];

  const budget = parseBudget(budgetSource);
  // An empty allowlist means the budget file was unreadable/malformed — do not judge
  // (folding every export as unlisted would be a false red, not a real budget breach).
  if (budget.values.size === 0 && budget.types.size === 0) return [];

  const surface = parseRootSurface(dts);
  const findings: Finding[] = [];

  for (const name of surface.values) {
    if (!budget.values.has(name)) findings.push(unlistedFinding('value', name));
  }
  for (const name of surface.types) {
    if (!budget.types.has(name)) findings.push(unlistedFinding('type', name));
  }
  if (surface.values.length > VALUE_CAP) findings.push(overCapFinding('value', surface.values.length, VALUE_CAP));
  if (surface.types.length > TYPE_CAP) findings.push(overCapFinding('type', surface.types.length, TYPE_CAP));

  return findings;
}

// ── Fixtures (synthetic allowlist + built root surface — a listed green, an unlisted red) ──

/** A minimal budget allowlist the fixtures judge against. */
const FIXTURE_BUDGET =
  "export const ROOT_VALUE_BUDGET = [\n  'alpha',\n  'beta',\n] as const;\n" +
  "export const ROOT_TYPE_BUDGET = [\n  'Gamma',\n  'Delta',\n] as const;\n";

/** A GREEN world: every root export is a listed allowlist entry, both under cap. */
const GREEN_CONTEXT = memoryContext({
  [BUDGET_FILE]: FIXTURE_BUDGET,
  [ROOT_DTS_FILE]:
    "export { alpha } from '@liteship/core';\nexport type { Gamma } from '@liteship/core';\nexport declare const beta: number;\n",
});

/** A RED world: the root exports an UNLISTED value (`zeta` is in neither budget list). */
const RED_CONTEXT = memoryContext({
  [BUDGET_FILE]: FIXTURE_BUDGET,
  [ROOT_DTS_FILE]: "export { alpha, zeta } from '@liteship/core';\nexport type { Gamma } from '@liteship/core';\n",
});

/**
 * The facade-export-budget gate — the curated-root guardrail. Self-proves via a
 * synthetic allowlist + built surface (an unlisted export reds; a fully-listed
 * surface under cap passes).
 */
export const facadeExportBudgetGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    "Reads packages/liteship/dist/index.d.ts and asserts every root value/type export is listed in packages/liteship/src/export-budget.ts's ROOT_VALUE_BUDGET / ROOT_TYPE_BUDGET (the SUBSET law) and that neither kind exceeds 30 — the curated-facade guardrail that keeps the liteship root from sprawling back into a whole-fleet re-export.",
  run: scan,
  fixtures: {
    red: {
      name: "the root d.ts exports the unlisted value 'zeta' (in neither budget list)",
      context: RED_CONTEXT,
    },
    green: {
      name: 'every root value/type export is a listed allowlist entry, both kinds under the cap',
      context: GREEN_CONTEXT,
    },
    mutation: {
      describe:
        'A mutant that flags nothing (folds an empty finding list) leaves the red fixture’s unlisted `zeta` unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
