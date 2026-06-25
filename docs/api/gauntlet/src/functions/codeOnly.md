[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / codeOnly

# Function: codeOnly()

> **codeOnly**(`src`): `string`

Defined in: [gauntlet/src/gates/code-only.ts:137](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/code-only.ts#L137)

Blank out comment and string-literal CONTENTS (replace with spaces, preserving
every newline so line numbers still align), leaving only code. A char-level
state machine over the five string/comment states plus code; handles escapes
inside strings so a `\'` does not prematurely close a single-quoted literal.

Regex literals are recognized (lookahead-based, conservative) and blanked to
spaces too — an opaque literal for every dependent gate. Blanking them prevents
a quote char inside a character class (`/(['"`])/`) from DESYNCing the
string/comment state machine for the rest of the file.

## Parameters

### src

`string`

## Returns

`string`
