// Choosing a save file: the file picker, dropping a file anywhere on the page (also after a save
// file has already been loaded), and the error shown when a file cannot be loaded.

import { getElement, h } from "./dom.js";
import { icon } from "./icons.js";
import { DROP_ERROR_ID, DROP_IDLE_ID, LANDING_ID } from "./landing.js";
import { button, card } from "./ui.js";

const FILE_INPUT_ID = "choose-save-file";
const LOAD_ERROR_ID = "load-error";
const OVERLAY_ACTIVE_CLASS = "is-active";

/** The hidden file input. The "Select save file" buttons click it. */
export function createFileInput(): HTMLInputElement {
  return h("input", {
    id: FILE_INPUT_ID,
    type: "file",
    accept: ".dat",
    class: "sr",
    tabindex: "-1",
    "aria-hidden": "true",
  });
}

/** The full-window message shown while a file is dragged over the page. */
export function createDropOverlay(): HTMLElement {
  return h(
    "div",
    { id: "drop-overlay", class: "drop-overlay", "aria-hidden": "true" },
    [
      card(
        [
          h("span", { class: "drop-ic" }, [icon("arrow-down")]),
          h("h2", {}, ["Release to load your save"]),
        ],
        "drop is-over",
      ),
    ],
  );
}

export function openFilePicker(): void {
  (getElement(FILE_INPUT_ID) as HTMLInputElement).click();
}

/** Calls the callback with the contents and the name of the file that the user selects or drops. */
export function onSaveFileSelected(
  callback: (arrayBuffer: ArrayBuffer, fileName: string) => void,
): void {
  const readFile = (file: File) => {
    file
      .arrayBuffer()
      .then((arrayBuffer) => {
        callback(arrayBuffer, file.name);
      })
      .catch((error: unknown) => {
        showSaveFileError(error, file.name);
      });
  };

  const input = getElement(FILE_INPUT_ID) as HTMLInputElement;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file !== undefined) {
      readFile(file);
    }

    // Allow the same file to be selected again after it was edited.
    input.value = "";
  });

  initDropTarget(readFile);
}

function initDropTarget(readFile: (file: File) => void) {
  const overlay = getElement("drop-overlay");

  // "dragenter" and "dragleave" fire for every child element, so a counter is needed to know when
  // the drag has left the window.
  let dragDepth = 0;

  globalThis.addEventListener("dragenter", (event) => {
    if (!isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    dragDepth++;
    overlay.classList.add(OVERLAY_ACTIVE_CLASS);
  });

  globalThis.addEventListener("dragover", (event) => {
    if (!isFileDrag(event)) {
      return;
    }
    // Without this, the browser would open the file instead of letting us handle the drop.
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = "copy";
    }
  });

  globalThis.addEventListener("dragleave", (event) => {
    if (!isFileDrag(event)) {
      return;
    }
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      overlay.classList.remove(OVERLAY_ACTIVE_CLASS);
    }
  });

  globalThis.addEventListener("drop", (event) => {
    if (!isFileDrag(event)) {
      return;
    }
    event.preventDefault();
    dragDepth = 0;
    overlay.classList.remove(OVERLAY_ACTIVE_CLASS);

    const file = event.dataTransfer?.files[0];
    if (file !== undefined) {
      readFile(file);
    }
  });
}

function isFileDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") === true;
}

/**
 * Shows why a file could not be loaded. Before a save is loaded, the message replaces the drop zone
 * text. Once a save is loaded, it is a banner above the save, so that an error from a later drop is
 * still visible.
 */
export function showSaveFileError(error: unknown, fileName?: string): void {
  clearSaveFileError();

  const loaded = getElement(LANDING_ID).hidden;
  const message = error instanceof Error ? error.message : String(error);
  const box = errorBox(message, fileName, loaded);

  if (loaded) {
    const banner = getElement(LOAD_ERROR_ID);
    banner.replaceChildren(box);
    banner.hidden = false;
    banner.scrollIntoView({ block: "nearest" });
  } else {
    getElement(DROP_IDLE_ID).hidden = true;
    const slot = getElement(DROP_ERROR_ID);
    slot.replaceChildren(box);
    slot.hidden = false;
  }
}

function clearSaveFileError() {
  for (const id of [LOAD_ERROR_ID, DROP_ERROR_ID]) {
    const slot = getElement(id);
    slot.textContent = "";
    slot.hidden = true;
  }
  getElement(DROP_IDLE_ID).hidden = false;
}

function errorBox(
  message: string,
  fileName: string | undefined,
  dismissible: boolean,
): HTMLElement {
  const title =
    fileName === undefined
      ? "That file could not be loaded."
      : `"${fileName}" could not be loaded.`;
  const actions = [
    button({
      label: "Try another file",
      variant: "primary",
      onClick: openFilePicker,
    }),
  ];
  if (dismissible) {
    actions.push(
      button({
        label: "Dismiss",
        icon: "close",
        onClick: clearSaveFileError,
      }),
    );
  }

  return h("div", { class: "error-box" }, [
    h("div", { class: "alert", role: "alert" }, [
      icon("alert"),
      h("div", {}, [
        h("strong", {}, [title]),
        h("span", { class: "alert-text" }, [message]),
      ]),
    ]),
    h("div", { class: "error-actions" }, actions),
  ]);
}

/** Hides the landing screen once a save is loaded. */
export function hideSaveFileSelect(): void {
  getElement(LANDING_ID).hidden = true;
  clearSaveFileError();
}
