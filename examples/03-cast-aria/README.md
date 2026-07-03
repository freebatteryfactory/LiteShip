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

## No first-paint drift — the server resolves the viewport

`@quantize` compiles the CSS to a **container query** that reacts to the real viewport
_instantly_, with no JavaScript. `aria-hidden`, though, is an attribute — CSS can't set it.
If the page SSR'd a fixed guess, the two would disagree on first paint for whichever
viewport the guess got wrong (desktop sees the tagline; a screen reader is told it's
hidden), until hydration reconciled them. That's the exact drift this example is about.

So the page is **server-rendered** and resolves the state per request:

```ts
const initialState = resolveInitialState(nav, { clientHints, userAgent });
// -> reads Sec-CH-Viewport-Width; the czap middleware asks for it via Critical-CH,
//    so the browser resends it BEFORE the first render — cold visits included.
<Satellite boundary={nav} initialState={initialState} class="extra"> … </Satellite>
```

Now the SSR'd `data-czap-state` (and the `aria-hidden` it carries) already matches the
container-query CSS at byte one. The pixels and the accessibility state agree from the
first paint, not after a client reconcile.

## Run it

```sh
pnpm --filter @czap/example-cast-aria dev
```

Resize the window and inspect the `.extra` element — `aria-hidden` flips with the
breakpoint, driven by the same boundary as the CSS, and it's already right for your
viewport on the very first paint.
