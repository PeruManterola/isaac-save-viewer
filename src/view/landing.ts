// The landing screen, shown until a save file is loaded: the drop zone, where to find the save
// file, and the privacy note.

import { h } from "./dom.js";
import { icon } from "./icons.js";
import { button, card, segmented } from "./ui.js";

export const LANDING_ID = "landing";
/** The part of the drop zone that is replaced by an error message. */
export const DROP_IDLE_ID = "drop-idle";
/** Where an error message is shown, inside the drop zone. */
export const DROP_ERROR_ID = "drop-error";

const STEAM_URL = "https://store.steampowered.com/app/3353470/";
const PASTEBIN_URL = "https://pastebin.com/kJFkFKz1";
const COPIED_RESET_MS = 1800;

type OperatingSystem = "windows" | "linux";

const SAVE_PATHS = {
  windows: String.raw`C:\Program Files (x86)\Steam\userdata\[Your Steam ID]\250900\remote\rep+persistentgamedata1.dat`,
  linux:
    "~/.local/share/Steam/userdata/[Your Steam ID]/250900/remote/rep+persistentgamedata1.dat",
} as const satisfies Record<OperatingSystem, string>;

const OPERATING_SYSTEM_LABELS = {
  windows: "Windows",
  linux: "Linux",
} as const satisfies Record<OperatingSystem, string>;

const OPERATING_SYSTEMS = ["windows", "linux"] as const;

/** @param onPickFile Opens the file picker. */
export function createLanding(onPickFile: () => void): HTMLElement {
  return h("div", { id: LANDING_ID, class: "landing" }, [
    h("p", { class: "lede" }, [
      "See what is still missing on your way to 100% in ",
      h("i", {}, [
        h("a", { href: STEAM_URL }, ["The Binding of Isaac: Repentance+"]),
      ]),
      ".",
    ]),
    dropZone(onPickFile),
    whereIsMySave(),
    h("p", { class: "privacy" }, [
      icon("shield"),
      h("span", {}, [
        "Your save never leaves this browser. It is read locally and nothing is uploaded.",
      ]),
    ]),
  ]);
}

function dropZone(onPickFile: () => void): HTMLElement {
  const idle = h("div", { id: DROP_IDLE_ID, class: "drop-idle" }, [
    h("span", { class: "drop-ic" }, [icon("upload")]),
    h("h2", {}, ["Drop your save file here"]),
    h("p", { class: "muted" }, [
      "It is called ",
      h("b", {}, ["rep+persistentgamedata1.dat"]),
      " (or 2 / 3).",
    ]),
    button({
      label: "Select save file",
      variant: "primary",
      large: true,
      onClick: onPickFile,
    }),
    h("p", { class: "or" }, ["...or drop it anywhere on this page"]),
  ]);
  const error = h("div", {
    id: DROP_ERROR_ID,
    class: "drop-error",
    hidden: "",
  });

  return card([idle, error], "drop");
}

function whereIsMySave(): HTMLElement {
  const status = h("span", {
    class: "sr",
    role: "status",
    "aria-live": "polite",
  });

  const panels = OPERATING_SYSTEMS.map((os) => {
    const code = h("code", { id: `path-${os}` }, [SAVE_PATHS[os]]);
    return h(
      "div",
      {
        role: "tabpanel",
        id: `panel-${os}`,
        "aria-labelledby": `tab-${os}`,
        class: "path",
        ...(os === "windows" ? {} : { hidden: "" }),
      },
      [code, copyButton(code, status)],
    );
  });

  const tabs = segmented<OperatingSystem>({
    label: "Operating system",
    kind: "tab",
    value: "windows",
    options: OPERATING_SYSTEMS.map((os) => ({
      value: os,
      label: OPERATING_SYSTEM_LABELS[os],
      id: `tab-${os}`,
      controls: `panel-${os}`,
    })),
    onChange: (selected) => {
      for (const [index, os] of OPERATING_SYSTEMS.entries()) {
        const panel = panels[index];
        if (panel !== undefined) {
          panel.hidden = os !== selected;
        }
      }
    },
  });

  const summary = h("summary", {}, ["Where is my save?", icon("chevron")]);
  const details = h("details", { class: "where", open: "" }, [
    summary,
    h("div", { class: "where-body" }, [
      tabs.element,
      ...panels,
      h("p", { class: "small muted" }, [
        "Linux means Steam with Proton. Slots 1-3 are ",
        h("code", {}, ["persistentgamedata1-3"]),
        ". For more information, see this ",
        h("a", { href: PASTEBIN_URL }, ["explanation on Pastebin"]),
        ".",
      ]),
      status,
    ]),
  ]);

  return card([details]);
}

/** A button that copies the text of an element, and says so (also to screen readers). */
function copyButton(
  source: HTMLElement,
  status: HTMLElement,
): HTMLButtonElement {
  const label = h("span", {}, ["Copy path"]);
  const copyButtonElement = h(
    "button",
    { type: "button", class: "btn btn-ghost" },
    [icon("copy"), label],
  );
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  copyButtonElement.addEventListener("click", () => {
    copyText(source.textContent)
      .then((copied) => {
        clearTimeout(resetTimer);
        if (copied) {
          label.textContent = "Copied";
          status.textContent = "Path copied to clipboard";
          resetTimer = setTimeout(() => {
            label.textContent = "Copy path";
          }, COPIED_RESET_MS);
        } else {
          // Neither copy method works, so select the text for the user to copy by hand.
          globalThis.getSelection()?.selectAllChildren(source);
          status.textContent = "Press Control and C to copy the selected path";
        }
      })
      .catch(() => {
        status.textContent = "Could not copy the path";
      });
  });

  return copyButtonElement;
}

/** Uses the Clipboard API, which only exists on secure origins (HTTPS or localhost). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopy(text);
  }
}

/** The fallback for plain HTTP (e.g. a server on the local network). */
function legacyCopy(text: string): boolean {
  const previousFocus = document.activeElement;
  const textarea = h("textarea", {
    readonly: "",
    "aria-hidden": "true",
    tabindex: "-1",
    style: "position: fixed; top: 0; left: 0; opacity: 0;",
  });
  textarea.value = text;
  document.body.append(textarea);
  textarea.select();

  let copied: boolean;
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();
  if (previousFocus instanceof HTMLElement) {
    previousFocus.focus();
  }

  return copied;
}
