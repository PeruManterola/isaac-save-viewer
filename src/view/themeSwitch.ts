// The light / dark switch in the header. "System" follows the operating system and is the default.
// A forced theme is a `data-theme` attribute on <html>, which the CSS tokens react to. The saved
// theme is also applied before the first paint by "static/theme-init.js".

import type { Preferences } from "../state/preferences.js";
import type { Theme } from "../state/theme.js";
import type { IconName } from "./icons.js";
import { segmented } from "./ui.js";

const THEME_OPTIONS = [
  { value: "system", label: "System theme", icon: "monitor" },
  { value: "light", label: "Light theme", icon: "sun" },
  { value: "dark", label: "Dark theme", icon: "moon" },
] as const satisfies ReadonlyArray<{
  value: Theme;
  label: string;
  icon: IconName;
}>;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset["theme"];
  } else {
    root.dataset["theme"] = theme;
  }
}

export function createThemeSwitch(preferences: Preferences): HTMLElement {
  const theme = preferences.getTheme();
  applyTheme(theme);

  return segmented<Theme>({
    label: "Colour theme",
    kind: "radio",
    options: THEME_OPTIONS,
    value: theme,
    iconOnly: true,
    className: "theme-switch",
    onChange: (newTheme) => {
      preferences.setTheme(newTheme);
      applyTheme(newTheme);
    },
  }).element;
}
