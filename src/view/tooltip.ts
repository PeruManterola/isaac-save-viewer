// The descriptions of grid tiles are shown by CSS on hover and keyboard focus. On touch screens,
// tapping a tile toggles its description. This module also keeps descriptions inside the window.

const TILE_SELECTOR = ".isv-tile";
const TOOLTIP_SELECTOR = ".isv-tooltip";
const ACTIVE_CLASS = "is-active";
const WINDOW_MARGIN_PX = 8;

/** Sets up the tiles inside the container. Tiles that are added later are handled too. */
export function initTooltips(container: HTMLElement): void {
  container.addEventListener("click", (event) => {
    const target = event.target as Element;
    // Let links inside a description work normally.
    if (target.closest("a") !== null) {
      return;
    }

    const tile = target.closest(TILE_SELECTOR);
    const activeTiles = container.querySelectorAll(
      `${TILE_SELECTOR}.${ACTIVE_CLASS}`,
    );
    for (const activeTile of activeTiles) {
      if (activeTile !== tile) {
        activeTile.classList.remove(ACTIVE_CLASS);
      }
    }

    if (tile instanceof HTMLElement) {
      tile.classList.toggle(ACTIVE_CLASS);
      keepInWindow(tile);
    }
  });

  container.addEventListener("mouseover", (event) => {
    const tile = (event.target as Element).closest(TILE_SELECTOR);
    if (tile instanceof HTMLElement) {
      keepInWindow(tile);
    }
  });

  container.addEventListener("focusin", (event) => {
    const tile = (event.target as Element).closest(TILE_SELECTOR);
    if (tile instanceof HTMLElement) {
      keepInWindow(tile);
    }
  });

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const tile = (event.target as Element).closest(TILE_SELECTOR);
    if (tile instanceof HTMLElement) {
      tile.classList.remove(ACTIVE_CLASS);
      tile.blur();
    }
  });
}

/** Moves the description of a tile sideways so that it does not go past the edge of the window. */
function keepInWindow(tile: HTMLElement) {
  const tooltip = tile.querySelector<HTMLElement>(TOOLTIP_SELECTOR);
  if (tooltip === null) {
    return;
  }

  tooltip.style.removeProperty("--isv-tooltip-shift");
  const rect = tooltip.getBoundingClientRect();
  if (rect.width === 0) {
    return;
  }

  const maxRight = document.documentElement.clientWidth - WINDOW_MARGIN_PX;
  let shift = 0;
  if (rect.left < WINDOW_MARGIN_PX) {
    shift = WINDOW_MARGIN_PX - rect.left;
  } else if (rect.right > maxRight) {
    shift = maxRight - rect.right;
  }

  if (shift !== 0) {
    tooltip.style.setProperty("--isv-tooltip-shift", `${shift}px`);
  }
}
