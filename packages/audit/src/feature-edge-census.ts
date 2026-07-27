/**
 * Checker-backed feature-edge census.
 *
 * Audit owns the heavy semantic observation. A repository host injects the ECS
 * API descriptor and governed corpus; audit names no LiteShip package or local
 * policy. The resulting flat facts are consumed by the dependency-light
 * gauntlet. Dynamic syntax is explicit unknown coverage, never an empty green.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { CanonicalCbor, sha256Hex } from '@liteship/canonical';
import { NotFoundError, ValidationError } from '@liteship/error';
import type { FeatureEdgeFamilyFacts, FeatureEdgeObservation, OpaqueFeatureEdgeSite } from '@liteship/gauntlet';
import ts from 'typescript';
import { createTypeDirectedProgram, type TypeScriptPathAliases } from './ts-program.js';

/** Injected names of the canonical ECS API declarations. */
export interface EcsFeatureEdgeApi {
  /** Repo-relative source module that exports the canonical ECS contracts. */
  readonly declarationFile: string;
  readonly worldExport: string;
  readonly systemExports: readonly string[];
  readonly partExport: string;
  readonly denseStoreFactoryExport: string;
  readonly worldMembers: {
    readonly query: string;
    readonly spawn: string;
    readonly addComponent: string;
    readonly setComponent: string;
  };
  readonly systemQueryMember: string;
  readonly partNameMember: string;
}

/** Project-owned inputs for the semantic ECS feature-edge oracle. */
export interface EcsFeatureEdgeOptions {
  readonly repoRoot: string;
  /** Complete governed corpus, expressed as repo-relative source paths. */
  readonly sourceFiles: readonly string[];
  readonly api: EcsFeatureEdgeApi;
  readonly typeScriptPathAliases?: TypeScriptPathAliases;
}

/** Minimal runtime identity required by the typed-Part census. */
export interface TypedEcsPartIdentity {
  readonly name: string;
}

/** System metadata projected by the canonical ECS constructors. */
export interface TypedEcsSystemMetadata {
  readonly name: string;
  readonly query: readonly TypedEcsPartIdentity[];
  readonly reads: readonly TypedEcsPartIdentity[];
  readonly writes: readonly TypedEcsPartIdentity[];
}

/** Host-owned canonical catalogs for a typed ECS domain. */
export interface TypedEcsFeatureEdgeOptions {
  readonly declarationOwner: string;
  readonly seedOwner: string;
  readonly systemOwner: string;
  readonly parts: Readonly<Record<string, TypedEcsPartIdentity>>;
  readonly seedParts: readonly TypedEcsPartIdentity[];
  readonly systems: readonly TypedEcsSystemMetadata[];
}

const ENUMERATOR = 'ts-checker/ecs-component-v1' as const;

/**
 * Enumerate a minted-Part ECS from the same runtime catalogs that execute it.
 *
 * Seedable Parts and declared system writes are producers. Required/optional
 * system reads are consumers. A Part referenced by any of those catalogs but
 * absent from the canonical declaration owner is refused before facts exist.
 */
export function buildTypedEcsFeatureEdgeFacts(options: TypedEcsFeatureEdgeOptions): FeatureEdgeFamilyFacts {
  const declarations = new Map<string, TypedEcsPartIdentity>();
  for (const [catalogKey, part] of Object.entries(options.parts)) {
    if (part.name.trim() === '')
      throw ValidationError('feature-edge.ecs-catalog', `ECS Part ${catalogKey} has an empty name`);
    const prior = declarations.get(part.name);
    if (prior !== undefined && prior !== part) {
      throw ValidationError(
        'feature-edge.ecs-catalog',
        `ECS Part name "${part.name}" is claimed by distinct canonical declarations`,
      );
    }
    declarations.set(part.name, part);
  }

  const observations: FeatureEdgeObservation[] = [];
  const append = (
    part: TypedEcsPartIdentity,
    role: FeatureEdgeObservation['role'],
    mechanism: FeatureEdgeObservation['mechanism'],
    file: string,
    line: number,
  ): void => {
    if (!declarations.has(part.name)) {
      throw ValidationError('feature-edge.ecs-catalog', `ECS ${role} names undeclared Part "${part.name}"`);
    }
    observations.push({ family: 'ecs-component', subject: part.name, role, mechanism, file, line });
  };

  for (const part of options.seedParts) append(part, 'producer', 'world-spawn', options.seedOwner, 1);
  for (const system of options.systems) {
    if (system.name.trim() === '') throw ValidationError('feature-edge.ecs-catalog', 'ECS system has an empty name');
    for (const part of system.query) append(part, 'consumer', 'system-query', options.systemOwner, 1);
    for (const part of system.reads) append(part, 'consumer', 'system-query', options.systemOwner, 1);
    for (const part of system.writes) append(part, 'producer', 'world-set-component', options.systemOwner, 1);
  }
  observations.sort(
    (left, right) =>
      left.subject.localeCompare(right.subject) ||
      left.role.localeCompare(right.role) ||
      left.file.localeCompare(right.file) ||
      left.mechanism.localeCompare(right.mechanism),
  );
  const enumeratedCount = declarations.size;
  const sourceImage = {
    declarations: [...declarations].map(([name]) => name).sort(),
    seeds: options.seedParts.map((part) => part.name).sort(),
    systems: options.systems
      .map((system) => ({
        name: system.name,
        query: system.query.map((part) => part.name),
        reads: system.reads.map((part) => part.name),
        writes: system.writes.map((part) => part.name),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
  const censusDigest =
    `sha256:${sha256Hex(CanonicalCbor.encode({ enumerator: ENUMERATOR, sourceImage, observations }))}` as const;
  return Object.freeze({
    family: 'ecs-component',
    observations: Object.freeze(observations),
    subjectCoverage: Object.freeze({
      status: 'complete' as const,
      enumerator: ENUMERATOR,
      enumeratedCount,
      censusDigest,
    }),
  });
}

function repoPath(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function propertyName(node: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return undefined;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function exportedSymbol(checker: ts.TypeChecker, sourceFile: ts.SourceFile, name: string): ts.Symbol {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const symbol =
    moduleSymbol === undefined ? undefined : checker.getExportsOfModule(moduleSymbol).find((s) => s.name === name);
  if (symbol === undefined) {
    throw ValidationError(
      'feature-edge.ecs-api',
      `feature-edge API declaration ${sourceFile.fileName} does not export ${name}`,
    );
  }
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
}

function memberSymbol(checker: ts.TypeChecker, owner: ts.Symbol, member: string): ts.Symbol {
  const type = checker.getDeclaredTypeOfSymbol(owner);
  const symbol = type.getProperty(member);
  if (symbol === undefined)
    throw ValidationError('feature-edge.ecs-api', `feature-edge API type ${owner.name} does not declare ${member}`);
  return symbol;
}

function symbolAtCall(checker: ts.TypeChecker, call: ts.CallExpression): ts.Symbol | undefined {
  const expression = unwrap(call.expression);
  const location = ts.isPropertyAccessExpression(expression) ? expression.name : expression;
  const symbol = checker.getSymbolAtLocation(location);
  if (symbol === undefined) return undefined;
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
}

function symbolAtProperty(checker: ts.TypeChecker, property: ts.PropertyAssignment): ts.Symbol | undefined {
  const contextual = checker.getContextualType(property.parent);
  return contextual?.getProperty(propertyName(property.name) ?? '');
}

/** Build deterministic checker-evidenced ECS producer/consumer facts. */
export function buildEcsFeatureEdgeFacts(options: EcsFeatureEdgeOptions): FeatureEdgeFamilyFacts {
  const sourceFiles = [...new Set(options.sourceFiles)].sort((a, b) => a.localeCompare(b));
  const absoluteSources = sourceFiles.map((file) => resolve(options.repoRoot, file));
  const apiAbsolute = resolve(options.repoRoot, options.api.declarationFile);
  const program = createTypeDirectedProgram(
    [...absoluteSources, apiAbsolute],
    options.repoRoot,
    options.typeScriptPathAliases,
  );
  const checker = program.getTypeChecker();
  const apiSource = program.getSourceFile(apiAbsolute);
  if (apiSource === undefined)
    throw NotFoundError('feature-edge API declaration', options.api.declarationFile, 'ECS feature-edge census');

  const world = exportedSymbol(checker, apiSource, options.api.worldExport);
  const part = exportedSymbol(checker, apiSource, options.api.partExport);
  const systemQueries = new Set(
    options.api.systemExports.map((name) =>
      memberSymbol(checker, exportedSymbol(checker, apiSource, name), options.api.systemQueryMember),
    ),
  );
  const worldMethods = {
    query: memberSymbol(checker, world, options.api.worldMembers.query),
    spawn: memberSymbol(checker, world, options.api.worldMembers.spawn),
    addComponent: memberSymbol(checker, world, options.api.worldMembers.addComponent),
    setComponent: memberSymbol(checker, world, options.api.worldMembers.setComponent),
  };
  const partName = memberSymbol(checker, part, options.api.partNameMember);
  const denseStoreFactory = exportedSymbol(checker, apiSource, options.api.denseStoreFactoryExport);

  const observations: FeatureEdgeObservation[] = [];
  const opaqueSites: OpaqueFeatureEdgeSite[] = [];
  const resolving = new Set<ts.Symbol>();

  const addObservation = (
    sourceFile: ts.SourceFile,
    node: ts.Node,
    subject: string,
    role: FeatureEdgeObservation['role'],
    mechanism: FeatureEdgeObservation['mechanism'],
  ): void => {
    observations.push({
      family: 'ecs-component',
      subject,
      role,
      mechanism,
      file: repoPath(options.repoRoot, sourceFile.fileName),
      line: lineOf(sourceFile, node),
    });
  };
  const addOpaque = (
    sourceFile: ts.SourceFile,
    node: ts.Node,
    role: OpaqueFeatureEdgeSite['role'],
    mechanism: OpaqueFeatureEdgeSite['mechanism'],
    reason: string,
  ): void => {
    opaqueSites.push({
      family: 'ecs-component',
      role,
      mechanism,
      file: repoPath(options.repoRoot, sourceFile.fileName),
      line: lineOf(sourceFile, node),
      reason,
    });
  };

  const constInitializer = (
    identifier: ts.Identifier,
  ): { readonly symbol: ts.Symbol; readonly initializer: ts.Expression } | undefined => {
    const original = checker.getSymbolAtLocation(identifier);
    if (original === undefined) return undefined;
    const symbol = (original.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(original) : original;
    if (resolving.has(symbol)) return undefined;
    const declaration = symbol.valueDeclaration;
    if (!declaration || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined)
      return undefined;
    const statement = declaration.parent.parent;
    if (!ts.isVariableStatement(statement) || (statement.declarationList.flags & ts.NodeFlags.Const) === 0)
      return undefined;
    return { symbol, initializer: declaration.initializer };
  };

  const resolveString = (expression: ts.Expression): string | undefined => {
    const current = unwrap(expression);
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) return current.text;
    if (ts.isIdentifier(current)) {
      const resolved = constInitializer(current);
      if (resolved === undefined) return undefined;
      resolving.add(resolved.symbol);
      try {
        return resolveString(resolved.initializer);
      } finally {
        resolving.delete(resolved.symbol);
      }
    }
    return undefined;
  };

  const resolveStringList = (expression: ts.Expression): readonly { value: string; node: ts.Node }[] | undefined => {
    const current = unwrap(expression);
    if (ts.isIdentifier(current)) {
      const resolved = constInitializer(current);
      if (resolved === undefined) return undefined;
      resolving.add(resolved.symbol);
      try {
        return resolveStringList(resolved.initializer);
      } finally {
        resolving.delete(resolved.symbol);
      }
    }
    if (!ts.isArrayLiteralExpression(current)) return undefined;
    const values: { value: string; node: ts.Node }[] = [];
    for (const element of current.elements) {
      if (ts.isSpreadElement(element)) {
        const spread = resolveStringList(element.expression);
        if (spread === undefined) return undefined;
        values.push(...spread);
        continue;
      }
      const value = resolveString(element as ts.Expression);
      if (value === undefined) return undefined;
      values.push({ value, node: element });
    }
    return values;
  };

  const resolvePartName = (expression: ts.Expression): string | undefined => {
    const current = unwrap(expression);
    if (ts.isIdentifier(current)) {
      const resolved = constInitializer(current);
      if (resolved === undefined) return undefined;
      resolving.add(resolved.symbol);
      try {
        return resolvePartName(resolved.initializer);
      } finally {
        resolving.delete(resolved.symbol);
      }
    }
    if (!ts.isObjectLiteralExpression(current)) return undefined;
    const nameProperty = current.properties.find(
      (candidate): candidate is ts.PropertyAssignment =>
        ts.isPropertyAssignment(candidate) && symbolAtProperty(checker, candidate) === partName,
    );
    return nameProperty === undefined ? undefined : resolveString(nameProperty.initializer);
  };

  const resolveSpawnProperties = (
    sourceFile: ts.SourceFile,
    expression: ts.Expression,
  ): readonly { value: string; node: ts.Node }[] | undefined => {
    const current = unwrap(expression);
    if (ts.isIdentifier(current)) {
      const resolved = constInitializer(current);
      if (resolved === undefined) return undefined;
      resolving.add(resolved.symbol);
      try {
        return resolveSpawnProperties(sourceFile, resolved.initializer);
      } finally {
        resolving.delete(resolved.symbol);
      }
    }
    if (!ts.isObjectLiteralExpression(current)) return undefined;
    const values: { value: string; node: ts.Node }[] = [];
    for (const property of current.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = resolveSpawnProperties(sourceFile, property.expression);
        if (spread === undefined) return undefined;
        values.push(...spread);
        continue;
      }
      const name = propertyName(property.name);
      if (name === undefined) return undefined;
      values.push({ value: name, node: property });
    }
    return values;
  };

  for (const absolute of absoluteSources) {
    const sourceFile = program.getSourceFile(absolute);
    if (sourceFile === undefined) {
      throw NotFoundError(
        'feature-edge governed source',
        repoPath(options.repoRoot, absolute),
        'ECS feature-edge census',
      );
    }
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAssignment(node) &&
        symbolAtProperty(checker, node) !== undefined &&
        systemQueries.has(symbolAtProperty(checker, node)!)
      ) {
        const values = resolveStringList(node.initializer);
        if (values === undefined) {
          addOpaque(
            sourceFile,
            node.initializer,
            'consumer',
            'system-query',
            'system query is not a statically resolvable readonly string tuple',
          );
        } else {
          for (const value of values) addObservation(sourceFile, value.node, value.value, 'consumer', 'system-query');
        }
      }

      if (ts.isCallExpression(node)) {
        const called = symbolAtCall(checker, node);
        if (called === worldMethods.query) {
          for (const argument of node.arguments) {
            if (ts.isSpreadElement(argument)) {
              const values = resolveStringList(argument.expression);
              if (values === undefined) {
                addOpaque(
                  sourceFile,
                  argument,
                  'consumer',
                  'world-query',
                  'query spread is not a statically resolvable readonly string tuple',
                );
              } else {
                for (const value of values)
                  addObservation(sourceFile, value.node, value.value, 'consumer', 'world-query');
              }
              continue;
            }
            const value = resolveString(argument);
            if (value === undefined)
              addOpaque(sourceFile, argument, 'consumer', 'world-query', 'query subject is not statically resolvable');
            else addObservation(sourceFile, argument, value, 'consumer', 'world-query');
          }
        } else if (called === worldMethods.spawn) {
          const argument = node.arguments[0];
          if (argument !== undefined) {
            const values = resolveSpawnProperties(sourceFile, argument);
            if (values === undefined) {
              addOpaque(
                sourceFile,
                argument,
                'producer',
                'world-spawn',
                'spawn component bag is not statically resolvable',
              );
            } else {
              for (const value of values)
                addObservation(sourceFile, value.node, value.value, 'producer', 'world-spawn');
            }
          }
        } else if (called === worldMethods.setComponent) {
          const argument = node.arguments[1];
          const value = argument === undefined ? undefined : resolveString(argument);
          if (value === undefined)
            addOpaque(
              sourceFile,
              argument ?? node,
              'producer',
              'world-set-component',
              'component subject is not statically resolvable',
            );
          else addObservation(sourceFile, argument!, value, 'producer', 'world-set-component');
        } else if (called === worldMethods.addComponent) {
          const argument = node.arguments[1];
          const value = argument === undefined ? undefined : resolvePartName(argument);
          if (value === undefined)
            addOpaque(
              sourceFile,
              argument ?? node,
              'producer',
              'world-add-component',
              'Part name is not statically resolvable',
            );
          else addObservation(sourceFile, argument!, value, 'producer', 'world-add-component');
        } else if (called === denseStoreFactory) {
          const argument = node.arguments[0];
          const value = argument === undefined ? undefined : resolveString(argument);
          if (value === undefined)
            addOpaque(
              sourceFile,
              argument ?? node,
              'producer',
              'dense-store',
              'dense-store subject is not statically resolvable',
            );
          else addObservation(sourceFile, argument!, value, 'producer', 'dense-store');
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  observations.sort(
    (a, b) =>
      a.family.localeCompare(b.family) ||
      a.subject.localeCompare(b.subject) ||
      a.role.localeCompare(b.role) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.mechanism.localeCompare(b.mechanism),
  );
  opaqueSites.sort(
    (a, b) =>
      a.family.localeCompare(b.family) ||
      a.role.localeCompare(b.role) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.mechanism.localeCompare(b.mechanism) ||
      a.reason.localeCompare(b.reason),
  );
  const sourceImage = sourceFiles.map((file) => ({
    file,
    text: readFileSync(resolve(options.repoRoot, file), 'utf8'),
  }));
  const censusDigest =
    `sha256:${sha256Hex(CanonicalCbor.encode({ enumerator: ENUMERATOR, sourceImage, observations, opaqueSites }))}` as const;
  const enumeratedCount = new Set(observations.map((observation) => observation.subject)).size;
  const subjectCoverage =
    opaqueSites.length === 0
      ? {
          status: 'complete' as const,
          enumerator: ENUMERATOR,
          enumeratedCount,
          censusDigest,
        }
      : {
          status: 'unknown' as const,
          enumerator: ENUMERATOR,
          enumeratedCount,
          censusDigest,
          opaqueSites,
        };
  return Object.freeze({
    family: 'ecs-component',
    observations: Object.freeze(observations),
    subjectCoverage: Object.freeze(subjectCoverage),
  });
}
