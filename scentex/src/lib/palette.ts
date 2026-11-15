/**
 * Categorical series colours for retailer lines on the dark chart surface.
 * Fixed order, assigned per retailer (never per rank) so a retailer keeps its colour everywhere.
 */
export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"] as const;
export const OTHER_SERIES_COLOR = "#7d8590";

export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? OTHER_SERIES_COLOR;
}
