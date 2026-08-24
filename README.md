# aiagency.so

Plain HTML and CSS, no build step, no framework. Open `index.html` in a browser
and it works.

**Design rules, tokens and the list of rejected directions live in
[`DESIGN.md`](DESIGN.md). Read that before changing anything visual.**

## Pages

| File | URL | What it is |
|---|---|---|
| `index.html` | `/` | Home: centred hero, flow canvas, agents canvas, inputs diagram, process, FAQ |
| `services.html` | `/services` | Centred hero, then the radial service diagram |
| `pricing.html` | `/pricing` | Three tiers and the engagement steps |
| `blog.html` | `/blog` | Engineering notes index |
| `contact.html` | `/contact` | Headline and the embedded Cal.com calendar |
| `privacy.html` / `terms.html` | | Legal pages, structure done, copy still placeholder |

## The shared files

- **`home.css`** the whole design system. The `:root` block at the top is the
  only place colours, spacing, type and radius are defined.
- **`aa-motion.js` / `aa-motion.css`** the animation library. Everything is
  driven by data attributes, so the markup never says how an animation works:
  `data-reveal`, `data-draw`, `data-flow`, `data-orbit`, `data-count`,
  `data-nav`, `data-accordion`, `data-marquee`, `data-typewriter`,
  `data-loop`, `data-copy`.

Icons come from Lucide over CDN. Fonts are Inter Tight, Source Serif 4,
JetBrains Mono and Syne.

`styles.css` and `aa-map.js` are the old v1 design and are no longer loaded by
any page. They can be deleted.

## Booking

Every call to action on the site links to `contact.html#book`, the Cal.com
inline embed. The event is `chirag-lathiya/ai-agency`. The embed is skinned to
our palette by feeding the same white values to both its light and dark themes,
because it otherwise follows the visitor's system preference.

## Editing content

All copy is plain text in the HTML. Search for the words you see on the page
and change them. Nothing is generated.

## Still placeholder before this goes live

- WhatsApp is `wa.me/000000000000` in 13 places
- LinkedIn and X hrefs are `REPLACE`
- `pricing.html` renders literal `[PLACEHOLDER: ...]` in two FAQ answers
- `og:image` points at `/og.png`, which does not exist
- `privacy.html` and `terms.html` need real legal copy
- The "What we build" footer links all land on `services.html`

Anything invented is marked with a `PLACEHOLDER` or `REPLACE:` comment in the
HTML.

## Local preview

```bash
python dev-server.py
```

Serves on `http://localhost:8899` with no-store headers, so a refresh always
shows the current file.

## Deploying

`vercel.json` sets `cleanUrls`, so `/services.html` serves as `/services`.
No build command and no output directory: Vercel serves the repo root as-is.
