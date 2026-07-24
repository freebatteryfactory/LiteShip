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

## First paint is server-resolved, not guessed

`@quantize` compiles the CSS to a **container query** that reacts to the real viewport
_instantly_, with no JavaScript. `aria-hidden`, though, is an attribute — CSS can't set it.
If the page SSR'd a fixed default, the two would disagree on first paint for whichever
viewport the default got wrong (desktop sees the tagline; a screen reader is told it's
hidden), until hydration reconciled them. That's the exact drift this example is about.

So the page is **server-rendered** and resolves the state per request, walking the same
ladder `resolveInitialState` uses everywhere:

```ts
const initialState = resolveInitialState(nav, { clientHints, userAgent });
<Adaptive boundary={nav} initialState={initialState} class="extra"> … </Adaptive>
```

1. **The exact `Sec-CH-Viewport-Width` client hint** when the browser sends it. Chromium
   does, and the liteship middleware's `Critical-CH` makes it resend the hint _before_ the
   first render — so the SSR'd `data-liteship-state` (and the `aria-hidden` it carries)
   matches the container-query CSS at byte one, cold visits included.
2. **A `User-Agent` estimate** when it doesn't — Firefox and Safari send no viewport hint,
   and no server can know their exact width. This nails the device class, not the window.
3. **The adaptive runtime reconciles** whatever the server couldn't nail, on load.

The common path — a hint-sending browser — is drift-free at first paint. The rest degrade
to a device-class estimate and a client reconcile, never a permanent disagreement. That
ladder _is_ the honest ceiling: an attribute the browser won't tell the server can't be
server-perfect for every client, so LiteShip gets it exact where it can and reconciles the
rest — instead of shipping a fixed guess and hoping.

## Run it

```sh
pnpm --filter @liteship/example-cast-aria dev
```

Resize the window and inspect the `.extra` element — `aria-hidden` flips with the
breakpoint, driven by the same boundary as the CSS. On a hint-sending browser it's already
right on the very first paint; elsewhere the adaptive makes it right on load.
