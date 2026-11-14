import type { SaveModel } from "../save/model.js";
import { getMarksProgress, getProgress } from "../save/model.js";
import type { Preferences } from "../state/preferences.js";
import { renderAchievementsSection } from "./achievements.js";
import { getElement, h, show } from "./dom.js";
import { renderItemsSection } from "./items.js";
import { renderMarksSection } from "./marks.js";
import { progressText } from "./progress.js";
import { initTooltips } from "./tooltip.js";

const SAVE_FILE_STATS_ID = "save-file-stats";

export function renderSaveModel(
  saveModel: SaveModel,
  preferences: Preferences,
): void {
  const container = getElement(SAVE_FILE_STATS_ID);
  container.replaceChildren(
    renderSummary(saveModel),
    renderAchievementsSection(saveModel.achievements, preferences),
    renderItemsSection(saveModel.items, preferences),
    renderMarksSection(saveModel.marks, preferences),
  );
  initTooltips(container);
  show(container);
}

/** The achievement count is the headline. Items and marks are shown next to it. */
function renderSummary(saveModel: SaveModel): HTMLElement {
  return h("div", { class: "isv-summary-header" }, [
    summaryItem(
      "Achievements",
      progressText(getProgress(saveModel.achievements)),
      "is-2",
    ),
    h("div", { class: "isv-summary-secondary" }, [
      summaryItem("Items", progressText(getProgress(saveModel.items)), "is-4"),
      summaryItem(
        "Hard marks",
        progressText(getMarksProgress(saveModel.marks)),
        "is-4",
      ),
    ]),
  ]);
}

function summaryItem(label: string, value: string, size: string): HTMLElement {
  return h("div", { class: "isv-summary-item" }, [
    h("p", { class: "heading" }, [label]),
    h("p", { class: `title ${size}` }, [value]),
  ]);
}
