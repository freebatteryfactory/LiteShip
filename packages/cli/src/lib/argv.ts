/** Pure argument primitives shared by every CLI dispatcher route. @module */

/** A value-taking flag read from argv: whether it appeared and its parsed value. */
export interface FlagValue {
  /** The flag token appeared in inline or space-separated form. */
  readonly present: boolean;
  /** Undefined only when absent or present without a usable following value. */
  readonly value: string | undefined;
}

/**
 * Read the first occurrence of a value-taking flag in either `--flag=value` or
 * `--flag value` form. A token beginning with `-` is another flag, never a value.
 */
export function takeFlagValue(argv: readonly string[], flag: string | readonly string[]): FlagValue {
  const names = typeof flag === 'string' ? [flag] : flag;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    for (const name of names) {
      if (token === name) {
        const next = argv[index + 1];
        return {
          present: true,
          value: next === undefined || next.startsWith('-') ? undefined : next,
        };
      }
      if (token.startsWith(`${name}=`)) {
        return { present: true, value: token.slice(name.length + 1) };
      }
    }
  }
  return { present: false, value: undefined };
}

/** First positional argument: argv[0] only when present and not a flag. */
export function positional(argv: readonly string[]): string | undefined {
  const first = argv[0];
  return first !== undefined && !first.startsWith('-') ? first : undefined;
}
