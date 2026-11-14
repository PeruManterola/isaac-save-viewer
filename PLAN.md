# Isaac Save Viewer: Fork Roadmap

<!-- cspell:words grayscale REPENTOGON repentogon stormblessed Proyectos perumanterola worktree -->

Planned 2026-11-14. This is a personal fork, self-hosted on TrueNAS with Docker. GitHub Pages is not used.

## Goals

- **"Complete" means all 641 achievements unlocked** (Repentance+ 638–641 included) **and all 720 items touched.** The achievement count is the headline number. Items and Hard completion marks get their own sections, but they do not change it.
- Achievements are shown in 6 flat groups, and each one shows what you need to do to unlock it.
- Each section has a list/grid toggle and an All / Locked / Unlocked filter. Both are remembered in the browser.
- A completion-marks grid shows 34 characters × 12 marks, counting Hard only.
- Easter eggs are removed completely.
- Self-hosted Docker image on GHCR. The page makes no requests to outside servers at runtime, and the save never leaves the browser.

**Out of scope:** bestiary, bosses seen, Normal-difficulty marks, Rep+ online marks, search/sort, comparing saves, loading another save without a page refresh.

---

## Product spec

### Page layout (after a save is loaded)

1. **Summary header:** `Achievements X / 641` as the headline, then `Items Y / 720` and `Hard marks Z / 408`.
2. **Achievements section.** One toolbar (view + filter) applies to all groups. Groups appear in this order, each collapsible with its own `x / n` count, flat (not split per character) and sorted by achievement ID:

   | Group             | `category` id     | Contents                                                              |
   | ----------------- | ----------------- | --------------------------------------------------------------------- |
   | Character unlocks | `characterUnlock` | Unlocking non-tainted characters                                      |
   | Character marks   | `characterMark`   | Rewards for boss kills / completion marks with non-tainted characters |
   | Tainted           | `tainted`         | Unlocking tainted characters and their mark rewards                   |
   | Challenges        | `challenge`       | Challenge rewards                                                     |
   | Daily & Online    | `dailyOnline`     | Daily-run achievements and Rep+ online achievements                   |
   | Misc              | `misc`            | Everything else                                                       |

3. **Items section.** Its own toolbar. One flat list sorted by ID. Here "Locked" means "not touched".
4. **Completion marks section.** Always a grid: rows are the 34 characters, columns are the 12 marks. It has no list view and no filter, and it can be collapsed.

### Toolbar

- View: `List | Grid`. Filter: `All | Locked | Unlocked`. The default is List + Locked, which matches what the site does today.
- Each section has its own toolbar. View, filter and collapsed state (sections and groups) are saved in `localStorage` under keys prefixed `isv:`.
- Header counts always show the full totals, whatever the filter is set to.

### List view

- A table like today's, plus a status column, because "All" now shows unlocked rows too.
- Achievements: ID, name (linked to the wiki), icon, in-game description, unlock requirement.
- Items: ID, name, icon, item pools.

### Grid view

- Each tile shows the icon and the name.
- The description appears on hover, and also on keyboard focus or tap for touch screens. For achievements it includes the unlock requirement; for items it includes the item pools.
- Locked tiles are greyed out (grayscale and lower opacity).
- All images use `loading="lazy"`.

### Completion marks

- Marks are stored in the save's COUNTERS chunk (chunk type 2, `chunks[1]`, 523 entries in Rep+) as event-counter values. `src/data/marks.json` gives the counter index for each character × mark.
- **A mark is done when `(value & 0b10) !== 0`.** That means Hard; in the Greed column it means Ultra Greedier. The low 2 bits hold the offline mark. Higher bits are Rep+ online marks and are ignored. Values seen in real saves: `2`, `3`, `15`.
- Sources: REPENTOGON `docs/docs/enums/EventCounter.md` (index names) and `repentogon/Patches/CompletionTracker.cpp` (`GetOfflineMark`).
- Cells that aren't done are greyed out.

---

## Data contracts

These are shared between milestones. Do not change them without updating this file.

### `src/data/achievements.json`

```jsonc
"<id>": {
  "link": "Magdalene",                 // wiki.gg page slug, "" if none
  "name": "Magdalene",
  "inGameDescription": "Unlocked a new character.",
  "unlockDescription": "Have 7 or more Red Heart Containers at one time",
  "category": "characterUnlock"        // NEW: one of the 6 category ids above
}
```

- Plain text only: HTML entities decoded (e.g. `&#160;`) and no tags.
- The `"NEW"` fallback entry stays, with `"category": "misc"`.
- IDs 1–641 must all be present.
- Icons stay at `static/img/achievements/<id>.png`.

### `src/data/marks.json` (new)

```jsonc
{
  "marks": [
    {
      "id": "momsHeart",
      "name": "Mom's Heart",
      "icon": "img/marks/momsHeart.png",
    },
    // ... 12 total
  ],
  "characters": [
    {
      "id": "isaac",
      "name": "Isaac",
      "tainted": false,
      "icon": "img/characters/isaac.png",
      "counters": { "momsHeart": 27, "isaac": 41 /* ... one per mark id */ },
    },
    // ... 34 total
  ],
}
```

- **Mark (column) order:** `momsHeart, isaac, satan, blueBaby, lamb, bossRush, hush, megaSatan, delirium, mother, beast, ultraGreedier`.
- **Character (row) order**, as on the character select screen: Isaac, Magdalene, Cain, Judas, ???, Eve, Samson, Azazel, Lazarus, Eden, The Lost, Lilith, Keeper, Apollyon, The Forgotten, Bethany, Jacob & Esau, then the 17 tainted versions in the same order.
- 34 × 12 = **408 unique counter indices**.
- Icon paths are relative to the site root (the `static/` folder, which becomes `dist/`).

### Build output

`npm ci && npm run build` produces `dist/`, a complete static site: `index.html`, `main.js`, CSS, images, and the self-hosted Bulma 1.x and font. It loads nothing from CDNs or other outside servers at runtime. `static/` stays the source folder for HTML, CSS and images.

---

## Acceptance data

The user's saves are to be committed under `test/fixtures/`. Source: `/home/stormblessed/Proyectos/isaac-save-viewer/saves/` (gitignored).

| Save                          | Achievements | Items touched | Hard marks | Challenges |
| ----------------------------- | ------------ | ------------- | ---------- | ---------- |
| `rep+persistentgamedata1.dat` | 641 / 641    | 720 / 720     | 408 / 408  | 45 / 45    |
| `rep+persistentgamedata2.dat` | 619 / 641    | 710 / 720     | 408 / 408  | 39 / 45    |
| `rep+persistentgamedata3.dat` | 592 / 641    | 701 / 720     | 408 / 408  | 16 / 45    |

- Save 2 missing items: 9, 18, 484, 514, 538, 690, 694, 696, 704, 724
- Save 3 missing items: 168, 263, 267, 406, 440, 484, 501, 514, 523, 537, 538, 576, 579, 628, 634, 690, 693, 703, 721
- An item is valid if its ID in `items.json` is between 1 and 999. A raw nonzero count from the save includes invalid IDs (for example, 722 for save 1), so filter it.
- The user confirmed in-game that save 3 has every post-it complete for all 34 characters.

---

## Milestones

### M1: Foundation (Core thread) - no visible feature changes

1. **Remove easter eggs:** the section in `static/index.html`; `fillEasterEggs` and related code in `src/fillPage.ts`; `src/data/easterEggs.json`; `scripts/parse-wiki-text-seeds.py`; `scripts/wiki-seeds-html.txt`.
2. **Build pipeline:**
   - Write `scripts/build.ts`; the template check already ignores `build.ts`. It uses the esbuild JS API to bundle `src/main.ts` into `dist/main.js`, copies `static/**` into `dist/`, and copies the self-hosted CSS and fonts.
   - `npm run build` runs it. `npm run dev` watches and serves `dist/` locally.
   - Stop tracking and delete `static/main.js` and `static/main.js.map`, and add `dist/` to `.gitignore`.
3. **Kaitai as modules:**
   - Add the `kaitai-struct` npm dependency.
   - Move the generated `IsaacSaveFile.js` and its `.ksy` file from `static/lib/` into `src/`, and import them as modules.
   - Delete `static/lib/KaitaiStream.js` and the `<script>` tags that load it.
   - Turn the global `declare` types into module types.
   - Update the knip and cspell config.
4. **Self-hosted styles:** Bulma 1.x and the Source Sans font from npm, copied into `dist/` by the build. Remove the CDN and Google Fonts links. Check that the existing layout still renders correctly.
5. **Text:**
   - Repentance+ wording, and the save path hint `rep+persistentgamedata1.dat` with both the Steam Windows path and the Linux/Proton path.
   - README: esbuild instead of webpack, dev/build/test commands, link to the Docker deploy notes.
6. **CI:** remove the `deploy_website` job, and fix the `needs` list of the Discord job.

**Done when:** `npm run lint` passes; `npm run build` produces a working `dist/`; loading each fixture save in `npm run dev` shows the same counts as before (minus easter eggs); `dist/index.html` makes no outside requests.

### M5: Docker (Core thread, right after M1)

- **`Dockerfile`:** two stages. A Node LTS Alpine image runs `npm ci && npm run build`, then `dist/` is copied into `/public` of `ghcr.io/static-web-server/static-web-server:2`. Port 80 in the container. Add a health check if the server image supports it. linux/amd64 only.
- **`.dockerignore`:** `node_modules`, `dist`, `.git`, `saves`, `test`, and similar.
- **`compose.yaml`:**
  - Image `ghcr.io/perumanterola/isaac-save-viewer:<version>`, ports `8080:80`, `restart: unless-stopped`.
  - Must work with TrueNAS Community "Install via YAML".
  - No reverse proxy required.
- **`.github/workflows/docker.yml`:**
  - Triggers: `release: [published]` and `workflow_dispatch`.
  - Permissions: `packages: write`. Log in to GHCR with `GITHUB_TOKEN`; use `docker/metadata-action` and `docker/build-push-action`.
  - Tags: releases get `X.Y.Z`, `X.Y` and `latest`; manual runs get `edge` and `sha-<short>`.
  - The image name must be lowercase.
- **README "Deploy" section:** TrueNAS steps and the GHCR visibility note.
- Docker is **not installed** on the dev machine. Check `dist/` locally; the image build itself gets verified by the user running the workflow by hand.

### M2: Model and tests (Core thread)

- **Parsing:** pure functions with no page code. `src/save/parse.ts` checks the header and runs the Kaitai parser. `src/save/model.ts` turns the result into a `SaveModel` holding achievement and item entries with an `unlocked` flag.
- **Rendering:** a separate layer (`src/view/*`) that builds elements with `createElement`/`textContent`, not `innerHTML` strings. The UI must look and behave exactly as it does after M1.
- **Tests:**
  - Vitest, run with `npm test`, plus a `test` job in CI.
  - Copy the fixtures into `test/fixtures/`.
  - Test the counts in the acceptance table: achievements, items, challenges.
  - Test the header errors (run file, Rebirth/Afterbirth saves) with hand-made buffers.

### M3: Data (Data thread, runs in parallel with M1/M5/M2)

1. **New scraper.**
   - Replace `scripts/parse-wiki-text-achievements.py` and `scripts/wiki-achievement-html.txt` with a TypeScript scraper using the wiki.gg MediaWiki API (`https://bindingofisaacrebirth.wiki.gg/api.php`).
   - Run it with `npx tsx scripts/<name>.ts`.
   - Use a generic User-Agent with no personal details, and request politely (one at a time, with a small delay).
2. **Regenerate `achievements.json` to the contract above.**
   - Keep IDs and the current text unless the wiki is clearly more accurate.
   - Decode HTML entities.
   - Add `category` using rules plus a reviewable overrides map. Prefer a `.ts` file for the overrides so cspell comments can go in it.
   - Rough expected split from the rule-only prototype: about 260 `characterMark`, 125 `tainted`, 46 `challenge`, 13 `characterUnlock`, 6 `dailyOnline`, and the rest `misc`. It has known misfires, e.g. #276 "Defeat Mega Satan as every character (except Tainted)".
3. **Keep the existing achievement icons.** Only download icons that are missing or broken.
4. **Create `src/data/marks.json` to the contract.** Take the counter indices from REPENTOGON's EventCounter docs. Download 34 character portraits into `static/img/characters/` and 12 mark icons into `static/img/marks/`, as PNGs at consistent sizes.
5. **Validation:** a script or report showing:
   - all 641 IDs have a valid category, with the count per category;
   - no HTML entities or tags remain;
   - `marks.json` has 34 × 12 = 408 unique indices;
   - reading the three saves (read-only, from the root `saves/` folder) gives 408/408 Hard marks for each.
6. Delete the old Python achievement scraper and its HTML dump.
7. **Final commit** with subject `feat(data): M3 complete ...`. Its body lists the **Integration notes**: every change Core must make in files Data doesn't own (npm script for the scraper, cspell words and ignore paths such as `marks.json`, knip entries, and anything else).

### M4: UI (Core thread, after M2 and the M3 merge)

1. Merge `feat/data` and apply its Integration notes.
2. Build the summary header, the grouped achievements, the toolbars, list and grid rendering, the marks grid, saved preferences and lazy images, all as described in the product spec.
3. **Tests:**
   - Hard marks 408/408 for every fixture.
   - Every achievement in the model has a category.
   - Pure tests for the filter and preference logic.

**Done when:** `npm run lint`, `npm test` and `npm run build` all pass, and the UI behaves as the product spec describes.

---

## Parallel work and file ownership

There are two threads, each in its own git worktree based on `main` (commit `df7ab41`).

| Thread   | Branch      | Milestones                              |
| -------- | ----------- | --------------------------------------- |
| **Core** | `feat/core` | M1 → M5 → M2 → (merge `feat/data`) → M4 |
| **Data** | `feat/data` | M3                                      |

Docker is not a separate thread. It needs M1's `dist/` build and would share `package.json`, CI and README with Core, so a third thread would either sit blocked or run into conflicts.

| Owner    | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core** | `package.json`, `package-lock.json`, `cspell.config.jsonc`, `knip.config.js`, `eslint.config.mjs`, `prettier.config.mjs`, `tsconfig.json`, `.gitignore`, `.github/**`, `README.md`, `Dockerfile`, `.dockerignore`, `compose.yaml`, `static/index.html`, `static/*.css`, `static/lib/**`, `src/**` (except the two data files below), `test/**`, `scripts/build.ts`, `scripts/lint.ts`, `scripts/parse-wiki-text-seeds.py`, `scripts/wiki-seeds-html.txt` |
| **Data** | `scripts/**` (except the Core-owned scripts listed above), `scripts/tsconfig.json`, `src/data/achievements.json`, `src/data/marks.json`, `static/img/characters/**`, `static/img/marks/**`, `static/img/achievements/**` (missing or broken icons only)                                                                                                                                                                                                  |

### Rules

- **Only edit files you own.** If you need a change in a file you don't own, put it in Integration notes.
- **Expected lint failures on `feat/data`:** failures caused only by Core-owned config (cspell words or ignore paths, knip not seeing the scraper as used) are fine. List them in Integration notes. Everything else must pass.
- **Commits:** one per milestone at minimum, using conventional commit messages, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Never push, open PRs, or modify `main`.** The user merges `feat/core` (which will include `feat/data`) into `main`.
- **Do not edit `PLAN.md`.** It is untracked in the main checkout at `/home/stormblessed/Proyectos/isaac-save-viewer/PLAN.md`. Report status in your final message instead.
- **Handshake:** after M2, Core runs `git log feat/data --grep="M3 complete" -1`.
  - If that commit exists: `git merge feat/data`, apply its Integration notes, then do M4.
  - If not: stop and report "M2 done, waiting on M3".
- **Template check:** `npm run lint` runs `complete-cli check` against the upstream template. Keep template-owned content, and put customizations inside the `@template-customization-start/end` markers.

---

## Manual steps for the user

1. Turn on GitHub Actions for the fork; no workflow has ever run there.
2. Review `feat/core`, merge it into `main`, and push.
3. Publish a GitHub Release (e.g. `v1.0.0`), or run the Docker workflow manually.
4. After the first image is published, check the GHCR package visibility. Make it public, or add GHCR credentials in TrueNAS.
5. In TrueNAS: Apps → Discover Apps → Custom App → Install via YAML → paste `compose.yaml`. Then open `http://<truenas-ip>:8080`.
6. Commit `PLAN.md` if you want to keep it in the repo.
