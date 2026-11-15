// How polluted the air is, read the same way by the map and the music (see docs/albums/smog.md).

/**
 * The air's band, cleanest first: the US EPA air quality index's health categories for 24-hour mean PM2.5 (2024
 * breakpoints), each `from` its lowest value in µg/m³.
 */
export const AirBand = Object.freeze({
  GOOD: Object.freeze({ from: 0 }),
  MODERATE: Object.freeze({ from: 9.1 }),
  SENSITIVE: Object.freeze({ from: 35.5 }),
  UNHEALTHY: Object.freeze({ from: 55.5 }),
  VERY_UNHEALTHY: Object.freeze({ from: 125.5 }),
  HAZARDOUS: Object.freeze({ from: 225.5 }),
});

// WHO 2021 air quality guideline for 24-hour mean PM2.5, µg/m³.
const WHO_24H_PM25 = 15;
// The air counts as fully polluted at this PM2.5 (µg/m³).
const FULL_SCALE_PM25 = 600;

/**
 * How polluted air at `pm25` (µg/m³) is: 0 for clean air rising to 1 at full scale, on a log scale counted in WHO
 * guidelines, as smog reaches a hundred times a clear day and a linear scale would squash it into its bottom few percent.
 */
export function pollutionOf(pm25) {
  return Math.min(1, Math.max(0, Math.log1p(pm25 / WHO_24H_PM25) / Math.log1p(FULL_SCALE_PM25 / WHO_24H_PM25)));
}
