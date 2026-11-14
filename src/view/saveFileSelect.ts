// The "Select save file" area at the top of the page.

import { getElement, hide, show } from "./dom.js";

const CHOOSE_SAVE_FILE_BUTTON_ID = "choose-save-file";
const CHOOSE_SAVE_FILE_ERROR_ID = "choose-save-file-error";
const CHOOSE_SAVE_FILE_ERROR_TEXT_ID = "choose-save-file-error-text";
const CHOOSE_SAVE_FILE_COLUMN_ID = "choose-save-file-column";

/** Calls the callback with the contents of the file that the user selects. */
export function onSaveFileSelected(
  callback: (arrayBuffer: ArrayBuffer) => void,
): void {
  const input = getElement(CHOOSE_SAVE_FILE_BUTTON_ID) as HTMLInputElement;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }

    file
      .arrayBuffer()
      .then(callback)
      .catch((error: unknown) => {
        showSaveFileError(error);
      });
  });
}

export function showSaveFileError(error: unknown): void {
  show(getElement(CHOOSE_SAVE_FILE_ERROR_ID));
  getElement(CHOOSE_SAVE_FILE_ERROR_TEXT_ID).textContent =
    error instanceof Error ? error.message : String(error);
}

export function hideSaveFileSelect(): void {
  hide(getElement(CHOOSE_SAVE_FILE_COLUMN_ID));
}
