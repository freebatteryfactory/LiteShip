# create-liteship

Scaffold a minimal [Astro](https://astro.build) + [LiteShip](https://github.com/freebatteryfactory/LiteShip) project — the "first five minutes" of constraint-based adaptive rendering, working on the first `pnpm dev`.

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
├── README.md                           # define → apply → inspect and run instructions
├── astro.config.ts                     # liteship/astro integration
├── liteship.config.ts                  # one project configuration hub
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    ├── adaptive.ts                     # one 14-line Adaptive definition
    ├── layouts/Base.astro              # ordinary page shell
    └── pages/index.astro               # apply attrs/CSS and inspect the selected state
```

The starter teaches exactly three moves: `defineAdaptive` defines the behavior,
`layout.attrs()` and `layout.plan()` apply it, and `layout.explain()` inspects the
decision. The generated attributes and CSS share the same definition; there is no
query-container or directive setup hidden in the page shell.

## Next steps (printed after scaffolding)

```sh
cd my-liteship-app
pnpm install   # or npm install
pnpm dev       # or npm run dev
pnpm check     # or npm run check
```

Then edit `src/adaptive.ts` — add a state once and both the compiled CSS and the
runtime pick it up.

For structured LLM UI (optional), use the installed `liteship/genui` expert
subpath and follow [GETTING-STARTED — Generated UI](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md#generated-ui-with-a-component-catalog).

## License

MIT
