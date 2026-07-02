# 03 — Cast the same state to ARIA, not just CSS

The define-once-cast-many thesis, applied to **accessibility**.

One boundary (`nav`) quantizes viewport width into `compact` / `wide`. A single
`@quantize nav { ... }` block casts those same states to two targets:

- **CSS** — the menu's layout (a stacked rail vs a full row);
- **`@aria`** — the disclosure's `aria-expanded`, so assistive tech reads the same truth
  the pixels do.

There's no duplicated breakpoint and no JavaScript syncing an attribute to a media query.
Change the threshold once and **both** the layout and the semantics follow — they can't
drift, because they're one source.

```css
@quantize nav {
  compact {
    .menu { flex-direction: column; }
    @aria { aria-expanded: "false"; }
  }
  wide {
    .menu { flex-direction: row; }
    @aria { aria-expanded: "true"; }
  }
}
```

## Run it

```sh
pnpm --filter @czap/example-cast-aria dev
```

Resize the window and inspect the `<nav>` — `aria-expanded` flips with the breakpoint,
driven by the same boundary as the CSS.
