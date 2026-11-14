// Small helpers for building and showing DOM elements. Elements are built with `createElement` and
// `textContent` so that no data is ever interpreted as HTML.

const DISPLAY_VISIBLE = "block";
const DISPLAY_HIDDEN = "none";

type Child = Node | string;

export function getElement(id: string): HTMLElement {
  const element = document.querySelector(`#${id}`);
  if (element === null) {
    throw new Error(`Failed to find the element with ID: ${id}`);
  }

  if (!(element instanceof HTMLElement)) {
    throw new TypeError(`The "#${id}" element is not an HTMLElement.`);
  }

  return element;
}

/** Creates an element with the given attributes and children. String children become text nodes. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Readonly<Record<string, string>> = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...children);

  return element;
}

export function hide(element: HTMLElement): void {
  element.style.display = DISPLAY_HIDDEN;
}

export function show(element: HTMLElement): void {
  element.style.display = DISPLAY_VISIBLE;
}

export function toggle(element: HTMLElement): void {
  if (element.style.display === DISPLAY_HIDDEN) {
    show(element);
  } else {
    hide(element);
  }
}
