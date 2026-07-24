/**
 * Gate: facade export budget — the `liteship` package ROOT (`.` entry) is a
 * CURATED, BUDGETED authoring surface, not the umbrella's whole-fleet re-export.
 *
 * It is a pure fold over two files read through the {@link GateContext}:
 *  1. `packages/liteship/src/export-budget.ts` — the reviewed ALLOWLIST as DATA:
 *     the `ROOT_VALUE_BUDGET` / `ROOT_TYPE_BUDGET` string arrays (the EXACT set,
 *     post-ADR-0051: no reserved-but-absent slots remain).
 *  2. `packages/liteship/dist/index.d.ts` — the BUILT root declaration surface,
 *     whose value + type exports are the reality being judged.
 *
 * The gate asserts the EXACT-MATCH law (per kind), BOTH DIRECTIONS: every VALUE
 * export the root ships is listed in `ROOT_VALUE_BUDGET` AND every listed value is
 * actually exported; likewise for `ROOT_TYPE_BUDGET`. So an UNLISTED export reds
 * (the surface sprouted a symbol) AND a DROPPED export reds (the surface lost a
 * reviewed symbol — a silent public-contract regression the old SUBSET direction
 * was blind to). It also asserts the two hard CAPS ({@link VALUE_CAP} /
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
const FACADE_MANIFEST_FILE = 'packages/liteship/package.json';

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

/** The parsed role-bearing contract projected to permitted value + type names. */
interface Budget {
  readonly values: ReadonlySet<string>;
  readonly types: ReadonlySet<string>;
}

interface BudgetParseResult {
  readonly budget?: Budget;
  readonly error?: string;
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

/** Prove one symbol is named-re-exported from the exact semantic owner. */
function directlyReExports(source: string, owner: string, symbol: string): boolean {
  const clean = stripComments(source);
  const clause = /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+(['"])([^'"]+)\2/g;
  for (let match = clause.exec(clean); match !== null; match = clause.exec(clean)) {
    if (match[3] !== owner) continue;
    const names = namesFromClause(match[1] ?? '');
    if ([...names.values, ...names.types].includes(symbol)) return true;
  }
  return false;
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

const CONTRACT_KEYS = [
  'name',
  'kind',
  'role',
  'owner',
  'userStory',
  'lifecycle',
  'failureContract',
  'example',
  'stability',
] as const;

const SUBPATH_KEYS = [
  'subpath',
  'specifier',
  'owner',
  'role',
  'userStory',
  'dependencyCost',
  'packedProof',
  'lifecycle',
  'failureContract',
  'example',
  'stability',
  'symbol',
  'reason',
] as const;

interface SubpathContractEntry {
  readonly subpath: string;
  readonly specifier: string;
  readonly owner: string;
  readonly symbol: string;
}

function embeddedJson(source: string, constName: string): { readonly value?: unknown; readonly error?: string } {
  const anchor = new RegExp('export\\s+const\\s+' + constName + '\\s*=\\s*`').exec(source);
  if (anchor === null) return { error: `${constName} is missing` };
  const start = anchor.index + anchor[0].length;
  const end = source.indexOf('`', start);
  if (end < 0) return { error: `${constName} is unterminated` };
  try {
    return { value: JSON.parse(source.slice(start, end)) as unknown };
  } catch (error) {
    return { error: `${constName} is not valid JSON: ${String(error)}` };
  }
}

/** Parse the embedded JSON contract without evaluating package code or importing TypeScript. */
function parseBudget(source: string): BudgetParseResult {
  const embedded = embeddedJson(source, 'ROOT_EXPORT_CONTRACT_SOURCE');
  if (embedded.value === undefined) return { error: embedded.error };
  const parsed = embedded.value;
  if (!Array.isArray(parsed) || parsed.length === 0) return { error: 'root export contract must be non-empty' };
  const values = new Set<string>();
  const types = new Set<string>();
  const identities = new Set<string>();
  const expectedKeys = [...CONTRACT_KEYS].sort().join('\u0000');
  for (let index = 0; index < parsed.length; index += 1) {
    const entry = parsed[index];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { error: `root export contract entry ${index} is not an object` };
    }
    const record = entry as Record<string, unknown>;
    if (
      Object.keys(record).sort().join('\u0000') !== expectedKeys ||
      CONTRACT_KEYS.some((key) => typeof record[key] !== 'string' || String(record[key]).trim().length === 0)
    ) {
      return { error: `root export contract entry ${index} does not have the exact required string fields` };
    }
    if (record['kind'] !== 'value' && record['kind'] !== 'type') {
      return { error: `root export contract entry ${index} has an invalid kind` };
    }
    if (record['role'] !== 'authoring' && record['role'] !== 'inspection') {
      return { error: `root export contract entry ${index} has an ineligible root role` };
    }
    if (record['stability'] !== 'stable' && record['stability'] !== 'experimental') {
      return { error: `root export contract entry ${index} has invalid stability` };
    }
    const name = String(record['name']);
    const identity = `${record['kind']}:${name}`;
    if (identities.has(identity)) return { error: `root export contract duplicates ${identity}` };
    identities.add(identity);
    (record['kind'] === 'value' ? values : types).add(name);
  }
  return { budget: { values, types } };
}

function parseSubpathContract(source: string): {
  readonly entries?: readonly SubpathContractEntry[];
  readonly error?: string;
} {
  const embedded = embeddedJson(source, 'FACADE_SUBPATH_CONTRACT_SOURCE');
  if (embedded.value === undefined) return { error: embedded.error };
  if (!Array.isArray(embedded.value) || embedded.value.length === 0) {
    return { error: 'facade subpath contract must be non-empty' };
  }
  const expectedKeys = [...SUBPATH_KEYS].sort().join('\u0000');
  const seen = new Set<string>();
  const entries: SubpathContractEntry[] = [];
  for (let index = 0; index < embedded.value.length; index += 1) {
    const entry = embedded.value[index];
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { error: `facade subpath contract entry ${index} is not an object` };
    }
    const record = entry as Record<string, unknown>;
    if (
      Object.keys(record).sort().join('\u0000') !== expectedKeys ||
      SUBPATH_KEYS.some((key) => typeof record[key] !== 'string' || String(record[key]).trim().length === 0)
    ) {
      return { error: `facade subpath contract entry ${index} does not have the exact required string fields` };
    }
    const subpath = String(record['subpath']);
    const specifier = String(record['specifier']);
    const owner = String(record['owner']);
    if (
      !/^\.\/[a-z0-9][a-z0-9-]*$/.test(subpath) ||
      specifier !== `liteship/${subpath.slice(2)}` ||
      !/^@liteship\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)?$/.test(owner) ||
      (record['stability'] !== 'stable' && record['stability'] !== 'experimental')
    ) {
      return {
        error:
          `facade subpath contract entry ${index} has invalid identity, owner, or stability ` +
          `(subpath=${JSON.stringify(subpath)}, specifier=${JSON.stringify(specifier)}, ` +
          `owner=${JSON.stringify(owner)}, stability=${JSON.stringify(record['stability'])})`,
      };
    }
    if (seen.has(subpath)) return { error: `facade subpath contract duplicates ${subpath}` };
    seen.add(subpath);
    entries.push({ subpath, specifier, owner, symbol: String(record['symbol']) });
  }
  return { entries };
}

function invalidContractFinding(detail: string): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: 'Root export contract is malformed or role-ineligible',
    detail: `${BUDGET_FILE} cannot authorize the public root: ${detail}. The root contract must be exact data and every entry must serve default authoring or inspection.`,
    location: { file: BUDGET_FILE, line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'Repair the role-bearing root contract; do not fall back to an untyped name allowlist.',
      steps: ['Restore every required field and move advanced runtime/tooling entries to an expert subpath.'],
    },
  });
}

function invalidSubpathFinding(detail: string, file = BUDGET_FILE): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: 'Facade subpath is ungoverned or malformed',
    detail,
    location: { file, line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'Make the package export map, role-bearing subpath contract, and direct owner facade agree exactly.',
      steps: ['Remove the ungoverned subpath or add its complete contract and direct owner re-export.'],
    },
  });
}

function scanSubpaths(context: GateContext, source: string): readonly Finding[] {
  const manifestSource = context.readFile(FACADE_MANIFEST_FILE);
  if (manifestSource === undefined) return [];
  const parsed = parseSubpathContract(source);
  if (parsed.entries === undefined) {
    return [invalidSubpathFinding(parsed.error ?? 'facade subpath contract is invalid')];
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestSource) as unknown;
  } catch (error) {
    return [invalidSubpathFinding(`Facade manifest is not valid JSON: ${String(error)}`, FACADE_MANIFEST_FILE)];
  }
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) {
    return [invalidSubpathFinding('Facade manifest is not an object', FACADE_MANIFEST_FILE)];
  }
  const exportsValue = (manifest as Record<string, unknown>)['exports'];
  if (typeof exportsValue !== 'object' || exportsValue === null || Array.isArray(exportsValue)) {
    return [invalidSubpathFinding('Facade manifest has no exports object', FACADE_MANIFEST_FILE)];
  }
  const manifestSubpaths = Object.keys(exportsValue as Record<string, unknown>)
    .filter((key) => key !== '.')
    .sort();
  const contractSubpaths = parsed.entries.map((entry) => entry.subpath).sort();
  if (manifestSubpaths.join('\u0000') !== contractSubpaths.join('\u0000')) {
    return [
      invalidSubpathFinding(
        `Facade manifest subpaths [${manifestSubpaths.join(', ')}] do not exactly equal the governed contract [${contractSubpaths.join(', ')}].`,
        FACADE_MANIFEST_FILE,
      ),
    ];
  }
  const findings: Finding[] = [];
  for (const entry of parsed.entries) {
    const facadeFile = `packages/liteship/src/${entry.subpath.slice(2)}.ts`;
    const facadeSource = context.readFile(facadeFile);
    if (facadeSource === undefined) {
      findings.push(invalidSubpathFinding(`${entry.subpath} has no facade source file.`, facadeFile));
      continue;
    }
    if (!directlyReExports(facadeSource, entry.owner, entry.symbol)) {
      findings.push(
        invalidSubpathFinding(
          `${entry.subpath} does not directly re-export its proving symbol ${entry.symbol} from ${entry.owner}.`,
          facadeFile,
        ),
      );
    }
  }
  return findings;
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

function missingFinding(kind: 'value' | 'type', name: string): Finding {
  const budgetConst = kind === 'value' ? 'ROOT_VALUE_BUDGET' : 'ROOT_TYPE_BUDGET';
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: 'Reviewed root export dropped from the facade',
    detail: `${BUDGET_FILE}'s ${budgetConst} lists the ${kind} \`${name}\`, but the \`liteship\` root ("." entry) no longer exports it. The budget is an EXACT allowlist — a listed symbol MUST be exported — so a silently DROPPED public export (a broken downstream contract) reds here, the class of slip the old SUBSET direction was blind to.`,
    location: { file: ROOT_DTS_FILE, line: 1 },
    remediation: {
      kind: 'instruction',
      description: `Either restore the \`${name}\` export on the root facade, or (if it was deliberately removed) drop it from ${budgetConst} in ${BUDGET_FILE} as a reviewed budget edit.`,
      steps: [
        `If \`${name}\` was dropped by accident, re-add its re-export to packages/liteship/src/index.ts.`,
        `If \`${name}\` was deliberately retired from the curated root, remove it from ${budgetConst} in ${BUDGET_FILE} — a reviewed budget edit, not an accidental one.`,
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
 * EXACT-MATCH law (BOTH directions) and the two caps. Absent evidence (an unbuilt
 * `dist` or a missing budget file) folds EMPTY — the gate cannot judge a surface it
 * cannot read.
 */
function scan(context: GateContext): readonly Finding[] {
  const budgetSource = context.readFile(BUDGET_FILE);
  const dts = context.readFile(ROOT_DTS_FILE);
  if (budgetSource === undefined || dts === undefined) return [];

  const parsedBudget = parseBudget(budgetSource);
  if (parsedBudget.budget === undefined)
    return [invalidContractFinding(parsedBudget.error ?? 'unknown contract error')];
  const budget = parsedBudget.budget;

  const surface = parseRootSurface(dts);
  const surfaceValues = new Set(surface.values);
  const surfaceTypes = new Set(surface.types);
  const findings: Finding[] = [];

  // Direction 1 — every EXPORTED symbol must be listed (the surface cannot sprawl).
  for (const name of surface.values) {
    if (!budget.values.has(name)) findings.push(unlistedFinding('value', name));
  }
  for (const name of surface.types) {
    if (!budget.types.has(name)) findings.push(unlistedFinding('type', name));
  }
  // Direction 2 — every LISTED symbol must be exported (a dropped export reds).
  for (const name of budget.values) {
    if (!surfaceValues.has(name)) findings.push(missingFinding('value', name));
  }
  for (const name of budget.types) {
    if (!surfaceTypes.has(name)) findings.push(missingFinding('type', name));
  }
  if (surface.values.length > VALUE_CAP) findings.push(overCapFinding('value', surface.values.length, VALUE_CAP));
  if (surface.types.length > TYPE_CAP) findings.push(overCapFinding('type', surface.types.length, TYPE_CAP));

  findings.push(...scanSubpaths(context, budgetSource));

  return findings;
}

// ── Fixtures (synthetic allowlist + built root surface — a listed green, an unlisted red) ──

const contractEntry = (name: string, kind: 'value' | 'type') => ({
  name,
  kind,
  role: 'authoring',
  owner: '@liteship/core',
  userStory: `Use ${name}.`,
  lifecycle: kind === 'value' ? 'pure' : 'compile-time-only',
  failureContract: `${name} fails explicitly.`,
  example: name,
  stability: 'stable',
});

/** A minimal role-bearing root contract the fixtures judge against. */
const fixtureSubpath = {
  subpath: './schema',
  specifier: 'liteship/schema',
  owner: '@liteship/core',
  role: 'schema',
  userStory: 'Author a schema.',
  dependencyCost: 'pure core',
  packedProof: 'check/hermetic:runtime-import+node16+bundler',
  lifecycle: 'immutable',
  failureContract: 'Invalid data is refused.',
  example: 'schema.string()',
  stability: 'stable',
  symbol: 'schema',
  reason: 'Schema is an expert domain.',
};
const FIXTURE_BUDGET =
  `export const ROOT_EXPORT_CONTRACT_SOURCE = \`${JSON.stringify([
    contractEntry('alpha', 'value'),
    contractEntry('beta', 'value'),
    contractEntry('Gamma', 'type'),
    contractEntry('Delta', 'type'),
  ])}\`;\n` + `export const FACADE_SUBPATH_CONTRACT_SOURCE = \`${JSON.stringify([fixtureSubpath])}\`;`;

/** A GREEN world: the root exports EXACTLY the allowlist (both directions), under cap. */
const GREEN_CONTEXT = memoryContext({
  [BUDGET_FILE]: FIXTURE_BUDGET,
  [ROOT_DTS_FILE]:
    "export { alpha } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\nexport declare const beta: number;\n",
  [FACADE_MANIFEST_FILE]: JSON.stringify({ exports: { '.': {}, './schema': {} } }),
  'packages/liteship/src/schema.ts': "export { schema } from '@liteship/core';\n",
});

/**
 * A RED world exercising BOTH exact-match directions at once: the root exports an
 * UNLISTED value (`zeta`, in neither budget list) AND has DROPPED the listed value
 * `beta`. Under the exact-match law both red — the sprawl direction and the
 * regression direction the old SUBSET gate was blind to.
 */
const RED_CONTEXT = memoryContext({
  [BUDGET_FILE]: FIXTURE_BUDGET,
  [ROOT_DTS_FILE]:
    "export { alpha, zeta } from '@liteship/core';\nexport type { Gamma, Delta } from '@liteship/core';\n",
  [FACADE_MANIFEST_FILE]: JSON.stringify({ exports: { '.': {}, './schema': {}, './rogue': {} } }),
  'packages/liteship/src/schema.ts': "export { schema } from '@liteship/core';\n",
});

/**
 * The facade-export-budget gate — the curated-root guardrail. Self-proves via a
 * synthetic allowlist + built surface: an unlisted export OR a dropped export reds
 * (the exact-match law, both directions); a surface that matches the allowlist
 * exactly and under cap passes.
 */
export const facadeExportBudgetGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'Asserts that the liteship root exactly equals its role-bearing authoring/inspection contract, both numeric caps hold, and every exported expert subpath has a complete ownership and packed-proof contract backed by a direct owner facade.',
  run: scan,
  fixtures: {
    red: {
      name: "the root drifts and the manifest admits an ungoverned './rogue' subpath",
      context: RED_CONTEXT,
    },
    green: {
      name: 'the root value/type export set equals the allowlist exactly, both kinds under the cap',
      context: GREEN_CONTEXT,
    },
    mutation: {
      describe:
        'A mutant that flags nothing (folds an empty finding list) leaves the red fixture’s unlisted `zeta` and dropped `beta` unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
