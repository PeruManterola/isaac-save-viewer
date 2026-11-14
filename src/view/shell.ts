// The page around the save: header, landing screen, error banner, and the place where a loaded save
// is shown. The footer is static HTML in "index.html".

import type { Preferences } from "../state/preferences.js";
import { h } from "./dom.js";
import { createHeader } from "./header.js";
import { createLanding } from "./landing.js";
import { RESULTS_ID } from "./page.js";
import {
  createDropOverlay,
  createFileInput,
  openFilePicker,
} from "./saveFileSelect.js";

interface Shell {
  /** Switches from the landing screen to the loaded save, which was read from this file. */
  readonly showLoaded: (fileName: string) => void;
}

export function renderShell(
  root: HTMLElement,
  preferences: Preferences,
): Shell {
  const header = createHeader(preferences, openFilePicker);
  const results = h("div", {
    id: RESULTS_ID,
    class: "results",
    tabindex: "-1",
    hidden: "",
  });

  root.replaceChildren(
    createFileInput(),
    createDropOverlay(),
    header.element,
    h("main", {}, [
      createLanding(openFilePicker),
      h("div", { id: "load-error", class: "error-banner", hidden: "" }),
      results,
    ]),
  );

  return {
    showLoaded: (fileName) => {
      header.showFile(fileName);
      // Start at the top of the new save, with the focus where the old content was replaced.
      window.scrollTo(0, 0);
      results.focus({ preventScroll: true });
    },
  };
}
