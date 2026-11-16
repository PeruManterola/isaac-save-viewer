// The three summary cards at the top of a loaded save. Each one jumps to its section.

import type { Progress, SaveModel } from "../save/model.js";
import { getMarksProgress, getProgress } from "../save/model.js";
import { h } from "./dom.js";
import { icon } from "./icons.js";
import { percentText, remainingText } from "./progress.js";
import { SECTION_IDS } from "./sections.js";
import { badge, progressBar } from "./ui.js";

export function renderStatCards(saveModel: SaveModel): HTMLElement {
  return h(
    "nav",
    { class: "stats", "aria-label": "Progress summary - jump to a section" },
    [
      statCard(
        "Achievements",
        SECTION_IDS.achievements,
        getProgress(saveModel.achievements),
        "unlock",
      ),
      statCard(
        "Items",
        SECTION_IDS.items,
        getProgress(saveModel.items),
        "touch",
      ),
      statCard(
        "Hard marks",
        SECTION_IDS.marks,
        getMarksProgress(saveModel.marks),
        "do",
      ),
    ],
  );
}

/**
 * @param label The name of the card.
 * @param sectionID The ID of the section that the card links to.
 * @param progress What is done and the total.
 * @param verb What is left to do, e.g. "unlock" gives "49 to unlock".
 */
function statCard(
  label: string,
  sectionID: string,
  progress: Progress,
  verb: string,
): HTMLElement {
  const remaining = remainingText(progress, verb);

  return h("a", { class: "stat", href: `#${sectionID}` }, [
    h("div", { class: "lbl" }, [h("span", {}, [label]), icon("arrow-down")]),
    h("div", { class: "big" }, [
      h("span", { class: "num" }, [progress.unlocked.toString()]),
      h("span", { class: "of" }, [`/ ${progress.total}`]),
    ]),
    progressBar({
      value: progress.unlocked,
      max: progress.total,
      label: `${label} progress`,
    }),
    h("div", { class: "foot" }, [
      h("span", {}, [h("b", {}, [percentText(progress)])]),
      remaining === undefined
        ? badge("ok", "Complete", "check")
        : badge("need", remaining),
    ]),
  ]);
}
