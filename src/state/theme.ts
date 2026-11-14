// The colour theme option: follow the operating system, or force light or dark.

const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "system";

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}
