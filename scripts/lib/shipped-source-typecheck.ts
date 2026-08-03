/**
 * Context-correct TypeScript admission for shipped CLI fragments and bins.
 *
 * Fragment subjects come from the tracked W1.11 census. Their canonical
 * template/example projections decide the consumer context that owns each
 * check; a newly projected source therefore cannot hide behind a maintained
 * filename list.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { ValidationError } from '../../packages/error/src/index.js';
import { collectCliFragmentProjectionAuthorityDrift } from '../gen-cli-fragments.js';
import { collectCliFragmentProjectionDrift, type CliFragmentProjection } from '../gen-roster.js';
import { W111_SUBJECT_FLOORS, type W111SubjectCensus } from './tracked-subject-census.js';

const EXAMPLE_SOURCE = /^examples\/([^/]+)\/(.+)$/u;
const DEFAULT_TEMPLATE_PREFIX = 'packages/create-liteship/templates/default/';
const DEFAULT_EXAMPLE_PREFIX = 'examples/default/';
const SOURCE_EXTENSION = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u;
const BIN_SOURCE = /^packages\/[^/]+\/bin\/.*\.[cm]?js$/u;

/**
 * Standalone fragment trees that carry their own TypeScript project.
 *
 * Exported because these config paths ARE a governed population: the
 * denominator census (W1.3) derives the typecheck layer from the projects the
 * toolchain actually names, and a list only this module could see would make
 * those projects invisible to the census — governed in fact, ungoverned in
 * evidence.
 */
export const STANDALONE_CONTEXTS = Object.freeze([
  Object.freeze({ sourcePrefix: 'examples/07-stagger-reveal/', configPath: 'tsconfig.fragment-stagger.json' }),
  Object.freeze({ sourcePrefix: 'examples/scenes/', configPath: 'tsconfig.fragment-scenes.json' }),
]);

export const SHIPPED_BIN_TSCONFIG = 'tsconfig.shipped-bins.json';
export const W111_TYPECHECK_FLOORS = Object.freeze({
  canonicalExampleProjects: 8,
  defaultTemplateParity: 3,
  standaloneFragmentSources: 3,
});

export interface ShippedTypecheckSubject {
  /** The tracked publishable subject admitted by this context. */
  readonly subject: string;
  /** The authored source whose bytes produced the published subject. */
  readonly canonicalSource: string;
  /** The file actually compiled in its canonical consumer context. */
  readonly typecheckPath: string;
}

export interface ShippedTypecheckContext {
  readonly id: string;
  readonly kind: 'example' | 'standalone' | 'bins';
  readonly configPath: string;
  readonly subjects: readonly ShippedTypecheckSubject[];
}

export interface ShippedSourceTypecheckPlan {
  readonly canonicalExampleProjects: readonly string[];
  readonly contexts: readonly ShippedTypecheckContext[];
  readonly defaultTemplateParity: readonly ShippedTypecheckSubject[];
  readonly fragmentSources: readonly ShippedTypecheckSubject[];
  readonly shippedBins: readonly ShippedTypecheckSubject[];
}

export interface ShippedSourceTypecheckAuthority {
  readonly subjects: W111SubjectCensus;
  readonly projections: readonly CliFragmentProjection[];
}

type ByteReader = (path: string) => Uint8Array;

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function frozenSubjects(subjects: readonly ShippedTypecheckSubject[]): readonly ShippedTypecheckSubject[] {
  return Object.freeze(
    [...subjects]
      .sort((left, right) => comparePath(left.subject, right.subject))
      .map((subject) => Object.freeze(subject)),
  );
}

function analyzeShippedSourceTypecheckPlan(
  authority: ShippedSourceTypecheckAuthority,
  readBytes: ByteReader,
): { readonly plan: ShippedSourceTypecheckPlan; readonly violations: readonly string[] } {
  const violations: string[] = [];
  const sourceSubjects = new Set(authority.subjects.fragmentSources);
  const projectionByDestination = new Map(
    authority.projections.map((projection) => [projection.destination, projection]),
  );
  const projectionSources = new Set(authority.projections.map((projection) => projection.source));
  const contexts = new Map<
    string,
    { kind: ShippedTypecheckContext['kind']; configPath: string; subjects: ShippedTypecheckSubject[] }
  >();
  const fragmentSources: ShippedTypecheckSubject[] = [];
  const defaultTemplateParity: ShippedTypecheckSubject[] = [];
  const canonicalExampleProjects = new Set<string>();
  let standaloneFragmentSources = 0;

  const addContextSubject = (
    id: string,
    kind: ShippedTypecheckContext['kind'],
    configPath: string,
    subject: ShippedTypecheckSubject,
  ): void => {
    const context = contexts.get(id);
    if (context === undefined) contexts.set(id, { kind, configPath, subjects: [subject] });
    else if (context.kind !== kind || context.configPath !== configPath) {
      violations.push(`${id} resolves to conflicting typecheck contexts`);
    } else context.subjects.push(subject);
  };

  if (authority.subjects.fragmentSources.length < W111_SUBJECT_FLOORS.fragmentSources) {
    violations.push(
      `fragment source census contains ${authority.subjects.fragmentSources.length}; floor is ${W111_SUBJECT_FLOORS.fragmentSources}`,
    );
  }
  if (authority.subjects.shippedBins.length < W111_SUBJECT_FLOORS.shippedBins) {
    violations.push(
      `shipped bin census contains ${authority.subjects.shippedBins.length}; floor is ${W111_SUBJECT_FLOORS.shippedBins}`,
    );
  }

  for (const destination of authority.subjects.fragmentSources) {
    const projection = projectionByDestination.get(destination);
    if (projection === undefined) {
      violations.push(`${destination} has no canonical fragment projection`);
      continue;
    }

    const source = projection.source;
    const example = EXAMPLE_SOURCE.exec(source);
    if (example !== null) {
      const project = example[1]!;
      const projectConfig = `examples/${project}/tsconfig.json`;
      if (projectionSources.has(projectConfig)) {
        const subject = { subject: destination, canonicalSource: source, typecheckPath: source };
        canonicalExampleProjects.add(project);
        fragmentSources.push(subject);
        addContextSubject(`example:${project}`, 'example', projectConfig, subject);
        continue;
      }

      const standalone = STANDALONE_CONTEXTS.find((candidate) => source.startsWith(candidate.sourcePrefix));
      if (standalone !== undefined) {
        const subject = { subject: destination, canonicalSource: source, typecheckPath: source };
        standaloneFragmentSources += 1;
        fragmentSources.push(subject);
        addContextSubject(`standalone:${standalone.sourcePrefix}`, 'standalone', standalone.configPath, subject);
        continue;
      }
    }

    if (source.startsWith(DEFAULT_TEMPLATE_PREFIX)) {
      const paritySource = `${DEFAULT_EXAMPLE_PREFIX}${source.slice(DEFAULT_TEMPLATE_PREFIX.length)}`;
      if (!projectionSources.has(paritySource)) {
        violations.push(`${destination} has no default-example parity source at ${paritySource}`);
        continue;
      }
      try {
        if (!Buffer.from(readBytes(source)).equals(Buffer.from(readBytes(paritySource)))) {
          violations.push(`${source} is not byte-identical to ${paritySource}`);
          continue;
        }
      } catch (error) {
        violations.push(
          `${source} parity bytes are unreadable: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
      const subject = { subject: destination, canonicalSource: source, typecheckPath: paritySource };
      fragmentSources.push(subject);
      defaultTemplateParity.push(subject);
      addContextSubject('example:default', 'example', 'examples/default/tsconfig.json', subject);
      continue;
    }

    violations.push(`${destination} from ${source} has no context-correct typecheck owner`);
  }

  for (const projection of authority.projections) {
    if (SOURCE_EXTENSION.test(projection.destination) && !sourceSubjects.has(projection.destination)) {
      violations.push(`${projection.destination} is a source projection outside the tracked fragment-source census`);
    }
  }

  const shippedBins = authority.subjects.shippedBins.map((path) => ({
    subject: path,
    canonicalSource: path,
    typecheckPath: path,
  }));
  for (const subject of shippedBins) addContextSubject('bins', 'bins', SHIPPED_BIN_TSCONFIG, subject);

  if (canonicalExampleProjects.size < W111_TYPECHECK_FLOORS.canonicalExampleProjects) {
    violations.push(
      `canonical example context census contains ${canonicalExampleProjects.size}; floor is ${W111_TYPECHECK_FLOORS.canonicalExampleProjects}`,
    );
  }
  if (defaultTemplateParity.length < W111_TYPECHECK_FLOORS.defaultTemplateParity) {
    violations.push(
      `default-template parity contains ${defaultTemplateParity.length}; floor is ${W111_TYPECHECK_FLOORS.defaultTemplateParity}`,
    );
  }
  if (standaloneFragmentSources < W111_TYPECHECK_FLOORS.standaloneFragmentSources) {
    violations.push(
      `standalone fragment contexts contain ${standaloneFragmentSources} sources; floor is ${W111_TYPECHECK_FLOORS.standaloneFragmentSources}`,
    );
  }
  if (fragmentSources.length !== authority.subjects.fragmentSources.length) {
    violations.push(
      `typecheck contexts admit ${fragmentSources.length}/${authority.subjects.fragmentSources.length} tracked fragment sources`,
    );
  }

  const frozenContexts = Object.freeze(
    [...contexts.entries()]
      .sort(([left], [right]) => comparePath(left, right))
      .map(([id, context]) =>
        Object.freeze({
          id,
          kind: context.kind,
          configPath: context.configPath,
          subjects: frozenSubjects(context.subjects),
        }),
      ),
  );
  const plan = Object.freeze({
    canonicalExampleProjects: Object.freeze([...canonicalExampleProjects].sort(comparePath)),
    contexts: frozenContexts,
    defaultTemplateParity: frozenSubjects(defaultTemplateParity),
    fragmentSources: frozenSubjects(fragmentSources),
    shippedBins: frozenSubjects(shippedBins),
  });
  return { plan, violations: Object.freeze(violations) };
}

/** Return every derivation/parity/coverage failure without mutating the checkout. */
export function collectShippedSourceTypecheckPlanViolations(
  authority: ShippedSourceTypecheckAuthority,
  readBytes: ByteReader,
): readonly string[] {
  return analyzeShippedSourceTypecheckPlan(authority, readBytes).violations;
}

/**
 * Bind every typechecked canonical source to the exact fragment bytes users
 * receive. Compiling only the canonical source is insufficient: a stale or
 * corrupted projection must refuse the same `check/typecheck` authority.
 */
export function collectShippedFragmentProjectionViolations(
  authority: ShippedSourceTypecheckAuthority,
  readBytes: ByteReader,
): readonly string[] {
  const drift = [
    ...collectCliFragmentProjectionAuthorityDrift(authority),
    ...collectCliFragmentProjectionDrift(
      (path) => {
        try {
          return readBytes(path);
        } catch {
          return undefined;
        }
      },
      authority.subjects.fragments,
      authority.projections,
    ),
  ];
  return Object.freeze(drift.map((item) => `${item.copy}: ${item.detail}`));
}

/** Derive the complete context plan or refuse every uncovered subject at once. */
export function buildShippedSourceTypecheckPlan(
  authority: ShippedSourceTypecheckAuthority,
  readBytes: ByteReader,
): ShippedSourceTypecheckPlan {
  const analyzed = analyzeShippedSourceTypecheckPlan(authority, readBytes);
  if (analyzed.violations.length > 0) {
    throw ValidationError('shipped-source-typecheck', analyzed.violations.join('; '));
  }
  return analyzed.plan;
}

/**
 * Prove every derived context resolves its subjects to a non-empty compiler
 * population. The bin context additionally owns explicit JS semantic checking.
 */
export function collectShippedTypecheckConfigViolations(
  plan: ShippedSourceTypecheckPlan,
  repoRoot: string,
): readonly string[] {
  const violations: string[] = [];
  for (const context of plan.contexts) {
    const configPath = resolve(repoRoot, context.configPath);
    const read = ts.readConfigFile(configPath, ts.sys.readFile);
    if (read.error !== undefined) {
      violations.push(`${context.configPath}: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`);
      continue;
    }
    const raw = read.config as { readonly compilerOptions?: Readonly<Record<string, unknown>> };
    if (context.kind === 'bins') {
      if (raw.compilerOptions?.['allowJs'] !== true) violations.push(`${context.configPath} must set allowJs: true`);
      if (raw.compilerOptions?.['checkJs'] !== true) violations.push(`${context.configPath} must set checkJs: true`);
    }
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      ts.sys,
      dirname(configPath),
      { noEmit: true },
      configPath,
    );
    for (const diagnostic of parsed.errors) {
      violations.push(`${context.configPath}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
    }
    if (parsed.options.strict !== true && parsed.options.strictNullChecks !== true) {
      violations.push(`${context.configPath} must preserve strict null checking`);
    }
    const resolvedFiles = new Set(parsed.fileNames.map((path) => resolve(path).replaceAll('\\', '/')));
    if (resolvedFiles.size === 0) violations.push(`${context.configPath} resolves zero files`);
    for (const subject of context.subjects) {
      const path = resolve(repoRoot, subject.typecheckPath).replaceAll('\\', '/');
      if (!resolvedFiles.has(path)) {
        violations.push(`${subject.subject} is absent from ${context.configPath} via ${subject.typecheckPath}`);
      }
    }
    if (context.kind === 'bins') {
      const binFiles = parsed.fileNames
        .map((path) => resolve(path).replaceAll('\\', '/'))
        .filter((path) => BIN_SOURCE.test(path.slice(resolve(repoRoot).replaceAll('\\', '/').length + 1)))
        .sort(comparePath);
      const expectedBins = context.subjects
        .map((subject) => resolve(repoRoot, subject.typecheckPath).replaceAll('\\', '/'))
        .sort(comparePath);
      if (binFiles.length !== expectedBins.length || binFiles.some((path, index) => path !== expectedBins[index])) {
        violations.push(`${context.configPath} bin roots differ from the manifest-resolved shipped bin census`);
      }
    }
  }
  return Object.freeze(violations);
}

/** Filesystem byte reader used by the live authority and focused law. */
export function readRepoBytes(repoRoot: string): ByteReader {
  return (path) => readFileSync(resolve(repoRoot, path));
}
