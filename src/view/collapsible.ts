import type { Preferences } from "../state/preferences.js";
import { h } from "./dom.js";

/**
 * Creates a section or group that can be collapsed by clicking its heading. Whether it is collapsed
 * is remembered.
 *
 * @param preferences Where to remember whether it is collapsed.
 * @param id The ID used to remember whether it is collapsed.
 * @param heading The heading, which is always shown.
 * @param body The content that is hidden when collapsed.
 * @param className The class of the `details` element.
 */
export function collapsible(
  preferences: Preferences,
  id: string,
  heading: HTMLElement,
  body: readonly Node[],
  className: string,
): HTMLDetailsElement {
  const summary = h("summary", { class: "isv-summary" }, [heading]);
  const details = h("details", { class: className }, [summary, ...body]);
  details.open = !preferences.isCollapsed(id);
  details.addEventListener("toggle", () => {
    preferences.setCollapsed(id, !details.open);
  });

  return details;
}
