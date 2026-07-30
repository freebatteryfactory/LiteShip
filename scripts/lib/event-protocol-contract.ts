/** Owner-catalog parser and generated fleet event protocol projection. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export const EVENT_PROTOCOL_CATALOGS = [
  'packages/astro/src/runtime/event-protocol.ts',
  'packages/detect/src/event-protocol.ts',
  'packages/scene/src/dev/event-protocol.ts',
  'packages/vite/src/event-protocol.ts',
  'packages/web/src/wire/event-protocol.ts',
] as const;

export interface EventProtocolRecord {
  readonly name: `liteship:${string}`;
  readonly owner: string;
  readonly channel: 'dom' | 'vite-hmr';
  readonly detail: string;
  readonly producers: readonly string[];
  readonly description: string;
  readonly catalog: string;
}

interface ProjectedDetailReference {
  readonly moduleName: string;
  readonly symbolName: string;
}

function projectedDetailReferences(detail: string): readonly ProjectedDetailReference[] {
  const source = ts.createSourceFile(
    'event-detail.ts',
    `type __EventDetail = ${detail};`,
    ts.ScriptTarget.Latest,
    true,
  );
  const references: ProjectedDetailReference[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      const moduleName = node.argument.literal.text;
      if (/^\.\/[a-z0-9-]+\.js$/u.test(moduleName)) {
        if (node.qualifier === undefined || !ts.isIdentifier(node.qualifier)) {
          throw new Error(`projected event detail import ${moduleName} must select one named spine export`);
        }
        references.push({ moduleName, symbolName: node.qualifier.text });
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);
  return references;
}

/** Refuse generated event payload references that do not exist in their projected spine leaf. */
export function validateProjectedDetailReferences(
  records: readonly EventProtocolRecord[],
  exportsByModule: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  for (const record of records) {
    for (const { moduleName, symbolName } of projectedDetailReferences(record.detail)) {
      if (!exportsByModule.get(moduleName)?.has(symbolName)) {
        throw new Error(
          `${record.catalog}: ${record.name} detail projects missing spine export ${moduleName}.${symbolName}`,
        );
      }
    }
  }
}

function projectedDetailExports(
  repoRoot: string,
  records: readonly EventProtocolRecord[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const modules = new Set<string>();
  for (const record of records) {
    for (const { moduleName } of projectedDetailReferences(record.detail)) {
      modules.add(moduleName);
    }
  }
  return new Map(
    [...modules].sort().map((moduleName) => {
      const leaf = moduleName.replace(/^\.\//u, '').replace(/\.js$/u, '.d.ts');
      const source = ts.createSourceFile(
        leaf,
        readFileSync(resolve(repoRoot, 'packages/_spine', leaf), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const names = new Set<string>();
      for (const statement of source.statements) {
        if (
          !(
            ts.isInterfaceDeclaration(statement) ||
            ts.isTypeAliasDeclaration(statement) ||
            ts.isClassDeclaration(statement) ||
            ts.isEnumDeclaration(statement) ||
            ts.isFunctionDeclaration(statement) ||
            ts.isModuleDeclaration(statement)
          ) ||
          statement.name === undefined ||
          !ts.isIdentifier(statement.name)
        )
          continue;
        if (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
          names.add(statement.name.text);
      }
      return [moduleName, names] as const;
    }),
  );
}

function literal(member: ts.TypeElement | undefined, field: string, catalog: string): string {
  if (
    !member ||
    !ts.isPropertySignature(member) ||
    !member.type ||
    !ts.isLiteralTypeNode(member.type) ||
    !ts.isStringLiteral(member.type.literal)
  ) {
    throw new Error(`${catalog}: ${field} must be a string-literal type`);
  }
  return member.type.literal.text;
}

function field(members: ts.NodeArray<ts.TypeElement>, name: string): ts.TypeElement | undefined {
  return members.find((member) => ts.isPropertySignature(member) && member.name.getText().replaceAll("'", '') === name);
}

const SPINE_MODULE_BY_OWNER_IMPORT: Readonly<Record<string, string>> = Object.freeze({
  '@liteship/core': './core.js',
  '@liteship/core/authoring': './core.js',
  '@liteship/genui': './genui.js',
  './detect-ready.js': './detect.js',
  './hmr.js': './vite.js',
  '../types.js': './web.js',
});

function identifierPattern(name: string): RegExp {
  return new RegExp(`(?<![\\w$])${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?![\\w$])`, 'gu');
}

function detailText(
  node: ts.TypeNode,
  aliases: ReadonlyMap<string, ts.TypeNode>,
  importedTypes: ReadonlyMap<string, string>,
  catalog: string,
): string {
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const alias = aliases.get(node.typeName.text);
    if (alias) return detailText(alias, aliases, importedTypes, catalog);
  }
  let rendered = node
    .getText()
    .replaceAll("import('@liteship/core').", 'import("./core.js").')
    .replaceAll("import('@liteship/core/authoring').", 'import("./core.js").')
    .replaceAll("import('@liteship/genui').", 'import("./genui.js").')
    .replaceAll("import('./detect-ready.js').", 'import("./detect.js").')
    .replaceAll("import('./hmr.js').", 'import("./vite.js").')
    .replaceAll("import('../types.js').", 'import("./web.js").');
  for (const [localName, projected] of [...importedTypes].sort(([left], [right]) => right.length - left.length)) {
    rendered = rendered.replace(identifierPattern(localName), projected);
  }
  return rendered;
}

export function collectEventProtocol(repoRoot: string): readonly EventProtocolRecord[] {
  const records: EventProtocolRecord[] = [];
  for (const catalog of EVENT_PROTOCOL_CATALOGS) {
    const source = ts.createSourceFile(
      catalog,
      readFileSync(resolve(repoRoot, catalog), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const aliases = new Map<string, ts.TypeNode>();
    const importedTypes = new Map<string, string>();
    for (const statement of source.statements) {
      if (ts.isTypeAliasDeclaration(statement)) aliases.set(statement.name.text, statement.type);
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const projectedModule = SPINE_MODULE_BY_OWNER_IMPORT[statement.moduleSpecifier.text];
        if (projectedModule === undefined) {
          throw new Error(
            `${catalog}: imported event detail owner ${statement.moduleSpecifier.text} has no spine projection`,
          );
        }
        const bindings = statement.importClause?.namedBindings;
        if (bindings === undefined || !ts.isNamedImports(bindings)) {
          throw new Error(`${catalog}: event detail imports must use named type imports`);
        }
        for (const element of bindings.elements) {
          const importedName = element.propertyName?.text ?? element.name.text;
          importedTypes.set(element.name.text, `import(${JSON.stringify(projectedModule)}).${importedName}`);
        }
      }
    }
    const protocol = source.statements.find(
      (statement): statement is ts.InterfaceDeclaration =>
        ts.isInterfaceDeclaration(statement) && statement.name.text === 'OwnedLiteShipEventProtocol',
    );
    if (!protocol) throw new Error(`${catalog}: missing OwnedLiteShipEventProtocol`);
    for (const member of protocol.members) {
      if (!ts.isPropertySignature(member) || !member.type || !ts.isTypeLiteralNode(member.type)) {
        throw new Error(`${catalog}: protocol entries must be property type literals`);
      }
      const name = member.name.getText().slice(1, -1);
      if (!/^liteship:[a-z0-9-]+$/.test(name)) throw new Error(`${catalog}: invalid event identity ${name}`);
      const detailMember = field(member.type.members, 'detail');
      const producersMember = field(member.type.members, 'producers');
      if (!detailMember || !ts.isPropertySignature(detailMember) || !detailMember.type) {
        throw new Error(`${catalog}: ${name} requires detail`);
      }
      if (
        !producersMember ||
        !ts.isPropertySignature(producersMember) ||
        !producersMember.type ||
        !ts.isTypeOperatorNode(producersMember.type) ||
        !ts.isTupleTypeNode(producersMember.type.type)
      ) {
        throw new Error(`${catalog}: ${name} producers must be a readonly tuple`);
      }
      const producers = producersMember.type.type.elements.map((entry) => {
        if (!ts.isLiteralTypeNode(entry) || !ts.isStringLiteral(entry.literal))
          throw new Error(`${catalog}: ${name} producer must be a literal`);
        return entry.literal.text;
      });
      records.push({
        name: name as `liteship:${string}`,
        owner: literal(field(member.type.members, 'owner'), `${name}.owner`, catalog),
        channel: literal(field(member.type.members, 'channel'), `${name}.channel`, catalog) as 'dom' | 'vite-hmr',
        detail: detailText(detailMember.type, aliases, importedTypes, catalog),
        producers,
        description: literal(field(member.type.members, 'description'), `${name}.description`, catalog),
        catalog,
      });
    }
  }
  records.sort((left, right) => left.name.localeCompare(right.name));
  validateEventProtocolRecords(records);
  validateProjectedDetailReferences(records, projectedDetailExports(repoRoot, records));
  return records;
}

/** Fail closed before generating a projection from ambiguous or uninhabited owners. */
export function validateEventProtocolRecords(records: readonly EventProtocolRecord[]): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.name)) throw new Error(`duplicate fleet event owner for ${record.name}`);
    if (record.producers.length === 0) throw new Error(`${record.name} has no real producer`);
    seen.add(record.name);
  }
}

export function renderEventProtocolDts(records: readonly EventProtocolRecord[]): string {
  const ordered = [...records].sort((left, right) => left.name.localeCompare(right.name));
  const owners = [...new Set(ordered.map((record) => record.owner))]
    .sort()
    .map((value) => JSON.stringify(value))
    .join(' | ');
  const channels = [...new Set(ordered.map((record) => record.channel))]
    .sort()
    .map((value) => JSON.stringify(value))
    .join(' | ');
  const rows = ordered
    .map(
      (record) =>
        `  ${JSON.stringify(record.name)}: ProtocolEvent<${JSON.stringify(record.owner)}, ${JSON.stringify(record.channel)}, ${record.detail}>;`,
    )
    .join('\n');
  return `/** GENERATED by scripts/gen-event-protocol.ts from owner-local protocol declarations. */\n/** Package that owns an event identity and its semantic payload contract. */\nexport type LiteShipEventOwner = ${owners};\n/** Transport channel on which a fleet event is delivered. */\nexport type LiteShipEventChannel = ${channels};\n/** One event protocol row carrying provenance, transport, and detail. */\nexport interface ProtocolEvent<Owner extends LiteShipEventOwner, Channel extends LiteShipEventChannel, Detail> { readonly owner: Owner; readonly channel: Channel; readonly detail: Detail }\n/** Generated fleet-wide event identity map. Owner catalogs are its only authored source. */\nexport interface LiteShipEventMap {\n${rows}\n}\n/** Every event identity admitted by the generated fleet protocol. */\nexport type LiteShipEventName = keyof LiteShipEventMap;\n/** Payload detail for one admitted event identity. */\nexport type EventDetail<Name extends LiteShipEventName> = LiteShipEventMap[Name]['detail'];\n/** Event identities owned by one semantic package owner. */\nexport type EventsOwnedBy<Owner extends LiteShipEventOwner> = { [Name in LiteShipEventName]: LiteShipEventMap[Name]['owner'] extends Owner ? Name : never }[LiteShipEventName];\n/** Event identities delivered through one transport channel. */\nexport type EventsInChannel<Channel extends LiteShipEventChannel> = { [Name in LiteShipEventName]: LiteShipEventMap[Name]['channel'] extends Channel ? Name : never }[LiteShipEventName];\n`;
}

export function renderWebEventProjection(records: readonly EventProtocolRecord[]): string {
  const dom = records
    .filter((record) => record.channel === 'dom')
    .sort((left, right) => left.name.localeCompare(right.name));
  const names = dom.map((record) => `  ${JSON.stringify(record.name)},`).join('\n');
  const docs = dom
    .map((record) => `  ${JSON.stringify(record.name)}: ${JSON.stringify(record.description)},`)
    .join('\n');
  return `/** GENERATED by scripts/gen-event-protocol.ts. */\nimport type { EventsInChannel } from '@liteship/_spine/events';\n/** Exhaustive generated DOM-channel LiteShip event identities. */\n// prettier-ignore\nexport const LITESHIP_EVENT_NAMES = [\n${names}\n] as const satisfies readonly EventsInChannel<'dom'>[];\n/** Generated human descriptions for each DOM-channel event identity. */\n// prettier-ignore\nexport const LITESHIP_EVENT_DOCS: Readonly<Record<EventsInChannel<'dom'>, string>> = {\n${docs}\n};\n`;
}

/** Host-side metadata receipt. Types stay in _spine; the CLI uses this only to build audit facts. */
export function renderEventProtocolHostProjection(records: readonly EventProtocolRecord[]): string {
  const ordered = [...records].sort((left, right) => left.name.localeCompare(right.name));
  const data = ordered.map(({ name, owner, channel, producers, description, catalog }) => ({
    name,
    owner,
    channel,
    producers,
    description,
    catalog,
  }));
  return `/** GENERATED by scripts/gen-event-protocol.ts from owner-local protocol declarations. */\n// prettier-ignore\nexport const FLEET_EVENT_PROTOCOL = Object.freeze(${JSON.stringify(data, null, 2)} as const);\n`;
}
