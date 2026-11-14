// The "Hard completion marks" section: a progress header, a "still to do" summary, the mark legend,
// and a card for each character with its 12 marks. Its CSS is in "static/css/marks.css".

import type { MarksModel } from "../save/marks.js";
import { getMarksProgress } from "../save/model.js";
import type {
  CharacterGroup,
  CharacterSummary,
  MarksShow,
} from "../state/marksView.js";
import {
  characterSummaryText,
  filterSummaries,
  getCharacterGroups,
  getIncomplete,
  stillToDoText,
  visibleCharacterName,
} from "../state/marksView.js";
import type { Preferences } from "../state/preferences.js";
import { h, lazyImage } from "./dom.js";
import { icon } from "./icons.js";
import { percentText } from "./progress.js";
import { badge, card, progressBar, segmented } from "./ui.js";

/** The mark icons are 16px pixel art, shown at their own size. The portraits are 32px. */
const MARK_ICON_SIZE = 16;
const CHARACTER_ICON_SIZE = 32;

export function renderMarksSection(
  marksModel: MarksModel,
  preferences: Preferences,
): HTMLElement {
  const progress = getMarksProgress(marksModel);
  const groups = getCharacterGroups(marksModel);
  const incomplete = getIncomplete(groups);
  const complete = incomplete.length === 0;

  const heading = h("div", { class: "marks-head" }, [
    h("h2", {}, ["Hard completion marks"]),
    h("p", { class: "marks-count muted" }, [
      h("span", { class: "num" }, [`${progress.unlocked} / ${progress.total}`]),
      ` - ${percentText(progress)}`,
    ]),
    ...(complete ? [badge("ok", "Complete", "check")] : []),
  ]);

  const groupsContainer = h("div", { class: "marks-groups" });

  const filter = segmented<MarksShow>({
    label: "Show characters",
    kind: "pressed",
    options: [
      { value: "all", label: "All" },
      { value: "incomplete", label: "Incomplete only" },
    ],
    value: preferences.getMarksShow(),
    onChange: (show) => {
      preferences.setMarksShow(show);
      renderGroups(show);
    },
  });

  function renderGroups(show: MarksShow) {
    groupsContainer.replaceChildren(
      ...(show === "incomplete" && complete
        ? [renderAllDone(showAll)]
        : groups.map((group) => renderGroup(group, show))),
    );
  }

  function showAll() {
    filter.select("all");
    preferences.setMarksShow("all");
    renderGroups("all");
  }

  renderGroups(preferences.getMarksShow());

  return card(
    [
      heading,
      progressBar({
        value: progress.unlocked,
        max: progress.total,
        label: "Hard marks progress",
      }),
      ...(complete ? [] : [renderStillToDo(incomplete)]),
      renderLegend(marksModel),
      h("div", { class: "marks-filter" }, [
        h("span", { class: "small muted", "aria-hidden": "true" }, ["Show:"]),
        filter.element,
      ]),
      groupsContainer,
    ],
    "marks",
  );
}

function renderStillToDo(incomplete: readonly CharacterSummary[]): HTMLElement {
  const items = incomplete.map(({ character, missing }) =>
    h("li", {}, [
      lazyImage(character.icon, "", CHARACTER_ICON_SIZE, "px"),
      h("div", {}, [
        h("strong", {}, [character.name]),
        h("span", { class: "small muted" }, [
          h("span", { class: "sr" }, [", missing: "]),
          missing.join(", "),
        ]),
      ]),
    ]),
  );

  return h("div", { class: "marks-todo" }, [
    h("div", { class: "marks-todo-head" }, [
      h("h3", {}, ["Still to do"]),
      badge("need", stillToDoText(incomplete), "ring"),
    ]),
    h("ul", { "aria-label": "Characters with missing marks" }, items),
  ]);
}

function renderLegend(marksModel: MarksModel): HTMLElement {
  return h("div", { class: "marks-legend" }, [
    h("h3", {}, ["Mark legend"]),
    h(
      "ol",
      {},
      marksModel.marks.map((mark) =>
        h("li", {}, [
          lazyImage(mark.icon, "", MARK_ICON_SIZE, "px"),
          h("span", {}, [mark.name]),
        ]),
      ),
    ),
    h("p", { class: "small muted" }, [
      'Each card shows the 12 marks in this order: left to right, top to bottom. A dashed empty slot means "not done".',
    ]),
  ]);
}

function renderGroup(group: CharacterGroup, show: MarksShow): HTMLElement {
  const summaries = filterSummaries(group.summaries, show);
  const titleId = `marks-group-${group.id}`;

  const body =
    summaries.length === 0
      ? h("p", { class: "marks-group-done" }, [
          badge("ok", `All ${group.title.toLowerCase()} are complete`, "check"),
        ])
      : h(
          "ul",
          { class: "chars", "aria-labelledby": titleId },
          summaries.map((summary) => renderCharacter(summary)),
        );

  return h("section", { class: "marks-group" }, [
    h("div", { class: "marks-group-head" }, [
      h("h3", { id: titleId }, [group.title]),
      h("span", { class: "small muted" }, [
        `${group.done} / ${group.total} marks`,
      ]),
    ]),
    body,
  ]);
}

function renderCharacter(summary: CharacterSummary): HTMLElement {
  const { character, done, total, complete } = summary;

  const fraction = h(
    "span",
    { class: complete ? "frac ok" : "frac need", "aria-hidden": "true" },
    [icon(complete ? "check" : "ring"), `${done}/${total}`],
  );

  const slots = character.marks.map(({ mark, unlocked }) => {
    if (unlocked) {
      return h("li", { class: "slot", title: mark.name }, [
        lazyImage(mark.icon, `${mark.name}: done`, MARK_ICON_SIZE, "px"),
      ]);
    }

    return h("li", { class: "slot empty", title: `${mark.name} (not done)` }, [
      h("span", { class: "sr" }, [`${mark.name}: not done`]),
    ]);
  });

  return h("li", { class: complete ? "char" : "char gap" }, [
    h("div", { class: "char-head" }, [
      lazyImage(character.icon, "", CHARACTER_ICON_SIZE, "px"),
      h("div", { class: "char-name" }, [
        h("h4", {}, [
          h("span", { class: "sr" }, [character.name]),
          h("span", { "aria-hidden": "true" }, [
            visibleCharacterName(character),
          ]),
        ]),
        fraction,
      ]),
    ]),
    h("p", { class: "sr" }, [characterSummaryText(summary)]),
    h(
      "ul",
      { class: "mark-grid", "aria-label": `${character.name} marks` },
      slots,
    ),
  ]);
}

/** Shown instead of an empty grid when "Incomplete only" is chosen and nothing is missing. */
function renderAllDone(showAll: () => void): HTMLElement {
  const button = h("button", { type: "button", class: "btn btn-ghost" }, [
    "Show all characters",
  ]);
  button.addEventListener("click", showAll);

  return h("div", { class: "marks-all-done" }, [
    icon("trophy"),
    h("p", {}, [
      h("strong", {}, ["Every hard mark is done."]),
      " Nothing is missing.",
    ]),
    button,
  ]);
}
