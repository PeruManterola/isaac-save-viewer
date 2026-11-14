import type { Category } from "../save/categories.js";
import { CATEGORIES } from "../save/categories.js";
import type { AchievementEntry } from "../save/model.js";
import { getProgress } from "../save/model.js";
import type { Preferences } from "../state/preferences.js";
import { collapsible } from "./collapsible.js";
import { h, lazyImage } from "./dom.js";
import type { EntryRenderer } from "./entries.js";
import { renderEntries } from "./entries.js";
import { progressText } from "./progress.js";
import { withToolbar } from "./toolbar.js";

const SECTION_ID = "achievements";
const WIKI_PREFIX = "https://bindingofisaacrebirth.wiki.gg/wiki/";
const ICON_SIZE = 64;

const achievementRenderer: EntryRenderer<AchievementEntry> = {
  columns: [
    { header: "Name", cell: nameWithLink },
    {
      header: "Icon",
      cell: (achievement) =>
        achievement.icon === undefined
          ? ""
          : lazyImage(achievement.icon, achievement.name, ICON_SIZE),
    },
    {
      header: "In-Game Description",
      cell: (achievement) => achievement.inGameDescription,
    },
    {
      header: "Unlock Requirement",
      cell: (achievement) => achievement.unlockDescription,
    },
  ],
  tooltip: (achievement) => [
    ...(achievement.inGameDescription === ""
      ? []
      : [h("p", { class: "isv-quote" }, [achievement.inGameDescription])]),
    h("p", {}, [h("strong", {}, ["Unlock: "]), achievement.unlockDescription]),
    ...(achievement.link === ""
      ? []
      : [h("p", {}, [wikiLink(achievement.link, "Wiki page")])]),
  ],
  name: (achievement) => achievement.name,
  icon: (achievement) => achievement.icon,
  unlockedText: "Unlocked",
  lockedText: "Locked",
  noun: "achievements",
};

export function renderAchievementsSection(
  achievements: readonly AchievementEntry[],
  preferences: Preferences,
): HTMLElement {
  const heading = h("h2", { class: "title is-4" }, [
    `Achievements (${progressText(getProgress(achievements))})`,
  ]);
  const body = withToolbar(preferences, SECTION_ID, "Achievements", (state) =>
    CATEGORIES.map(({ id, name }) => {
      const groupAchievements = getAchievementsInCategory(achievements, id);
      const groupHeading = h("h3", { class: "title is-5" }, [
        `${name} (${progressText(getProgress(groupAchievements))})`,
      ]);

      return collapsible(
        preferences,
        `${SECTION_ID}:${id}`,
        groupHeading,
        [
          renderEntries(
            groupAchievements,
            achievementRenderer,
            state.viewMode,
            state.filter,
          ),
        ],
        "isv-group",
      );
    }),
  );

  return collapsible(preferences, SECTION_ID, heading, body, "isv-section");
}

function getAchievementsInCategory(
  achievements: readonly AchievementEntry[],
  category: Category,
): readonly AchievementEntry[] {
  return achievements.filter(
    (achievement) => achievement.category === category,
  );
}

function nameWithLink(achievement: AchievementEntry): Node | string {
  return achievement.link === ""
    ? achievement.name
    : wikiLink(achievement.link, achievement.name);
}

/**
 * @param link A URL-encoded wiki page slug, optionally with a fragment.
 * @param text What the link says, e.g. the achievement name.
 */
function wikiLink(link: string, text: string): HTMLElement {
  return h("a", { href: `${WIKI_PREFIX}${link}` }, [text]);
}
