import type { MarksModel } from "../save/marks.js";
import { getMarksProgress } from "../save/model.js";
import type { Preferences } from "../state/preferences.js";
import { h, lazyImage } from "./dom.js";
import { progressText } from "./progress.js";

/** The mark and character icons are pixel art, so they are scaled up by an integer factor. */
const MARK_ICON_SIZE = 32;
const CHARACTER_ICON_SIZE = 32;

// Interim look: a plain table. Phase 2B redesigns this section.
export function renderMarksSection(
  marksModel: MarksModel,
  _preferences: Preferences,
): HTMLElement {
  const heading = h("h2", {}, [
    `Hard Completion Marks (${progressText(getMarksProgress(marksModel))})`,
  ]);

  const headerRow = h("tr", {}, [
    h("th", { scope: "col" }, ["Character"]),
    ...marksModel.marks.map((mark) =>
      h("th", { scope: "col", class: "isv-mark-cell", title: mark.name }, [
        lazyImage(mark.icon, mark.name, MARK_ICON_SIZE, "isv-pixelated"),
      ]),
    ),
    h("th", { scope: "col", class: "isv-mark-total" }, ["Done"]),
  ]);

  const rows = marksModel.characters.map((character, index) => {
    const previousCharacter = marksModel.characters[index - 1];
    const firstTainted =
      character.tainted && previousCharacter?.tainted === false;
    const numDone = character.marks.filter((mark) => mark.unlocked).length;

    return h("tr", { class: firstTainted ? "isv-first-tainted" : "" }, [
      h("th", { scope: "row", class: "isv-character" }, [
        lazyImage(character.icon, "", CHARACTER_ICON_SIZE, "isv-pixelated"),
        h("span", {}, [character.name]),
      ]),
      ...character.marks.map(({ mark, unlocked }) => {
        const description = `${character.name}: ${mark.name} (${unlocked ? "done" : "not done"} on Hard)`;
        return h(
          "td",
          {
            class: unlocked ? "isv-mark-cell" : "isv-mark-cell isv-locked",
            title: description,
          },
          [lazyImage(mark.icon, description, MARK_ICON_SIZE, "isv-pixelated")],
        );
      }),
      h("td", { class: "isv-mark-total" }, [
        `${numDone} / ${character.marks.length}`,
      ]),
    ]);
  });

  const table = h("div", { class: "isv-marks-wrap" }, [
    h("table", { class: "isv-marks" }, [
      h("thead", {}, [headerRow]),
      h("tbody", {}, rows),
    ]),
  ]);

  return h("div", { class: "card isv-marks-section" }, [heading, table]);
}
