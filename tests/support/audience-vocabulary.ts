/** Audience-sensitive product-vocabulary policy used by prose contract tests. */

export type VocabularyAudience = 'beginner' | 'operational' | 'expert' | 'historical';

export interface VocabularySource {
  readonly id: string;
  readonly audience: VocabularyAudience;
  readonly text: string;
  readonly format?: 'prose' | 'markdown';
}

export type VocabularyViolationCode =
  'beginner-cast' | 'operational-cast' | 'expert-bare-cast' | 'historical-cast-unlabelled';

export interface VocabularyViolation {
  readonly code: VocabularyViolationCode;
  readonly sourceId: string;
  readonly line: number;
  readonly excerpt: string;
}

const CAST = /\bcast(?:s|ing|ed)?\b/gi;
const TARGET =
  /(?:CSS|GLSL|WGSL|ARIA|HTML|DOM|JSON|AI manifest|video|shader|scene|surface|output|named target|target artifact)/i;
const HISTORICAL_LABEL = /\b(?:historical(?:ly)?|retired|formerly|legacy)\b|\[historical\]/i;
const THEATRICAL_CONTEXT =
  /\b(?:actor|actors|theatrical|theatre|theater|ensemble|production|movie|film|play|show|roles?|characters?|took a bow|stage cast)\b/i;
const TYPE_CAST_CONTEXT =
  /\b(?:TypeScript|type[- ]cast(?:ing)?|type coercion|down[- ]cast|up[- ]cast|cast at (?:the )?call site|cast (?:a|the) value to (?:a )?type)\b|\bas\s+(?:unknown|never|const|[A-Z][A-Za-z0-9_]*)\b/i;

function removeNonProductText(line: string): string {
  return line
    .replace(/`[^`]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(?:[A-Za-z]:)?(?:\.{0,2}[\\/])?(?:[\w@.-]+[\\/])+[\w@.-]+/g, ' ')
    .replace(/\b[\w.-]*cast[\w.-]*\.(?:[cm]?[jt]sx?|md|json|mjs|cjs)\b/gi, ' ');
}

function isLabelledExternalQuote(line: string): boolean {
  return /^\s*>\s*\[(?:external|quoted external)\]\s*/i.test(line);
}

function isFalsePositive(line: string): boolean {
  return THEATRICAL_CONTEXT.test(line) || TYPE_CAST_CONTEXT.test(line);
}

function isTargetBearingVerb(line: string, start: number, end: number, matched: string): boolean {
  const after = line.slice(end);
  const targetBearing = /^[^.;!?]{0,80}\b(?:to|into|onto):?\s+(?:an?\s+|the\s+)?/.test(after) && TARGET.test(after);
  if (!targetBearing) return false;

  if (matched.toLowerCase() !== 'cast') return true;
  const before = line.slice(0, start).trimEnd();
  if (before.length === 0) return true;
  const previous = before.match(/([A-Za-z]+)\s*$/)?.[1]?.toLowerCase();
  if (previous === undefined) return false;
  if (['a', 'an', 'the', 'this', 'that', 'each', 'every', 'one', 'its', 'our', 'their', 'your'].includes(previous)) {
    return false;
  }
  return [
    'to',
    'can',
    'could',
    'may',
    'might',
    'must',
    'shall',
    'should',
    'will',
    'would',
    'we',
    'they',
    'you',
    'definition',
    'definitions',
    'compiler',
    'engine',
    'system',
    'pipeline',
    'adapter',
  ].includes(previous);
}

function codeFor(audience: VocabularyAudience): VocabularyViolationCode {
  if (audience === 'beginner') return 'beginner-cast';
  if (audience === 'operational') return 'operational-cast';
  if (audience === 'historical') return 'historical-cast-unlabelled';
  return 'expert-bare-cast';
}

/**
 * Classify product uses of `cast` without banning identifiers or polysemous English.
 *
 * Markdown code fences, inline code, paths, URLs, and explicitly labelled external
 * quotations are not product prose. Historical prose must still label its provenance.
 */
export function analyzeAudienceVocabulary(sources: readonly VocabularySource[]): readonly VocabularyViolation[] {
  const violations: VocabularyViolation[] = [];
  for (const source of sources) {
    let fenced = false;
    const lines = source.text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index]!;
      if (source.format === 'markdown' && /^\s*```/.test(raw)) {
        fenced = !fenced;
        continue;
      }
      if (fenced || isLabelledExternalQuote(raw)) continue;

      const line = removeNonProductText(raw);
      if (isFalsePositive(line)) continue;
      CAST.lastIndex = 0;
      for (let match = CAST.exec(line); match !== null; match = CAST.exec(line)) {
        const allowed =
          (source.audience === 'historical' && HISTORICAL_LABEL.test(line)) ||
          (source.audience === 'expert' && isTargetBearingVerb(line, match.index, CAST.lastIndex, match[0]!));
        if (!allowed) {
          violations.push({
            code: codeFor(source.audience),
            sourceId: source.id,
            line: index + 1,
            excerpt: raw.trim(),
          });
        }
      }
    }
  }
  return violations;
}
