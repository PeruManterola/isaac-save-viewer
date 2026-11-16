import type { Progress } from "../save/model.js";

export function progressText(progress: Progress): string {
  return `${progress.unlocked} / ${progress.total}`;
}

/** The share that is done, from 0 to 100. An empty total counts as 0. */
export function getPercent(progress: Progress): number {
  return progress.total === 0 ? 0 : (progress.unlocked / progress.total) * 100;
}

/**
 * The share that is done with one decimal, e.g. "92.4%". It only says "100%" when everything is
 * done, so that 640 of 641 is not rounded up to look complete.
 */
export function percentText(progress: Progress): string {
  const percent = getPercent(progress);
  if (progress.total > 0 && progress.unlocked >= progress.total) {
    return "100%";
  }

  const rounded = Math.min(99.9, Math.round(percent * 10) / 10);
  return `${rounded.toFixed(1)}%`;
}

/**
 * What is left, e.g. "49 to unlock". Returns undefined when nothing is left.
 *
 * @param progress What is done and the total.
 * @param verb What is left to do, e.g. "unlock", "touch", or "do".
 */
export function remainingText(
  progress: Progress,
  verb: string,
): string | undefined {
  const remaining = progress.total - progress.unlocked;
  return remaining > 0 ? `${remaining} to ${verb}` : undefined;
}
