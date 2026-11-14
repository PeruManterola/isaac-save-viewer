// The loaded save: the stat cards, then the achievements, items, and marks sections. Each section
// renders itself. This file only gives each one its stable ID, for the links in the stat cards.

import type { SaveModel } from "../save/model.js";
import type { Preferences } from "../state/preferences.js";
import { renderAchievementsSection } from "./achievements.js";
import { getElement, h } from "./dom.js";
import { renderItemsSection } from "./items.js";
import { renderMarksSection } from "./marks.js";
import { SECTION_IDS } from "./sections.js";
import { renderStatCards } from "./statCards.js";

export const RESULTS_ID = "results";

export function renderSaveModel(
  saveModel: SaveModel,
  preferences: Preferences,
): void {
  const container = getElement(RESULTS_ID);
  container.replaceChildren(
    renderStatCards(saveModel),
    h("div", { class: "sections" }, [
      section(
        SECTION_IDS.achievements,
        renderAchievementsSection(saveModel.achievements, preferences),
      ),
      section(
        SECTION_IDS.items,
        renderItemsSection(saveModel.items, preferences),
      ),
      section(
        SECTION_IDS.marks,
        renderMarksSection(saveModel.marks, preferences),
      ),
    ]),
  );
  container.hidden = false;
}

function section(id: string, content: HTMLElement): HTMLElement {
  return h("section", { id, class: "sec" }, [content]);
}
