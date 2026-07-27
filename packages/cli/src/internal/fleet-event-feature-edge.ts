/** Fleet-event feature-edge census from generated owner projection plus live source literals. @module */

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { walkFiles } from '@liteship/core/fs-walk';
import { buildCatalogFeatureEdgeFamily } from '@liteship/audit';
import { InvariantViolationError } from '@liteship/error';
import type { FeatureEdgeFamilyFacts } from '@liteship/gauntlet';
import ts from 'typescript';
import { FLEET_EVENT_PROTOCOL } from './fleet-event-protocol.generated.js';

const EVENT_PATTERN = /liteship:[a-z0-9-]+/g;

const PRODUCER_INDIRECTIONS = Object.freeze({
  'liteship:detect-ready': {
    producer: 'packages/detect/src/head-probe.ts',
    identityOwner: 'packages/detect/src/detect-ready.ts',
    symbol: 'DETECT_READY_EVENT',
  },
} as const);

const GENERIC_TYPED_EMITTERS = Object.freeze({
  'liteship:state': {
    producer: 'packages/astro/src/runtime/boundary.ts',
    parameter: 'eventName: BoundaryStateEventName',
    dispatch: 'dispatchLiteshipEvent(element, eventName, detail)',
  },
} as const);

function normalize(path: string): string {
  return path.replaceAll('\\', '/');
}

/** Enumerate event identities embedded in executable string/template literals, never comments or docs. */
export function enumerateFleetEventLiterals(repoRoot: string): ReadonlyMap<string, readonly string[]> {
  const owners = new Map<string, Set<string>>();
  for (const absolute of walkFiles(resolve(repoRoot, 'packages'), {
    extensions: ['.ts', '.tsx'],
    skipDirs: ['dist', 'node_modules'],
  })) {
    const file = normalize(relative(repoRoot, absolute));
    if (file.endsWith('/event-protocol.ts') || file.endsWith('/fleet-event-protocol.generated.ts')) continue;
    const source = ts.createSourceFile(file, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (ts.isStringLiteralLike(node)) {
        for (const match of node.text.matchAll(EVENT_PATTERN)) {
          const files = owners.get(match[0]) ?? new Set<string>();
          files.add(file);
          owners.set(match[0], files);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return new Map(
    [...owners].sort(([left], [right]) => left.localeCompare(right)).map(([name, files]) => [name, [...files].sort()]),
  );
}

function enumerateFleetEventDispatchSites(repoRoot: string): ReadonlyMap<string, readonly string[]> {
  const sites = new Map<string, Set<string>>();
  for (const absolute of walkFiles(resolve(repoRoot, 'packages'), {
    extensions: ['.ts', '.tsx'],
    skipDirs: ['dist', 'node_modules'],
  })) {
    const file = normalize(relative(repoRoot, absolute));
    if (file.endsWith('/event-protocol.ts') || file.endsWith('/fleet-event-protocol.generated.ts')) continue;
    for (const identity of enumerateTypedEventDispatches(readFileSync(absolute, 'utf8'), file)) {
      const files = sites.get(identity) ?? new Set<string>();
      files.add(file);
      sites.set(identity, files);
    }
  }
  return new Map(
    [...sites].sort(([left], [right]) => left.localeCompare(right)).map(([name, files]) => [name, [...files].sort()]),
  );
}

/** Extract identities from recognized typed DOM dispatches and Vite custom sends. */
export function enumerateTypedEventDispatches(sourceText: string, file = 'fixture.ts'): ReadonlySet<string> {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const constants = new Map<string, string>();
  const resolveIdentity = (expression: ts.Expression | undefined): string | undefined => {
    if (expression === undefined) return undefined;
    if (ts.isStringLiteralLike(expression)) return /^liteship:/.test(expression.text) ? expression.text : undefined;
    return ts.isIdentifier(expression) ? constants.get(expression.text) : undefined;
  };
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const identity = resolveIdentity(declaration.initializer);
      if (identity !== undefined) constants.set(declaration.name.text, identity);
    }
  }
  const emitted = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        (node.expression.text === 'dispatchLiteshipEvent' || node.expression.text === 'applyBoundaryState')
      ) {
        const identity = resolveIdentity(node.arguments[node.expression.text === 'dispatchLiteshipEvent' ? 1 : 3]);
        if (identity !== undefined) emitted.add(identity);
      } else if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'send') {
        const payload = node.arguments[0];
        if (payload && ts.isObjectLiteralExpression(payload)) {
          const eventProperty = payload.properties.find(
            (property): property is ts.PropertyAssignment =>
              ts.isPropertyAssignment(property) && property.name.getText(source) === 'event',
          );
          const identity = resolveIdentity(eventProperty?.initializer);
          if (identity !== undefined) emitted.add(identity);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return emitted;
}

function hasProducerEvidence(repoRoot: string, event: string, producer: string): boolean {
  const absolute = resolve(repoRoot, producer);
  if (!existsSync(absolute)) return false;
  if (enumerateTypedEventDispatches(readFileSync(absolute, 'utf8'), producer).has(event)) return true;
  const indirection = PRODUCER_INDIRECTIONS[event as keyof typeof PRODUCER_INDIRECTIONS];
  const producerSource = readFileSync(absolute, 'utf8');
  if (indirection !== undefined && indirection.producer === producer) {
    const identitySource = readFileSync(resolve(repoRoot, indirection.identityOwner), 'utf8');
    return (
      producerSource.includes(`new CustomEvent('\${${indirection.symbol}}'`) &&
      identitySource.includes(`const ${indirection.symbol} = '${event}'`)
    );
  }
  const generic = GENERIC_TYPED_EMITTERS[event as keyof typeof GENERIC_TYPED_EMITTERS];
  return (
    generic !== undefined &&
    generic.producer === producer &&
    producerSource.includes(`'${event}'`) &&
    producerSource.includes(generic.parameter) &&
    producerSource.includes(generic.dispatch)
  );
}

/** Reject executable event identities that no owner catalog declares. */
export function assertFleetEventOwnership(
  declared: ReadonlySet<string>,
  literals: ReadonlyMap<string, readonly string[]>,
): void {
  const unowned = [...literals.keys()].filter((name) => !declared.has(name));
  if (unowned.length > 0)
    throw InvariantViolationError(
      'fleet-event.owner-catalog',
      `fleet event literals have no owner declaration: ${unowned.join(', ')}`,
    );
}

/** Refuse typed emitters omitted from their owner declaration's producer receipt. */
export function assertFleetEventProducerClassification(
  claimedByIdentity: ReadonlyMap<string, ReadonlySet<string>>,
  dispatchSites: ReadonlyMap<string, readonly string[]>,
): void {
  for (const [identity, files] of dispatchSites) {
    const claimed = claimedByIdentity.get(identity);
    if (claimed === undefined) continue;
    const omitted = files.filter((file) => !claimed.has(file));
    if (omitted.length > 0)
      throw InvariantViolationError(
        'fleet-event.producer-census',
        `${identity} has unclassified typed producer(s): ${omitted.join(', ')}`,
      );
  }
}

/** Build the ninth canonical feature-edge family and refuse unowned or fictitious producer claims. */
export function buildFleetEventFeatureEdgeFamily(repoRoot: string): FeatureEdgeFamilyFacts {
  const declared = new Set(FLEET_EVENT_PROTOCOL.map((event) => event.name));
  const literals = enumerateFleetEventLiterals(repoRoot);
  assertFleetEventOwnership(declared, literals);

  assertFleetEventProducerClassification(
    new Map(FLEET_EVENT_PROTOCOL.map((event) => [event.name, new Set<string>(event.producers)])),
    enumerateFleetEventDispatchSites(repoRoot),
  );

  for (const event of FLEET_EVENT_PROTOCOL) {
    for (const producer of event.producers) {
      if (!hasProducerEvidence(repoRoot, event.name, producer)) {
        throw InvariantViolationError(
          'fleet-event.producer-evidence',
          `${event.name} producer claim is not evidenced by ${producer}`,
        );
      }
    }
  }

  return buildCatalogFeatureEdgeFamily({
    family: 'fleet-event',
    declarations: FLEET_EVENT_PROTOCOL.map((event) => ({
      subject: event.name,
      mechanism: 'protocol-declaration' as const,
      file: event.catalog,
      line: 1,
    })),
    producers: FLEET_EVENT_PROTOCOL.flatMap((event) =>
      event.producers.map((file) => ({
        subject: event.name,
        mechanism: 'event-dispatch' as const,
        file,
        line: 1,
      })),
    ),
    sourceImage: [
      { owner: 'FLEET_EVENT_PROTOCOL', value: FLEET_EVENT_PROTOCOL },
      { owner: 'executable-literal-census', value: [...literals] },
    ],
  });
}
