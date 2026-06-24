/**
 * Integrity audit pass (CUT D9b-1, relocated from scripts/audit) — runtime stub
 * markers, missing-capability advertisements, fallback laundering, raw console
 * calls, placeholder/debug content, and suspicious reimplementation next to an
 * unused internal import. Profile-driven (CUT D9a): the internal-package gate is
 * `profile.internalPackagePrefix`, and `profile.repoRoot` is the audit target.
 *
 * @module
 */
import ts from 'typescript';
import { liteshipDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import {
  isSimpleDefaultExpression,
  lineAndColumn,
  nodeText,
  partitionAllowlistedFindings,
  readProfileSourceFileRecords,
} from './shared.js';
import type { AuditFinding, AuditSectionResult } from './types.js';

export interface IntegritySummary {
  readonly runtimeFileCount: number;
  readonly stubCount: number;
  readonly missingCapabilityCount: number;
  readonly fallbackCount: number;
  readonly consoleCount: number;
  readonly placeholderCount: number;
  readonly reimplementationCount: number;
}

const NOT_IMPLEMENTED_PATTERN = /\b(not implemented|not-yet-supported)\b/i;

/**
 * Placeholder detection is by FORM, not by any prose that merely NAMES the
 * forbidden words. The anti-placeholder machinery (rule ids, gate summaries,
 * diagnostic copy, and the gauntlet `no-placeholder` gate's OWN docstrings +
 * red/green fixtures) is full of the marker words while being the OPPOSITE of a
 * placeholder — flagging those is a false positive the precise detector must
 * never make. The discrimination MIRRORS that gate's proven design
 * (`packages/gauntlet/src/gates/no-placeholder.ts` + `code-only.ts`), the repo's
 * source of truth for "is this a real placeholder?":
 *
 *   • COMMENTS — a genuine task marker is a DIRECTIVE: a marker keyword that is
 *     the LEADING token of a comment LINE (after the opener `//`/`/*`/jsdoc `*`
 *     and whitespace only). A marker mid-prose, fused into an identifier
 *     (`ADR-`+keyword), in a slash-enumeration of the marker NAMES
 *     (`<kw> / <kw> / …`), or quoted as an EXAMPLE deeper inside a docblock line
 *     (`* - \`// <kw>: …\``) is NOT a directive — its line does not LEAD with the
 *     marker. (This is exactly why the gate scans per comment line, not anywhere.)
 *   • STRING LITERALS — a marker keyword inside a STRING is description, a
 *     fixture, or data, never a runtime placeholder (the gate blanks strings for
 *     precisely this reason). The ONE genuine string placeholder is lorem-ipsum
 *     FILLER COPY shipped as real text — that, and only that, is flagged in a
 *     literal. (A thrown "not implemented" stub is caught separately, in CODE,
 *     by {@link NOT_IMPLEMENTED_PATTERN}.)
 *
 * This module deliberately never writes a marker keyword as the leading token of
 * one of its own comment lines, the same self-discipline the gate keeps, so the
 * detector stays clean against itself.
 */
const MARKER = '(?:TODO|FIXME|XXX|HACK)';

/**
 * A placeholder DIRECTIVE on a single comment line: line start, optional
 * whitespace, a comment opener (`//`, `/*`, or a leading jsdoc `*`), whitespace,
 * then a marker keyword as a whole word — but NOT immediately followed by a
 * `/` or `|` (a slash/pipe enumeration of the marker NAMES) nor a second marker
 * keyword. Applied with the `m` flag to a comment's full text, so a marker that
 * merely LEADS some line of a block comment is caught while one quoted mid-line
 * (an example, prose, or an identifier suffix) is not.
 */
const DIRECTIVE_MARKER_LINE = new RegExp(
  `^\\s*(?:\\/\\/+|\\/\\*+|\\*+)\\s*${MARKER}\\b(?!\\s*[/|])(?!\\s*${MARKER}\\b)`,
  'm',
);

/** Lorem-ipsum filler — the one genuine placeholder a string literal can carry. */
const LOREM_IPSUM_PATTERN = /\blorem ipsum\b/i;

/**
 * Enumerate every comment in a source file (single- and multi-line, leading and
 * trailing) without misreading `//` or `/* *\/` sequences inside string/template
 * literals — the scanner tokenises, so literal contents are never seen as
 * comments. Returns each comment's text and its absolute start offset.
 */
function collectComments(text: string): ReadonlyArray<{ readonly text: string; readonly pos: number }> {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  const comments: Array<{ readonly text: string; readonly pos: number }> = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) {
      comments.push({ text: scanner.getTokenText(), pos: scanner.getTokenStart() });
    }
    token = scanner.scan();
  }
  return comments;
}

function isConsoleCall(node: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'console'
  );
}

function getStringLikeText(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function findStringLiteral(node: ts.Node, pattern: RegExp): string | null {
  let matched: string | null = null;
  const visit = (child: ts.Node): void => {
    const text = getStringLikeText(child);
    if (text && pattern.test(text)) {
      matched = text;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return matched;
}

function findCatchReturn(clause: ts.CatchClause): ts.ReturnStatement | null {
  const block = clause.block;
  let sawThrow = false;
  let found: ts.ReturnStatement | null = null;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isThrowStatement(node)) {
      sawThrow = true;
    }
    if (ts.isReturnStatement(node) && node.expression && isSimpleDefaultExpression(node.expression)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(block, visit);
  if (sawThrow) return null;
  // A catch block that CONSUMES its error binding (emits it, wraps it,
  // attaches it to a receipt) before returning a default has surfaced the
  // failure context — that is a deliberate degradation contract, not
  // laundering. Only flag blocks that ignore the error entirely: either no
  // binding at all (`catch {`) or a binding that is never meaningfully read.
  // Qodo + Codex (PR #11): a meaningful read excludes declaration names,
  // property positions (`obj.e`, `{ e: ... }`), and `void e` discards; it
  // must occur BEFORE the flagged return or INSIDE its returned expression
  // (a value that embeds the error has surfaced it; dead code after the
  // return never runs) and OUTSIDE nested function bodies (an uncalled
  // closure surfaces nothing); any same-name declaration inside the block
  // shadows the binding, so no occurrence is credited (without symbol
  // resolution, conservative-and-flagging beats crediting the wrong
  // variable).
  if (found && clause.variableDeclaration && ts.isIdentifier(clause.variableDeclaration.name)) {
    const returnStart = (found as ts.ReturnStatement).getStart();
    const returnEnd = (found as ts.ReturnStatement).getEnd();
    const bindingName = clause.variableDeclaration.name.text;
    let bindingUsed = false;
    let shadowed = false;
    const isDeclarationName = (id: ts.Identifier): boolean => {
      const parent = id.parent;
      return (
        (ts.isVariableDeclaration(parent) ||
          ts.isParameter(parent) ||
          ts.isBindingElement(parent) ||
          ts.isFunctionDeclaration(parent) ||
          ts.isClassDeclaration(parent)) &&
        parent.name === id
      );
    };
    const isPropertyPosition = (id: ts.Identifier): boolean => {
      const parent = id.parent;
      return (
        (ts.isPropertyAccessExpression(parent) && parent.name === id) ||
        (ts.isPropertyAssignment(parent) && parent.name === id) ||
        (ts.isQualifiedName(parent) && parent.right === id)
      );
    };
    const scan = (node: ts.Node, inNestedFunction: boolean): void => {
      if (ts.isIdentifier(node) && node.text === bindingName) {
        if (isDeclarationName(node)) {
          shadowed = true;
        } else if (
          !inNestedFunction &&
          (node.getStart() < returnStart || node.getEnd() <= returnEnd) &&
          !isPropertyPosition(node) &&
          !ts.isVoidExpression(node.parent)
        ) {
          bindingUsed = true;
        }
      }
      const crossesFunctionBoundary =
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node);
      ts.forEachChild(node, (child) => scan(child, inNestedFunction || crossesFunctionBoundary));
    };
    ts.forEachChild(block, (child) => scan(child, false));
    if (bindingUsed && !shadowed) return null;
  }
  return found;
}

export function runIntegrityAudit(
  profile: DevopsProfile = liteshipDevopsProfile,
): AuditSectionResult<IntegritySummary> {
  const sourceRecords = readProfileSourceFileRecords(profile);
  const rawFindings: AuditFinding[] = [];
  let stubCount = 0;
  let missingCapabilityCount = 0;
  let fallbackCount = 0;
  let consoleCount = 0;
  let placeholderCount = 0;
  let reimplementationCount = 0;

  for (const record of sourceRecords) {
    const internalImports = new Map<string, number>();
    const identifierUsage = new Map<string, number>();
    let localImplementationCount = 0;

    const visit = (node: ts.Node): void => {
      if (
        ts.isImportDeclaration(node) &&
        node.importClause &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        if (specifier.startsWith(profile.internalPackagePrefix)) {
          if (node.importClause.name) {
            internalImports.set(node.importClause.name.text, node.importClause.name.getStart());
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              internalImports.set(
                node.importClause.namedBindings.name.text,
                node.importClause.namedBindings.name.getStart(),
              );
            } else {
              node.importClause.namedBindings.elements.forEach((element) => {
                internalImports.set(element.name.text, element.name.getStart());
              });
            }
          }
        }
      }

      if (
        (ts.isFunctionDeclaration(node) && node.body) ||
        ts.isClassDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)
      ) {
        localImplementationCount += 1;
      }

      if (ts.isIdentifier(node)) {
        identifierUsage.set(node.text, (identifierUsage.get(node.text) ?? 0) + 1);
      }

      if (ts.isCallExpression(node) && isConsoleCall(node)) {
        const { line, column } = lineAndColumn(record.sourceFile, node.getStart());
        consoleCount += 1;
        rawFindings.push({
          id: `integrity/console/${record.relativePath}:${line}:${column}`,
          section: 'integrity',
          rule: 'console-call',
          severity: 'warning',
          title: 'Raw console call in runtime source',
          summary:
            "Raw console.* call in package source. Route it through your project's diagnostics " +
            'channel, or suppress this file with a console-call allowlist entry ' +
            "(rule: 'console-call', package, filePrefix, reason) in the profile.",
          location: {
            file: record.relativePath,
            line,
            column,
          },
        });
      }

      if (ts.isThrowStatement(node) && node.expression) {
        const message = findStringLiteral(node.expression, NOT_IMPLEMENTED_PATTERN);
        if (message) {
          const { line, column } = lineAndColumn(record.sourceFile, node.getStart());
          stubCount += 1;
          rawFindings.push({
            id: `integrity/stub/${record.relativePath}:${line}:${column}`,
            section: 'integrity',
            rule: 'stub-marker',
            severity: 'error',
            title: 'Runtime stub marker found',
            summary: `Throw path still signals an unimplemented runtime path: "${message}".`,
            location: {
              file: record.relativePath,
              line,
              column,
            },
          });
        }
      }

      if (ts.isCallExpression(node)) {
        const message = node.arguments
          .map((argument) => getStringLikeText(argument))
          .find((value): value is string => Boolean(value));
        if (message && NOT_IMPLEMENTED_PATTERN.test(message)) {
          const { line, column } = lineAndColumn(record.sourceFile, node.getStart());
          missingCapabilityCount += 1;
          rawFindings.push({
            id: `integrity/capability/${record.relativePath}:${line}:${column}`,
            section: 'integrity',
            rule: 'missing-runtime-capability',
            severity: 'warning',
            title: 'Runtime path reports missing capability',
            summary: `Code path still advertises a missing or partial capability: "${message}".`,
            location: {
              file: record.relativePath,
              line,
              column,
            },
          });
        }
      }

      if (ts.isCatchClause(node) && node.block) {
        const returned = findCatchReturn(node);
        if (returned) {
          const { line, column } = lineAndColumn(record.sourceFile, returned.getStart());
          fallbackCount += 1;
          rawFindings.push({
            id: `integrity/fallback/${record.relativePath}:${line}:${column}`,
            section: 'integrity',
            rule: 'fallback-laundering',
            severity: 'warning',
            title: 'Catch block returns a simple default',
            // The `returns ${...}` phrase is load-bearing: shipped and downstream
            // allowlist entries match on summaryIncludes 'returns null'/'returns false'.
            summary:
              `Catch block ignores its error and returns ${nodeText(returned.expression!, record.sourceFile)}. ` +
              `Consume the binding before returning (wrap it, attach it to the result, or rethrow) — or, ` +
              `if the silent default is the designed contract, add a fallback-laundering allowlist entry ` +
              `with a reason so it classifies as suppressed-with-reason.`,
            location: {
              file: record.relativePath,
              line,
              column,
            },
          });
        }
      }

      const literalText = getStringLikeText(node);
      const literalHasLorem = literalText !== null && LOREM_IPSUM_PATTERN.test(literalText);
      if (ts.isDebuggerStatement(node) || literalHasLorem) {
        const { line, column } = lineAndColumn(record.sourceFile, node.getStart());
        placeholderCount += 1;
        rawFindings.push({
          id: `integrity/placeholder/${record.relativePath}:${line}:${column}`,
          section: 'integrity',
          rule: 'placeholder-content',
          severity: 'warning',
          title: 'Placeholder or debug marker found',
          summary: ts.isDebuggerStatement(node)
            ? 'Debugger statement should not survive in runtime package source.'
            : `String literal ships lorem-ipsum filler copy as real content: "${literalText!}".`,
          location: {
            file: record.relativePath,
            line,
            column,
          },
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(record.sourceFile);

    // Comments are trivia — the AST visit above never sees them, so a real
    // placeholder directive in a `//` or block comment would ship undetected.
    // Scan every comment for a leading-token marker on one of its lines, locating
    // the marker precisely (a directive on line 3 of a block comment reports line 3,
    // not the comment's opening line).
    for (const comment of collectComments(record.text)) {
      const match = DIRECTIVE_MARKER_LINE.exec(comment.text);
      if (!match) continue;
      const markerOffset = comment.pos + match.index;
      const { line, column } = lineAndColumn(record.sourceFile, markerOffset);
      placeholderCount += 1;
      rawFindings.push({
        id: `integrity/placeholder/${record.relativePath}:${line}:${column}`,
        section: 'integrity',
        rule: 'placeholder-content',
        severity: 'warning',
        title: 'Placeholder or debug marker found',
        summary: `Comment line leads with an unresolved task marker (TODO/FIXME/XXX/HACK): "${match[0].trim()}".`,
        location: {
          file: record.relativePath,
          line,
          column,
        },
      });
    }

    const unusedInternalImports = [...internalImports.keys()].filter((name) => (identifierUsage.get(name) ?? 0) <= 1);
    if (unusedInternalImports.length > 0 && localImplementationCount > 0) {
      reimplementationCount += 1;
      rawFindings.push({
        id: `integrity/reimplementation/${record.relativePath}`,
        section: 'integrity',
        rule: 'suspicious-reimplementation',
        severity: 'warning',
        title: 'Internal helper import is unused next to local implementation logic',
        summary: `Unused internal import(s) ${unusedInternalImports.join(', ')} sit beside local implementation code, which is a reimplementation smell worth reviewing.`,
        location: {
          file: record.relativePath,
          line: 1,
          column: 1,
        },
      });
    }
  }

  const partitioned = partitionAllowlistedFindings(rawFindings, profile);
  return {
    section: 'integrity',
    summary: {
      runtimeFileCount: sourceRecords.length,
      stubCount,
      missingCapabilityCount,
      fallbackCount,
      consoleCount,
      placeholderCount,
      reimplementationCount,
    },
    findings: partitioned.findings,
    suppressed: partitioned.suppressed,
  };
}
