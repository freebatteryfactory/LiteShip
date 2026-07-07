[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SKIP\_CAPABILITIES

# Variable: SKIP\_CAPABILITIES

> `const` **SKIP\_CAPABILITIES**: readonly \[`"ffmpeg-absent"`, `"wasm-absent"`, `"wasm-dist-staged"`, `"shared-array-buffer-absent"`, `"coverage-instrumentation"`, `"astro-example-not-built"`, `"offscreen-canvas-absent"`, `"gpu-absent"`, `"eacces-untestable-as-root"`\]

Defined in: [gauntlet/src/gates/skip-allowlist.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L53)

The closed set of CAPABILITIES whose absence sanctions a skip. Each names a real,
environment-detectable resource the skipped test genuinely requires — never a stand-in
for unfinished work. The reason is recorded on the standards surface so the owner reads
the WHY without opening the file.
