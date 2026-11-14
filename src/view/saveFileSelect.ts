// The "Select save file" area at the top of the page. A save file can also be dropped anywhere on
// the page, including after a save file has already been loaded.

import { getElement, hide, show } from "./dom.js";

const CHOOSE_SAVE_FILE_BUTTON_ID = "choose-save-file";
const CHOOSE_SAVE_FILE_ERROR_ID = "choose-save-file-error";
const CHOOSE_SAVE_FILE_ERROR_TEXT_ID = "choose-save-file-error-text";
const CHOOSE_SAVE_FILE_COLUMN_ID = "choose-save-file-column";
const DROP_OVERLAY_ID = "drop-overlay";
const OVERLAY_ACTIVE_CLASS = "is-active";

/** Calls the callback with the contents of the file that the user selects or drops. */
export function onSaveFileSelected(
  callback: (arrayBuffer: ArrayBuffer) => void,
): void {
  const readFile = (file: File) => {
    file
      .arrayBuffer()
      .then(callback)
      .catch((error: unknown) => {
        showSaveFileError(error);
      });
  };

  const input = getElement(CHOOSE_SAVE_FILE_BUTTON_ID) as HTMLInputElement;
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
  const overlay = getElement(DROP_OVERLAY_ID);

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

export function showSaveFileError(error: unknown): void {
  // The selection area is hidden once a save file is loaded, so it must be shown again for an error
  // from a later drop to be visible. Removing the inline style restores Bulma's flex layout.
  getElement(CHOOSE_SAVE_FILE_COLUMN_ID).style.removeProperty("display");
  show(getElement(CHOOSE_SAVE_FILE_ERROR_ID));
  getElement(CHOOSE_SAVE_FILE_ERROR_TEXT_ID).textContent =
    error instanceof Error ? error.message : String(error);
}

export function hideSaveFileSelect(): void {
  hide(getElement(CHOOSE_SAVE_FILE_COLUMN_ID));
  hide(getElement(CHOOSE_SAVE_FILE_ERROR_ID));
}
