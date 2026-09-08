# The Upper Crust Pizzeria Türkiye

Single-page site for The Upper Crust Pizzeria Türkiye (Bebek and Maslak, Istanbul). Menu, story, locations, and a client-side order tray that hands off to the official online ordering page.

Independent design concept, not an official Upper Crust website.

## Run

No build step. Serve the folder with any static server:

```bash
npx serve . -p 8090
```

Then open http://localhost:8090.

## Stack

- HTML, CSS, vanilla JavaScript. No framework, no bundler, no dependencies.
- Fonts from Google Fonts: Prata (display), Manrope (body), Cinzel (wordmark), Cairo (Arabic).
- CSS scroll-driven animation for the hero disc, native `<dialog>` for the dish and tray panels, View Transitions for menu filtering where supported.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Page structure and static copy (Turkish defaults) |
| `css/style.css` | Design tokens and all styling |
| `js/data.js` | Menu records: 66 items, prices in TRY, sizes S 23 cm / L 37 cm / XXL 47 cm |
| `js/i18n.js` | UI strings in TR, EN, AR (RTL), RU, DE |
| `js/app.js` | Menu filtering, size lens, dish dialog, tray, gallery, maps |
| `images/` | Photography |

## Features

- Five languages, switchable in the header; Arabic flips the document to RTL.
- Menu with category rail, text search across all categories, vegetarian and vegan filters.
- Size lens: pick S, L or XXL once and every pizza price in the list follows.
- Dish dialog with true-scale size discs (23 / 37 / 47 cm) and quantity.
- Order tray persisted in `localStorage`, with subtotal and a hand-off to the official ordering page.
- Story gallery with drag, buttons and arrow keys; branch cards with on-demand Google Maps embeds.
- Keyboard: `/` focuses the menu search. Respects `prefers-reduced-motion`.
