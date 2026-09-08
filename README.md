# The Upper Crust Pizzeria Türkiye

Redesign concept for The Upper Crust Pizzeria Türkiye (Bebek and Maslak, Istanbul), built to pitch to the brand. Copy, photography, logo and facts come from the official site (uppercrustturkiye.com) and its Instagram; the concept adds a client-side order tray that hands off to the official ordering page.

Independent design concept, not an official Upper Crust website. Photography and copy belong to the brand owner (see `images/official/SOURCES.md`).

## Run

No build step. Serve the folder with any static server:

```bash
npx serve . -p 8090
```

Then open http://localhost:8090.

## Stack

- HTML, CSS, vanilla JavaScript. No framework, no bundler.
- GSAP 3.12 + ScrollTrigger (cdnjs) for scroll-driven motion, Lenis (jsdelivr) for smooth scrolling on fine-pointer devices. Every effect degrades to a static page if a CDN is blocked or `prefers-reduced-motion` is set.
- Fonts from Google Fonts: Prata (display), Manrope (body), Cinzel (wordmark), Cairo (Arabic).
- Native `<dialog>` for the dish and tray panels, View Transitions for menu filtering where supported.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Page structure and static copy (Turkish defaults) |
| `css/style.css` | Design tokens and all styling |
| `js/data.js` | Menu records: 66 items, prices in TRY, sizes S 23 cm / L 37 cm / XXL 47 cm |
| `js/i18n.js` | UI strings in TR, EN, AR (RTL), RU, DE |
| `js/app.js` | Menu, size lens, dish dialog, tray, half-and-half builder, opening hours, GSAP motion |
| `images/official/` | Photography and logos from the brand's media library |
| `images/social/` | Instagram posts shown on the official homepage |
| `images/stock/`, `video/` | Pexels stock (free license), sources listed in `video/SOURCES.md` |

## What moves

- **Intro curtain** (once per session): the bicycle logo, then two panels part like an oven door.
- **Video hero**: wood-fired oven flames behind the pizza, with a canvas of drifting embers.
- **Custom cursor** on desktop that grows over links and turns into a "drag to spin" label over the builder.

- **Hero slice pull.** The hero pins while you scroll; one slice lifts out of the pizza toward the headline with mozzarella strands (SVG paths under a gooey filter) that stretch, thin and snap.
- **Cheese drips** over the red mural band, ambient and slow.
- **Mural marquee** ("One slice at a time / Happiness", the wall in the Maslak branch) that speeds up with scroll velocity.
- **Pinned horizontal timeline**: Çırağan 2009, Bebek 2011, Maslak 2017, today.
- **Half-and-half builder** from the brand's own promise ("Yarısını ondan, yarısını bundan"): the pizza assembles itself as you scroll in (dough, sauce, cheese, toppings), halves are picked from photo carousels and swap with a radial wipe, you drag the pizza to spin it (with inertia), base and crust toggles ripple, the price rolls, and the finished pizza flies into the tray.
- **Statement**: a portrait cheese-pull video beside "Bir dilim yeter."
- **Menu**: size lens that reprices the whole list, search, dietary filters, a floating photo that follows the cursor over rows that have one.
- **Live opening status** per branch, computed in Europe/Istanbul time from the published hours.
- Parallax, word-by-word heading reveals, card lifts. Keyboard: `/` focuses the menu search.
