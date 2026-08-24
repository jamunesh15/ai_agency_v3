# aiagency.so design system

The rules this site is built on, why each one exists, and the list of things
already tried and rejected. Read section 5 before proposing anything: most of
it looks like a good idea until you know it was built once already.

Everything visual lives in **`home.css`**. The `:root` block at the top is the
only place colour, spacing, type and radius are defined. Nothing below it
should carry a raw hex, or a raw pixel value for layout spacing or type size.

---

## 1. The brief

Light theme only. Charcoal on white and warm beige. The first version was
called "cliche design" and "AI slop" and thrown away. The references that
replaced it: **Questo**, **Forja**, **ToDesktop**, **customer.io**,
**Cartesia**, **better-auth.com**, **natural.com**, **opencode.ai**.

The footer is built from the `moventa-ai-footer-component` reference, kept
locally and not committed.

What the site sells: **complete projects**, scoped and handed over. Not a
monthly retainer. Copy is concrete, never clever fragments.

---

## 2. Tokens

### Colour

| Token | Value | Use |
|---|---|---|
| `--surface` | `#FFFFFF` | cards and panels, the top layer |
| `--sheet` | `#FFFFFF` | the content sheet |
| `--beige-soft` | `#F9F7F1` | lightest beige |
| `--band` | `#F7F5EE` | section surfaces |
| `--frame` | `#F3F0E8` | ground behind a visual, for contrast |
| `--bg` | `#F0EBE2` | outer backdrop, the deepest |
| `--beige-deep` | `#EAE5DA` | strongest beige |
| `--ink` | `#2B2722` | warm charcoal, never pure black |
| `--ink-2` | `#5E574C` | body copy |
| `--ink-3` | `#8F8878` | muted text and labels |
| `--paper` | `#FFFFFF` | text and marks ON a charcoal plate |
| `--line` | `#E4DED0` | hairlines |
| `--line-strong` | `#D3CAB7` | panel borders |

`--surface` and `--sheet` are the same value, so a card on the sheet separates
only by its border. That is deliberate. Do not "fix" it by tinting one.

There is **no accent colour**. `--accent` is charcoal. The green `#3ECF8E` the
site once carried is gone from every file.

### Type

- `--sans` **Inter Tight**, weights 400 to 800. Every heading and all UI.
- `--serif` **Source Serif 4**. Article and legal prose only.
- `--mono` **JetBrains Mono**. Labels, kickers, copyright, small caps.
- **Syne** 800/900. The footer wordmark only, nothing else.

Scale: `--t-title-lg` `--t-title` `--t-title-sm` `--t-head` `--t-sub` `--t-row`
`--t-num`, then `--t-lede-lg` `--t-lede` `--t-card` `--t-body` `--t-sm`
`--t-ui` `--t-xs` `--t-mono-lg` `--t-mono`.

**Any older note quoting an exact px or clamp value is stale.** Read `:root`.

### Spacing

`--s-1` (4px) through `--s-9` (80px). If a value is not on that ladder it does
not belong in the stylesheet. Section rhythm comes from `--sec-y`,
`--sec-y-sm`, `--hero-top`, `--head-gap`, `--stick-top`.

### Radius

**One radius site-wide.** `--r: 10px` for every panel, card, button and frame.
`--r-sm: 5px` for chips, tags, bars and checkboxes only, because 10px on a
12px chip turns it into a pill.

---

## 3. Layout

```
body                  --bg backdrop
└── .sheet            --panel-w, white, carries the ruled edge strips
    ├── .nav          fixed, --nav-h 72px, lives inside .sheet
    ├── main
    │   └── section   .wrap → the --wrap-w measure
    └── .foot         a normal block, NOT a positioned sibling
```

- **`--panel-w`** `min(1680px, 100%)`. Full bleed, no side gaps.
- **`--wrap-w`** `min(1180px, 100% - clamp(72px, 13vw, 260px))`. The content
  measure. **The brand mark's left edge and the CTA's right edge are the
  content boundary for every page. Nothing may run wider.**
- **Ruled edge strips.** An 88px band of horizontal hairlines down both panel
  edges, closed by a vertical rule. Tokens `--rule-strip`, `--rule-gap` (8px
  pitch), `--rule-hair`. Hidden below 1000px.

### Two rules that will bite you

1. **`--nav-h` must stay a multiple of `--rule-gap`.** The nav's bottom edge is
   a horizontal line in that same 8px field. Off-pitch it reads as a jog.
2. **The strips are drawn once, on `.sheet`.** A `repeating-linear-gradient`
   restarts at its own element's top edge, so a second copy on the footer went
   out of phase with the sheet's and produced a visible **double line** at the
   join. That is why the footer lives *inside* the sheet.

---

## 4. Components

### Canvas family (locked)

Flat line work on a white or `--frame` panel: corner brackets, mono uppercase
boxes, dashed connectors. A diagram sits inside a **painted frame**
(`.flow-frame`) carrying one of the supplied textures. One texture per frame,
never repeated:

| Texture | Frame |
|---|---|
| `new_backdrop` green | home hero |
| `b3` burgundy | home agents |
| `b4` terracotta | home inputs diagram |
| `b2` teal | services radial |
| `b7` amber | pricing tiers |
| `b5` sage | spare, unused |

Each page preloads only the textures it renders. Frames fall back to
`--beige-deep`, not `--ink`, because charcoal read as a black flash on load.

### Buttons

`.btn` is `height: 48px` with `padding: 0 24px`. **The height is hard-coded**,
so padding alone will not shrink a button. Override `height` as well.

Charcoal fill for primary, outlined for ghost, 10px radius, **never pills**.

### Footer

Four equal lanes (`span 3` of a 12-column grid) divided by full-height rules,
then the wordmark row closed by a rule top and bottom, then a three-part base
row. The wordmark morphs `AI AGENCY` into `SINCE 2016` on hover: 620ms on
`cubic-bezier(0.16, 1, 0.3, 1)`, pure CSS, both states stacked in one grid cell
so nothing reflows.

**Anything non-text placed in a footer lane must opt out of the column rules.**
`.foot-col a:not(.btn)` scores 0,2,1 and will otherwise force `display: block`,
block padding and a hover underline onto it. That has caused two bugs already:
an invisible black button, and mangled social icons.

### Motion

`aa-motion.js` primitives, all driven by data attributes:
`data-reveal`, `data-draw`, `data-flow`, `data-orbit`, `data-count`,
`data-nav`, `data-accordion`, `data-marquee`, `data-typewriter`, `data-loop`,
`data-copy`.

- `data-reveal-group="MS"` staggers direct `[data-reveal]` children.
- `data-loop="MS"` replays a finished sequence while it is on screen using
  `.aa-run`, **not** `.aa-in`. Toggling `.aa-in` re-fires the reveal fade and
  reads as a blink.
- **Never put `data-reveal` on anything at the fold.** The IntersectionObserver
  does not fire reliably there and the element stays at opacity 0.

---

## 5. Rejected. Do not rebuild.

- **Graph-paper and square-grid backgrounds** outside the canvas family. Called
  "the biggest AI slop".
- **The giant wordmark.** Killed three times before the current morph banner
  was accepted in the footer.
- **Footer artwork of bots wired together.** Built twice, rejected twice: as an
  overlay it ran through the link columns, and as its own band it was turned
  down outright. A sketch of its layout is not approval to rebuild it.
- **Green dots as decoration.** **Cream or warm off-white.** **Pill buttons.**
- **3D and isometric renders.** This site is flat.
- **Device mockups and screenshots.**
- **Big manifesto statement sections.** **Section kickers**, all 13 removed.
- **A beige footer card**, then **a white card with border and shadow**. Both
  tried, both rejected. The footer sits directly on the sheet.
- **The morph firing from the CTA.** The reference does it; we do not. The
  banner answers only to the banner.

## 6. Rules the CEO set

- **If you add strips, remove the dividers.** No full-width horizontal band or
  rule may cross the ruled edge strips.
- **Beige is only ever a contained box**, never a full-bleed band.
- **The current nav item must not read darker or heavier.** `aria-current` is
  kept for screen readers with no visual treatment.
- **Fill empty space with new content, never stretch an existing component.**
- **Tight section gaps.** Large empty vertical gaps have been flagged
  repeatedly.
- **Hero headlines: two lines maximum at any width.**
- **Never replace a component that was asked for.** Improve it in place, or ask.
- **Sample content must never read as a business claim.** No invented response
  times, guarantees or refund policies, including in captions.
- **No em dashes anywhere.** Do not count things in headings.

---

## 7. Launch blockers

| # | Blocker |
|---|---|
| 1 | WhatsApp is `wa.me/000000000000` in 13 places |
| 2 | LinkedIn and X hrefs are `REPLACE` |
| 3 | `pricing.html` renders literal `[PLACEHOLDER: ...]` in two FAQ answers |
| 4 | `og:image` points at `/og.png`, which does not exist. No social preview |
| 5 | `privacy.html` and `terms.html` carry bracketed placeholder copy |
| 6 | The eight "What we build" footer links all land on `services.html` |

Resolved: the legal pages are on the current design, and the contact form is
gone in favour of the Cal.com embed, so the dead Formspree endpoint went with
it.

---

## 8. Working notes

- **Never cut CSS by position between two markers.** Match the block. Slicing
  by index has silently deleted live rules, and once ate a closing brace, which
  nested half the stylesheet inside a media query.
- **Verify structural edits programmatically.** A tag-depth check that returns
  to zero, and a brace-balance check on the CSS, catch what the eye does not.
- **Search by pattern, not by value, and scope the search.** A string that
  appears in both a hero and a footer will match the wrong one. That is how a
  footer button block ended up above `<!doctype html>`.
- **Measure, do not estimate, font metrics.** Sizing the wordmark from a
  guessed glyph width rendered it 1.6x too wide and it bled across the page.
