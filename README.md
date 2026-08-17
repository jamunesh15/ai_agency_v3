# aiagency.so

Design pass for the aiagency.so rebuild. Plain HTML and CSS, no build step, no
framework. Open `index.html` in a browser and it works.

## Pages

| File | URL | What it is |
|---|---|---|
| `index.html` | `/` | Home, with the capability map |
| `services.html` | `/services` | Services, radial diagram and the code panel |
| `pricing.html` | `/pricing` | Three tiers and the engagement steps |
| `blog.html` | `/blog` | Engineering notes index |
| `contact.html` | `/contact` | Contact methods and the scheduler |
| `privacy.html` / `terms.html` | | Legal stubs, need real copy |

## The three shared files

- **`styles.css`** the whole design system. The token block at the top is the
  only place colours, spacing and type sizes are defined. Change `--accent`
  there and it changes everywhere.
- **`aa-motion.js` / `aa-motion.css`** the animation library. Everything is
  driven by data attributes, so the markup never mentions how an animation
  works: `data-reveal`, `data-draw`, `data-flow`, `data-marquee`,
  `data-typewriter`, `data-count`, `data-nav`, `data-accordion`.
- **`aa-map.js`** the dotted world map, its cursor spotlight and the
  hover-to-connect behaviour.

Icons come from Lucide over CDN. Fonts are Inter Tight and JetBrains Mono.

## Editing content

All copy is plain text in the HTML. Search for the words you see on the page
and change them. Nothing is generated.

To rewire the capability map on Home, edit the markup only: each node carries
`data-node="wf"` and each connector `data-link="wf ag"`. The hover behaviour
reads the graph from those attributes.

## Still placeholder before this goes live

- Pricing: tier names, both prices, every feature line, and two FAQ answers
- Contact: `data-cal-link` on the booking card, the WhatsApp number, location
- Blog: all seven post titles, tags and read times
- Home: the twelve client names in the scrolling rows, and the four stat numbers
- Services: the eight service names
- `privacy.html` and `terms.html`: real legal copy

Anything invented is marked with a `PLACEHOLDER` or `REPLACE:` comment in the
HTML.

## Local preview

```bash
python -m http.server 8899
```

Then open `http://localhost:8899`.

## Deploying

`vercel.json` sets `cleanUrls`, so `/services.html` serves as `/services`.
No build command and no output directory: Vercel serves the repo root as-is.
