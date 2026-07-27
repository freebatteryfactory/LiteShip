/**
 * Deterministic catalog-backed feature-edge census.
 *
 * Runtime packages keep ownership of their protocol/registry rows. The host
 * projects those canonical rows into this generic relation builder; audit does
 * not name LiteShip packages or invent a second catalog. A producer for an
 * undeclared subject, a duplicate declaration/site, or a family mismatch is a
 * malformed census and fails before the gauntlet sees a misleading green.
 *
 * @module
 */

import { CanonicalCbor, sha256Hex } from '@liteship/canonical';
import { ValidationError } from '@liteship/error';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FEATURE_EDGE_ENUMERATORS,
  FEATURE_EDGE_FAMILIES,
  type FeatureEdgeFacts,
  type FeatureEdgeFamily,
  type FeatureEdgeFamilyFacts,
  type FeatureEdgeMechanism,
  type FeatureEdgeObservation,
  type OpaqueFeatureEdgeSite,
} from '@liteship/gauntlet';
import ts from 'typescript';

/** One statically enumerated switch case and its source line. */
export interface SwitchSubject {
  readonly subject: string;
  readonly line: number;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
  return current;
}

/** Enumerate literal/catalog-aliased cases from one named function's switch. */
export function enumerateSwitchSubjects(
  repoRoot: string,
  file: string,
  functionName: string,
): readonly SwitchSubject[] {
  const absolute = resolve(repoRoot, file);
  const source = ts.createSourceFile(
    absolute,
    readFileSync(absolute, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const constantObjects = new Map<string, Readonly<Record<string, string>>>();
  const constantStrings = new Map<string, string>();
  const declarations: readonly ts.VariableDeclaration[] = source.statements.flatMap((statement) =>
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [],
  );
  for (const declaration of declarations) {
    if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
    const initializer = unwrapExpression(declaration.initializer);
    if (!ts.isObjectLiteralExpression(initializer)) continue;
    const values: Record<string, string> = {};
    let valid = true;
    for (const property of initializer.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
        valid = false;
        break;
      }
      const value = unwrapExpression(property.initializer);
      if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) {
        valid = false;
        break;
      }
      values[property.name.text] = value.text;
    }
    if (valid) constantObjects.set(declaration.name.text, values);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        declaration.initializer === undefined ||
        constantStrings.has(declaration.name.text)
      )
        continue;
      const initializer = unwrapExpression(declaration.initializer);
      const value =
        ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)
          ? initializer.text
          : ts.isIdentifier(initializer)
            ? constantStrings.get(initializer.text)
            : ts.isPropertyAccessExpression(initializer) && ts.isIdentifier(initializer.expression)
              ? constantObjects.get(initializer.expression.text)?.[initializer.name.text]
              : undefined;
      if (value !== undefined) {
        constantStrings.set(declaration.name.text, value);
        changed = true;
      }
    }
  }

  let target: ts.FunctionDeclaration | undefined;
  const findTarget = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) target = node;
    ts.forEachChild(node, findTarget);
  };
  findTarget(source);
  if (target === undefined)
    throw ValidationError('feature-edge.switch-census', `${file} does not declare function ${functionName}`);
  const subjects: SwitchSubject[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCaseClause(node)) {
      const expression = unwrapExpression(node.expression);
      const subject =
        ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
          ? expression.text
          : ts.isIdentifier(expression)
            ? constantStrings.get(expression.text)
            : ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)
              ? constantObjects.get(expression.expression.text)?.[expression.name.text]
              : undefined;
      if (subject !== undefined) {
        subjects.push({ subject, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(target);
  const duplicate = subjects.find(
    (row, index) => subjects.findIndex((candidate) => candidate.subject === row.subject) !== index,
  );
  if (duplicate !== undefined)
    throw ValidationError(
      'feature-edge.switch-census',
      `${file}::${functionName} repeats switch subject ${duplicate.subject}`,
    );
  return subjects.sort((left, right) => left.subject.localeCompare(right.subject));
}

/** One catalog-backed producer or consumer site for a governed subject. */
export interface CatalogFeatureEdgeSite {
  readonly subject: string;
  readonly mechanism: FeatureEdgeMechanism;
  readonly file: string;
  readonly line: number;
}

/** Complete owner catalogs and executable sites for one feature-edge family. */
export interface CatalogFeatureEdgeOptions {
  readonly family: Exclude<FeatureEdgeFamily, 'ecs-component'>;
  /** Canonical owner rows. Every row is a consumer claim that needs a producer. */
  readonly declarations: readonly CatalogFeatureEdgeSite[];
  /** Actual handlers/providers/readers/compilers behind the declared rows. */
  readonly producers: readonly CatalogFeatureEdgeSite[];
  /** Additional real lookup/advertisement sites governed by the same declarations. */
  readonly consumers?: readonly CatalogFeatureEdgeSite[];
  /** Dynamic sites are explicit unknown coverage, never silently omitted. */
  readonly opaqueSites?: readonly Omit<OpaqueFeatureEdgeSite, 'family'>[];
  /** Optional canonical owner images included in the integrity receipt. */
  readonly sourceImage?: readonly { readonly owner: string; readonly value: unknown }[];
}

function validateSite(site: CatalogFeatureEdgeSite, label: string): void {
  if (site.subject.trim() === '') throw ValidationError('feature-edge.catalog', `${label} subject must be non-empty`);
  if (site.file.trim() === '') throw ValidationError('feature-edge.catalog', `${label} file must be non-empty`);
  if (!Number.isInteger(site.line) || site.line < 1)
    throw ValidationError('feature-edge.catalog', `${label} line must be a positive integer`);
}

/** Build one immutable catalog-backed family receipt. */
export function buildCatalogFeatureEdgeFamily(options: CatalogFeatureEdgeOptions): FeatureEdgeFamilyFacts {
  const declared = new Set<string>();
  for (const [index, site] of options.declarations.entries()) {
    validateSite(site, `${options.family}.declarations[${index}]`);
    if (declared.has(site.subject)) {
      throw ValidationError('feature-edge.catalog', `${options.family} declares duplicate subject "${site.subject}"`);
    }
    declared.add(site.subject);
  }

  const observations: FeatureEdgeObservation[] = [];
  const append = (site: CatalogFeatureEdgeSite, role: 'consumer' | 'producer', label: string): void => {
    validateSite(site, label);
    if (!declared.has(site.subject)) {
      throw ValidationError(
        'feature-edge.catalog',
        `${options.family} ${role} names undeclared subject "${site.subject}"`,
      );
    }
    observations.push({ family: options.family, ...site, role });
  };
  for (const [index, site] of options.declarations.entries())
    append(site, 'consumer', `${options.family}.declarations[${index}]`);
  for (const [index, site] of (options.consumers ?? []).entries())
    append(site, 'consumer', `${options.family}.consumers[${index}]`);
  for (const [index, site] of options.producers.entries())
    append(site, 'producer', `${options.family}.producers[${index}]`);

  const opaqueSites = (options.opaqueSites ?? []).map((site, index) => {
    if (site.file.trim() === '' || !Number.isInteger(site.line) || site.line < 1 || site.reason.trim() === '') {
      throw ValidationError('feature-edge.catalog', `${options.family}.opaqueSites[${index}] is malformed`);
    }
    return Object.freeze({ family: options.family, ...site });
  });
  observations.sort(
    (left, right) =>
      left.subject.localeCompare(right.subject) ||
      left.role.localeCompare(right.role) ||
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.mechanism.localeCompare(right.mechanism),
  );
  opaqueSites.sort(
    (left, right) =>
      left.role.localeCompare(right.role) ||
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.mechanism.localeCompare(right.mechanism) ||
      left.reason.localeCompare(right.reason),
  );
  const enumerator = FEATURE_EDGE_ENUMERATORS[options.family];
  const sourceImage = [...(options.sourceImage ?? [])].sort((left, right) => left.owner.localeCompare(right.owner));
  const censusDigest = `sha256:${sha256Hex(
    CanonicalCbor.encode({ enumerator, family: options.family, sourceImage, observations, opaqueSites }),
  )}` as const;
  const subjectCoverage =
    opaqueSites.length === 0
      ? {
          status: 'complete' as const,
          enumerator,
          enumeratedCount: declared.size,
          censusDigest,
        }
      : {
          status: 'unknown' as const,
          enumerator,
          enumeratedCount: declared.size,
          censusDigest,
          opaqueSites: Object.freeze(opaqueSites),
        };
  return Object.freeze({
    family: options.family,
    observations: Object.freeze(observations),
    subjectCoverage: Object.freeze(subjectCoverage),
  });
}

/**
 * Mint the one host integrity receipt over an exact, complete family set.
 * Missing/duplicate family packs are refused here and independently reported as
 * opaque by the gauntlet projection if hostile/unvalidated facts bypass the host.
 */
export function combineFeatureEdgeFamilies(families: readonly FeatureEdgeFamilyFacts[]): FeatureEdgeFacts {
  const byFamily = new Map<FeatureEdgeFamily, FeatureEdgeFamilyFacts>();
  for (const pack of families) {
    if (byFamily.has(pack.family))
      throw ValidationError('feature-edge.family-set', `feature-edge census repeats family ${pack.family}`);
    byFamily.set(pack.family, pack);
  }
  const missing = FEATURE_EDGE_FAMILIES.filter((family) => !byFamily.has(family));
  if (missing.length > 0)
    throw ValidationError('feature-edge.family-set', `feature-edge census is missing families: ${missing.join(', ')}`);
  const ordered = FEATURE_EDGE_FAMILIES.map((family) => byFamily.get(family)!);
  const enumeratedCount = ordered.reduce((sum, pack) => sum + pack.subjectCoverage.enumeratedCount, 0);
  const aggregateImage = ordered.map((pack) => ({
    family: pack.family,
    enumerator: pack.subjectCoverage.enumerator,
    enumeratedCount: pack.subjectCoverage.enumeratedCount,
    censusDigest: pack.subjectCoverage.censusDigest,
    status: pack.subjectCoverage.status,
  }));
  const censusDigest = `sha256:${sha256Hex(CanonicalCbor.encode(aggregateImage))}` as const;
  return Object.freeze({
    _tag: 'feature-edge-facts',
    families: Object.freeze(ordered),
    aggregate: Object.freeze({
      enumerator: 'feature-edge/family-set-v1' as const,
      enumeratedCount,
      censusDigest,
    }),
  });
}
