# UI overhaul - implementation notes (shared by all phases)

<!-- cspell:disable -->

The user approved design direction C, "Collection Wall". `mockups/c-collection.src.html` is the
DESIGN SOURCE OF TRUTH: its tokens, components, spacing, states and copy are what the real app must
look like. Open it in a browser to see it (it loads `mockups/sample-data.js`). It is a mockup, so
its JS is throwaway - reuse the CSS and the markup structure, not the script.

## Decisions already made (do not re-open)

- Bulma is removed entirely. The app uses its own small token-based CSS.
- Fonts: "Rubik" for headings/numbers, self-hosted from `@fontsource/rubik` (copied to `dist/lib`
  by `scripts/build.ts`, like Source Sans Pro was); system sans for body. No outside requests at
  runtime, ever (no CDN, no Google Fonts).
- Themes: light is the default; the dark token set applies automatically under
  `@media (prefers-color-scheme: dark)`. No manual theme switch.
- No search field (out of scope). No new features beyond the mockup.
- Mockup-only things that must NOT be ported: screen caption labels, "demo" captions, filler/repeat
  tiles, "+N more" caps (the real app renders every entry), the dark sample strip.
- Preferences keep the existing `isv:` localStorage scheme in `src/state/preferences.ts`. The
  view-mode values stay `"list" | "grid"` internally (the UI label for grid is "Wall").
- Rendering stays vanilla TypeScript using `h()` from `src/view/dom.ts` (createElement/textContent,
  never innerHTML strings for data). UI icons are inline SVG built by a shared helper, never emoji.
- Pixel-art images use `image-rendering: pixelated` at integer scales only (achievement and item
  icons are 64px source -> 64 or 32; character portraits 32px; mark icons 16px -> 16 or 32).
  All data images use `loading="lazy"` with explicit width/height.

## CSS file ownership (in `static/css/`, each linked from `static/index.html`)

| File          | Owner   | Contents                                                              |
| ------------- | ------- | --------------------------------------------------------------------- |
| `tokens.css`  | Phase 1 | Colour (light + dark), type, spacing, radius, shadow, motion tokens   |
| `base.css`    | Phase 1 | Reset, typography, links, focus rings, shared primitives (see below)  |
| `shell.css`   | Phase 1 | Landing, header, stat cards, drop overlay, error, footer              |
| `entries.css` | Phase 2A | Achievements + items: toolbar, category cards, wall, list, popover   |
| `marks.css`   | Phase 2B | Completion marks: legend, character cards                            |

Shared primitives live in `base.css` and are used by everyone: card, button (primary/ghost), badge
(complete/locked/neutral, always icon + text), progress bar, segmented pill control, visually-hidden.
Their TypeScript builders live in `src/view/ui.ts` and `src/view/icons.ts` (Phase 1). Later phases
may ADD to these shared files only if truly needed, appending at the end, never rewriting.

## Quality bar

- Text contrast >= 4.5:1 in both themes (locked states dim the icon, never the text); state is never
  shown by colour alone; visible `:focus-visible` rings; every control keyboard-operable with a
  correct role/label; touch targets >= 44px; `prefers-reduced-motion` respected.
- Works with no horizontal page scroll at 390px, 768px and 1280px.
- `npm run lint`, `npm test` and `npm run build` must all pass before you commit. `npm run lint`
  includes prettier, eslint, knip, cspell and a template check (`complete-cli check`): keep
  template-owned content, and put customisations inside `@template-customization-start/end` markers.
- Add or update vitest tests for any pure logic you add or change.

## Seeing the real app with a save loaded

`npm run build` writes `dist/`; `npm run dev` serves it on http://localhost:8000. Headless Chromium
is at `/usr/bin/chromium`:
`chromium --headless --no-sandbox --hide-scrollbars --window-size=1280,3000 --virtual-time-budget=4000 --screenshot=/tmp/x.png <url>`
A save can only be loaded through the file picker or a drop. For screenshots, add a TEMPORARY,
never-committed hook (for example: when `location.hash === "#demo"`, fetch a copy of
`test/fixtures/rep+persistentgamedata3.dat` placed in `dist/` and feed it to the same code path),
take screenshots at 390 / 768 / 1280px in both colour schemes, look at them, fix what is off, and
remove the hook before committing. Save 3 is 592/641 achievements, 701/720 items, 408/408 marks;
save 2 and save 1 are also in `test/fixtures/`.

## Rules

- Work on the branch you are given. Commit locally with conventional commit messages. Never push,
  never open a PR, never touch `main`. Do not start subagents.
- Do not edit `PLAN.md`, the data files in `src/data/`, `src/save/**` or `src/kaitai/**`.
- Final reply: what you built, what you verified (commands + screenshots looked at), anything left
  undone or uncertain, and the commit hash.
