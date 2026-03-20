export const HONOR_DECIMAL_SCALE = 100;

export function roundHonorValue(value: number) {
  return Math.round((value + Number.EPSILON) * HONOR_DECIMAL_SCALE) / HONOR_DECIMAL_SCALE;
}

export function hasHonorPrecision(value: number) {
  return Math.abs(value - roundHonorValue(value)) < Number.EPSILON;
}

export function formatHonorValue(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(roundHonorValue(value));
}
