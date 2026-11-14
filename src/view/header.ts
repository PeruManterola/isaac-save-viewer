// The header: the app name, the theme switch, and (once a save is loaded) the name of the loaded
// file and a button to load another one.

import type { Preferences } from "../state/preferences.js";
import { h } from "./dom.js";
import { icon } from "./icons.js";
import { createThemeSwitch } from "./themeSwitch.js";
import { button } from "./ui.js";

const APP_NAME = "Isaac Save Viewer";

interface Header {
  readonly element: HTMLElement;
  /** Shows the name of the loaded file and the "Load another save" button. */
  readonly showFile: (fileName: string) => void;
}

export function createHeader(
  preferences: Preferences,
  onLoadAnother: () => void,
): Header {
  const chipText = h("span");
  const chip = h("span", { class: "chip" }, [icon("file"), chipText]);
  const status = h("span", {
    class: "sr",
    role: "status",
    "aria-live": "polite",
  });
  const actions = h("div", { class: "top-actions", hidden: "" }, [
    chip,
    button({
      label: "Load another save",
      icon: "upload",
      onClick: onLoadAnother,
    }),
  ]);

  const element = h("header", { class: "top" }, [
    h("div", { class: "brand" }, [
      h("span", { class: "logo" }, [icon("trophy")]),
      h("h1", {}, [APP_NAME]),
    ]),
    createThemeSwitch(preferences),
    actions,
    // Outside of "actions", which is hidden at first, so that the change is announced.
    status,
  ]);

  return {
    element,
    showFile: (fileName) => {
      chipText.textContent = fileName;
      // The full name is the tooltip, since the chip truncates long names.
      chip.title = fileName;
      actions.hidden = false;
      status.textContent = `Loaded ${fileName}`;
    },
  };
}
