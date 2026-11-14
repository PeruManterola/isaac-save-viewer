# isaac-save-viewer

This is the source code for the Isaac Save Viewer, a tool to view save completion status for [_The Binding of Isaac: Repentance+_](https://store.steampowered.com/app/3353470/).

This is a personal fork of [Zamiell/isaac-save-viewer](https://github.com/Zamiell/isaac-save-viewer). It is self-hosted as a static website. The save file is read entirely in the browser and never leaves it.

- The save file format was reversed by [Blade](https://github.com/bladecoding) using [Kaitai Struct](https://kaitai.io/).
- It is written using [TypeScript](https://www.typescriptlang.org/).
- It uses [esbuild](https://esbuild.github.io/) for bundling.
- It uses [Bulma](https://bulma.io/) for CSS and the [Source Sans Pro](https://fontsource.org/fonts/source-sans-pro) font, both self-hosted.
- The achievement images are taken from the [Isaac wiki](https://bindingofisaacrebirth.wiki.gg/wiki/Binding_of_Isaac:_Rebirth_Wiki).
- The "items.json" file and collectible images are taken from the [Rebirth Item Tracker](https://github.com/Rchardon/RebirthItemTracker).

## Development

Requires [Node.js](https://nodejs.org/) (LTS).

```sh
npm ci          # Install the dependencies.
npm run dev     # Build, watch for changes, and serve the site at http://localhost:8000/
npm run build   # Build the static site into the "dist" directory.
npm run lint    # Type-check, lint, format-check, and spell-check the project.
```

- `src/` contains the TypeScript source code. `src/kaitai/` contains the save file parser, which is generated from `IsaacSaveFile.ksy` by the Kaitai Struct compiler.
- `static/` contains the HTML, CSS, and images. The build copies it into `dist/`, along with the bundled `main.js`, Bulma, and the font.
- `dist/` is a complete static website that makes no requests to other servers.
