/** The achievement groups, in the order that they are shown on the page. */
export const CATEGORIES = [
  { id: "characterUnlock", name: "Character unlocks" },
  { id: "characterMark", name: "Character marks" },
  { id: "tainted", name: "Tainted" },
  { id: "challenge", name: "Challenges" },
  { id: "dailyOnline", name: "Daily & Online" },
  { id: "misc", name: "Misc" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export function isCategory(value: string): value is Category {
  return CATEGORIES.some((category) => category.id === value);
}
