# create-liteship

Scaffold a minimal [Astro](https://astro.build) + [`@czap`](https://github.com/heyoub/LiteShip) project — the "first five minutes" of constraint-based adaptive rendering, working on the first `pnpm dev`.

## One command

```sh
npm create liteship
# or
pnpm create liteship my-liteship-app
```

With no directory argument you are prompted (default: `my-liteship-app`). The target must be empty or not exist yet — scaffolding never overwrites your files.

## What it scaffolds

A complete adaptive loop in eight files:

```
my-liteship-app/
├── astro.config.ts                     # @czap/astro integration, boundary/token dirs wired
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    ├── boundaries/layout.boundaries.ts # ONE Boundary: viewport.width → mobile/tablet/desktop
    ├── tokens/base.tokens.ts           # design tokens (compiled to --czap-* custom properties)
    ├── layouts/Base.astro              # @token blocks resolve against the token defs
    └── pages/index.astro               # ONE Satellite element + ONE @quantize block
```

The page's `satelliteAttrs({ boundary: layout })` element and its `@quantize layout { ... }` style block share the **same** boundary export: the `@quantize` block compiles to static `@container` queries at build time, and the satellite runtime drives `data-czap-state` updates on the client. Resize across 768px / 1280px and watch both halves agree.

## Next steps (printed after scaffolding)

```sh
cd my-liteship-app
pnpm install   # or npm install
pnpm dev       # or npm run dev
```

Then edit `src/pages/index.astro` — add a state to the boundary in `src/boundaries/layout.boundaries.ts` and both the compiled CSS and the runtime pick it up.

## License

MIT
