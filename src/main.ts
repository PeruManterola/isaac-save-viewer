import { createSaveModel } from "./save/model.js";
import { parseSaveFile } from "./save/parse.js";
import type { KeyValueStorage } from "./state/preferences.js";
import { Preferences } from "./state/preferences.js";
import { getElement } from "./view/dom.js";
import { renderSaveModel } from "./view/page.js";
import {
  hideSaveFileSelect,
  onSaveFileSelected,
  showSaveFileError,
} from "./view/saveFileSelect.js";
import { renderShell } from "./view/shell.js";

const preferences = new Preferences(getLocalStorage());
const shell = renderShell(getElement("app"), preferences);

onSaveFileSelected((arrayBuffer, fileName) => {
  try {
    const isaacSaveFile = parseSaveFile(arrayBuffer);
    const saveModel = createSaveModel(isaacSaveFile);
    renderSaveModel(saveModel, preferences);
    hideSaveFileSelect();
    shell.showLoaded(fileName);
  } catch (error) {
    showSaveFileError(error, fileName);
  }
});

/** Accessing `localStorage` throws when it is disabled. */
function getLocalStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
