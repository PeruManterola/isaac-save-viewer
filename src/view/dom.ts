// Small helpers for building DOM elements. Elements are built with `createElement` and
// `textContent` so that no data is ever interpreted as HTML.

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

/** Creates an image that is only loaded when it is about to be shown. */
export function lazyImage(
  src: string,
  alt: string,
  size: number,
  className?: string,
): HTMLImageElement {
  const attributes: Record<string, string> = {
    src,
    alt,
    width: size.toString(),
    height: size.toString(),
    loading: "lazy",
    decoding: "async",
  };
  if (className !== undefined) {
    attributes["class"] = className;
  }

  return h("img", attributes);
}
