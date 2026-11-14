import type { ItemEntry } from "../save/model.js";
import { getProgress } from "../save/model.js";
import type { Preferences } from "../state/preferences.js";
import { collapsible } from "./collapsible.js";
import { h, lazyImage } from "./dom.js";
import type { EntryRenderer } from "./entries.js";
import { renderEntries } from "./entries.js";
import { progressText } from "./progress.js";
import { withToolbar } from "./toolbar.js";

const SECTION_ID = "items";
const ICON_SIZE = 64;

const itemRenderer: EntryRenderer<ItemEntry> = {
  columns: [
    { header: "Name", cell: (item) => item.name },
    {
      header: "Icon",
      cell: (item) => lazyImage(item.icon, item.name, ICON_SIZE),
    },
    { header: "Item Pools", cell: getPoolsText },
  ],
  tooltip: (item) => [
    h("p", {}, [h("strong", {}, ["Pools: "]), getPoolsText(item)]),
  ],
  name: (item) => item.name,
  icon: (item) => item.icon,
  unlockedText: "Touched",
  lockedText: "Not touched",
  noun: "items",
};

export function renderItemsSection(
  items: readonly ItemEntry[],
  preferences: Preferences,
): HTMLElement {
  const heading = h("h2", {}, [
    `Items Touched (${progressText(getProgress(items))})`,
  ]);
  const body = withToolbar(preferences, SECTION_ID, "Items", (state) => [
    renderEntries(items, itemRenderer, state.viewMode, state.filter),
  ]);

  return collapsible(preferences, SECTION_ID, heading, body, "isv-section");
}

function getPoolsText(item: ItemEntry): string {
  return item.pools.length === 0
    ? "n/a (not present in any pools)"
    : item.pools.join(", ");
}
