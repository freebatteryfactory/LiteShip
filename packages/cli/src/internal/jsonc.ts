import { ValidationError } from '@liteship/error';

function jsoncFailure(detail: string, offset: number): ValidationError {
  return ValidationError('parseJsonc', `${detail} at offset ${offset}`);
}

function stripComments(text: string): string {
  const output: string[] = [];
  let index = 0;
  let stringStart: number | null = null;

  while (index < text.length) {
    const char = text[index]!;
    if (stringStart !== null) {
      output.push(char);
      if (char === '\\') {
        index++;
        if (index < text.length) output.push(text[index]!);
      } else if (char === '"') {
        stringStart = null;
      }
      index++;
      continue;
    }

    if (char === '"') {
      stringStart = index;
      output.push(char);
      index++;
      continue;
    }

    if (char === '/' && text[index + 1] === '/') {
      output.push(' ', ' ');
      index += 2;
      while (index < text.length && text[index] !== '\n' && text[index] !== '\r') {
        output.push(' ');
        index++;
      }
      continue;
    }

    if (char === '/' && text[index + 1] === '*') {
      const commentStart = index;
      output.push(' ', ' ');
      index += 2;
      let closed = false;
      while (index < text.length) {
        if (text[index] === '*' && text[index + 1] === '/') {
          output.push(' ', ' ');
          index += 2;
          closed = true;
          break;
        }
        const commentChar = text[index]!;
        output.push(commentChar === '\n' || commentChar === '\r' ? commentChar : ' ');
        index++;
      }
      if (!closed) throw jsoncFailure('unterminated block comment', commentStart);
      continue;
    }

    output.push(char);
    index++;
  }

  if (stringStart !== null) throw jsoncFailure('unterminated string', stringStart);
  return output.join('');
}

function stripTrailingCommas(text: string): string {
  const output: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (inString) {
      output.push(char);
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output.push(char);
      continue;
    }

    if (char === ',') {
      let next = index + 1;
      while (next < text.length && /\s/u.test(text[next]!)) next++;
      if (text[next] === '}' || text[next] === ']') {
        output.push(' ');
        continue;
      }
    }
    output.push(char);
  }

  return output.join('');
}

function lineColumnOffset(text: string, line: number, column: number): number {
  let offset = 0;
  for (let currentLine = 1; currentLine < line && offset < text.length; currentLine++) {
    const newline = text.indexOf('\n', offset);
    if (newline < 0) return text.length;
    offset = newline + 1;
  }
  return Math.min(text.length, offset + Math.max(0, column - 1));
}

function jsonParseOffset(error: unknown, text: string): number {
  const message = error instanceof Error ? error.message : String(error);
  const position = /position\s+(\d+)/iu.exec(message)?.[1];
  if (position !== undefined) return Number(position);
  const location = /line\s+(\d+)\s+column\s+(\d+)/iu.exec(message);
  if (location?.[1] !== undefined && location[2] !== undefined) {
    return lineColumnOffset(text, Number(location[1]), Number(location[2]));
  }
  return text.length;
}

/**
 * Parse JSON with comments and trailing commas. String contents are never
 * treated as syntax; malformed or incomplete input is refused with an offset.
 */
export function parseJsonc(text: string): unknown {
  const cleaned = stripTrailingCommas(stripComments(text));
  try {
    return JSON.parse(cleaned) as unknown;
  } catch (error) {
    const offset = jsonParseOffset(error, cleaned);
    const detail = error instanceof Error ? error.message : String(error);
    throw jsoncFailure(`invalid JSON (${detail})`, offset);
  }
}
