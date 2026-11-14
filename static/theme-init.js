// Applies the saved colour theme before the first paint, so that the page does not flash the wrong
// theme. It is a separate blocking script because the page has no inline scripts. Keep the storage
// key in sync with the one in "src/state/preferences.ts". "system" (or nothing saved) sets nothing,
// and the CSS follows the operating system.
try {
  const theme = localStorage.getItem("isv:theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  }
} catch {
  // Storage is disabled, so the default theme is used.
}
