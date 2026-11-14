export function progressText(progress: {
  readonly unlocked: number;
  readonly total: number;
}): string {
  return `${progress.unlocked} / ${progress.total}`;
}
