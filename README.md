# The Pile

A mobile-first, Tinder-style way to skim through Magic: The Gathering cards.
Filter cards via [Scryfall](https://scryfall.com), swipe right to keep them in a
pile, swipe left to pass — like physically sorting a stack of cards into a keep
pile. No backend, no accounts, no tracking: everything lives in your browser.

## Running it

```bash
npm install
npm run dev        # development server
npm run build      # production build → dist/
npm run preview    # serve the production build locally
```

Deploy by putting `dist/` on any static host (GitHub Pages, Netlify, Cloudflare
Pages, …). The build uses relative paths, so it works from a subdirectory too.


## Features

- **Filter screen** inspired by Scryfall's advanced search: name, rules text,
  type line, colors / commander identity, mana value, rarity, set, format,
  price cap — plus a raw Scryfall-syntax field and quick presets ("Newest set",
  "Downshifted to common", "Budget rares", …).
- **Swipe screen**: full-size, readable card scans. Drag or flick to swipe,
  right = add to pile, left = pass. Buttons and keyboard (← → , `u`/Backspace =
  undo, `f` = flip) work too. Double-faced cards have a flip button. Undo
  reverses any number of swipes.
- **Piles**: multiple named piles; the active "target" pile is selectable
  everywhere via the pile chip. Piles can themselves be swiped through again
  (right = keep, left = cut, or move cards to another pile by selecting a
  different target).
- **Export**: plain text (default: one card name per line), CSV, or JSON, with
  selectable attributes. Copy to clipboard or download as a file.
- **Sessions**: your current swipe run (query, position, undo history) is
  saved locally and survives reloads; resume or discard it from the home
  screen. Stale sessions are dropped after 7 days. Piles are kept forever
  (until you delete them).
- **PWA**: installable on a phone (manifest + service worker). The app shell
  and card images are cached; already-seen searches survive brief offline
  moments.

## Tech

- Vite + React + TypeScript, no other runtime dependencies.
- Scryfall REST API, throttled to ≥110 ms between requests per their
  guidelines. Search results are fetched page-by-page (175 cards) as you
  swipe; the next few card images are preloaded.
- All state persists in `localStorage` (`thepile:*` keys). Nothing ever
  leaves the device except requests to Scryfall.

The Pile is unofficial Fan Content permitted under the Fan Content Policy.
Not approved/endorsed by Wizards. Card data and images © Wizards of the Coast,
provided by Scryfall.
