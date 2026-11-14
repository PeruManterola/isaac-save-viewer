import { createSaveModel } from "./save/model.js";
import { parseSaveFile } from "./save/parse.js";
import type { KeyValueStorage } from "./state/preferences.js";
import { Preferences } from "./state/preferences.js";
import { renderSaveModel } from "./view/page.js";
import {
  hideSaveFileSelect,
  onSaveFileSelected,
  showSaveFileError,
} from "./view/saveFileSelect.js";

window.addEventListener("load", () => {
  const preferences = new Preferences(getLocalStorage());

  onSaveFileSelected((arrayBuffer) => {
    try {
      const isaacSaveFile = parseSaveFile(arrayBuffer);
      const saveModel = createSaveModel(isaacSaveFile);
      renderSaveModel(saveModel, preferences);
      hideSaveFileSelect();
    } catch (error) {
      showSaveFileError(error);
    }
  });
});

/** Accessing `localStorage` throws when it is disabled. */
function getLocalStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
