# create-liteship

Scaffold a minimal [Astro](https://astro.build) + [`@liteship`](https://github.com/freebatteryfactory/LiteShip) project — the "first five minutes" of constraint-based adaptive rendering, working on the first `pnpm dev`.

## One command

```sh
npm create liteship
# or
pnpm create liteship my-liteship-app
```

With no directory argument you are prompted (default: `my-liteship-app`). The target must be empty or not exist yet — scaffolding never overwrites your files.

## What it scaffolds

A complete adaptive loop in nine files:

```
my-liteship-app/
├── README.md                           # run instructions + optional @liteship/genui path
├── astro.config.ts                     # @liteship/astro integration, boundary/token dirs wired
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    ├── boundaries/layout.boundaries.ts # ONE Boundary: viewport.width → mobile/tablet/desktop
    ├── tokens/base.tokens.ts           # design tokens (compiled to --liteship-* custom properties)
    ├── layouts/Base.astro              # @token blocks resolve against the token defs
    └── pages/index.astro               # ONE Satellite element + ONE @quantize block
```

The page's `satelliteAttrs({ boundary: layout })` element and its `@quantize layout { ... }` style block share the **same** boundary export: the `@quantize` block compiles to static `@container` queries at build time, and the satellite runtime drives `data-liteship-state` updates on the client. Resize across 768px / 1280px and watch both halves agree.

## Next steps (printed after scaffolding)

```sh
cd my-liteship-app
pnpm install   # or npm install
pnpm dev       # or npm run dev
```

Then edit `src/pages/index.astro` — add a state to the boundary in `src/boundaries/layout.boundaries.ts` and both the compiled CSS and the runtime pick it up.

For structured LLM UI (optional), add `@liteship/genui` and follow [GETTING-STARTED — Generated UI](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md#generated-ui-with-a-component-catalog). The scaffold's `README.md` repeats the install line.

## License

MIT
