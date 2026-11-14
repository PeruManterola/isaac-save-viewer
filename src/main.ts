import { createSaveModel } from "./save/model.js";
import { parseSaveFile } from "./save/parse.js";
import {
  hideSaveFileSelect,
  onSaveFileSelected,
  showSaveFileError,
} from "./view/saveFileSelect.js";
import { renderSaveModel } from "./view/stats.js";

window.addEventListener("load", () => {
  onSaveFileSelected((arrayBuffer) => {
    try {
      const isaacSaveFile = parseSaveFile(arrayBuffer);
      const saveModel = createSaveModel(isaacSaveFile);
      renderSaveModel(saveModel);
      hideSaveFileSelect();
    } catch (error) {
      showSaveFileError(error);
    }
  });
});
