# 03 — Cast the same state to ARIA, not just CSS

The define-once-cast-many thesis, applied to **accessibility**.

One boundary (`nav`) quantizes viewport width into `compact` / `wide`. A single
`@quantize nav { ... }` block casts those same states to two targets **and keeps them in
lockstep**:

- **CSS** — a supplementary tagline collapses (clipped) on `compact`, expands on `wide`;
- **`@aria`** — `aria-hidden` flips with it, so a screen reader stops announcing the
  tagline exactly when it leaves the screen.

That sync is the point. Clipping with `max-height: 0` hides the tagline from sighted users
but leaves it in the accessibility tree — so a screen reader would still read it (the
classic _"visually gone, still announced"_ bug). The `@aria` cast closes the gap from the
**same** boundary: change the one threshold and both the pixels and the assistive-tech
reading move together, nothing hand-synced.

> Why `aria-hidden` and not `aria-expanded`? Nothing here is _disclosed_ — the content
> shows or hides. `aria-expanded` describes a collapsed/expanded section a control owns;
> using it for a pure show/hide would tell assistive tech something false. `aria-hidden`
> is the honest cast.

```css
@quantize nav {
  compact {
    .extra { max-height: 0; opacity: 0; }
    @aria { aria-hidden: "true"; }
  }
  wide {
    .extra { max-height: 2rem; opacity: 1; }
    @aria { aria-hidden: "false"; }
  }
}
```

## Run it

```sh
pnpm --filter @czap/example-cast-aria dev
```

Resize the window and inspect the `.extra` element — `aria-hidden` flips with the
breakpoint, driven by the same boundary as the CSS. First paint is mobile-first
(`compact`, tagline hidden); the client corrects on hydration.
