// The achievements and collectibles tables.

import type { AchievementEntry, ItemEntry, SaveModel } from "../save/model.js";
import { getProgress } from "../save/model.js";
import { getElement, h, hide, show, toggle } from "./dom.js";

type Prefix = "achievements" | "collectibles";

const SAVE_FILE_STATS_ID = "save-file-stats";
const WIKI_PREFIX = "https://bindingofisaacrebirth.wiki.gg/wiki/";
const HIDE_TEXT = "Hide";
const SHOW_TEXT = "Show";

export function renderSaveModel(saveModel: SaveModel): void {
  renderTable("achievements", saveModel.achievements, getAchievementCells);
  renderTable("collectibles", saveModel.items, getItemCells);
  show(getElement(SAVE_FILE_STATS_ID));
}

function getAchievementCells(achievement: AchievementEntry): readonly Node[] {
  const { id, name, link, inGameDescription, unlockDescription, icon } =
    achievement;

  const nameCell =
    link === ""
      ? document.createTextNode(name)
      : h("a", { href: `${WIKI_PREFIX}${link}` }, [name]);
  const iconCell =
    icon === undefined
      ? document.createTextNode("")
      : h("img", { src: icon, alt: name });

  return [
    document.createTextNode(id.toString()),
    nameCell,
    iconCell,
    document.createTextNode(inGameDescription),
    document.createTextNode(unlockDescription),
  ];
}

function getItemCells(item: ItemEntry): readonly Node[] {
  const poolsText =
    item.pools.length === 0
      ? "n/a (not present in any pools)"
      : item.pools.join(", ");

  return [
    document.createTextNode(item.id.toString()),
    document.createTextNode(item.name),
    h("img", { src: item.icon, alt: item.name }),
    document.createTextNode(poolsText),
  ];
}

/** Fills a table with the locked entries, and sets up the header count and the toggle link. */
function renderTable<T extends { readonly unlocked: boolean }>(
  prefix: Prefix,
  entries: readonly T[],
  getCells: (entry: T) => readonly Node[],
) {
  const tableElement = getElement(`${prefix}-table`);
  const tBodyElement = getElement(`${prefix}-table-tbody`);
  const completedElement = getElement(`${prefix}-completed`);
  const toggleElement = getElement(`${prefix}-toggle`);
  const sectionElement = getElement(`${prefix}-section`);

  const rows = entries
    .filter((entry) => !entry.unlocked)
    .map((entry) =>
      h(
        "tr",
        {},
        getCells(entry).map((cell) => h("td", {}, [cell])),
      ),
    );
  tBodyElement.replaceChildren(...rows);

  const { unlocked, total } = getProgress(entries);
  getElement(`${prefix}-gotten`).textContent = unlocked.toString();
  getElement(`${prefix}-total`).textContent = total.toString();

  if (unlocked === total) {
    hide(tableElement);
  } else {
    hide(completedElement);
  }

  toggleElement.addEventListener("click", () => {
    toggle(sectionElement);
    toggleElement.textContent =
      toggleElement.textContent === HIDE_TEXT ? SHOW_TEXT : HIDE_TEXT;
  });
}
