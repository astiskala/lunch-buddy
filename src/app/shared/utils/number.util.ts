export interface PercentOptions {
  min?: number;
  max?: number;
}

export const toPercent = (
  ratio: number,
  options: PercentOptions = {}
): number => {
  const raw = Math.round(ratio * 100);
  const min = options.min ?? -Infinity;
  const max = options.max ?? Infinity;
  return Math.min(max, Math.max(min, raw));
};
