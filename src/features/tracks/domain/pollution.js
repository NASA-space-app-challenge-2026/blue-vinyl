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

// The aerosol optical depth at 550 nm (the haze of the whole column of air, GEOS-CF's six aerosols summed) of about a
// clear sky.
const CLEAR_SKY_AOD = 0.1;
// The air counts as fully polluted at this aerosol optical depth.
const FULL_SCALE_AOD = 5;

/**
 * How polluted air at aerosol optical depth `aod` is: 0 for clean air rising to 1 at full scale, on a log scale counted
 * in clear skies, as smog reaches fifty times a clear day and a linear scale would squash it into its bottom few percent.
 */
export function pollutionOf(aod) {
  return Math.min(1, Math.max(0, Math.log1p(aod / CLEAR_SKY_AOD) / Math.log1p(FULL_SCALE_AOD / CLEAR_SKY_AOD)));
}

// A rough surface PM2.5 (µg/m³) for each unit of column aerosol optical depth, to read the air's health band off the
// AOD the album follows (the ratio really varies with the weather and the place; this is only a middle value).
const PM25_PER_AOD = 50;

/** The aerosol optical depth a pollution level (pollutionOf) stands for: pollutionOf turned back. */
export function aodOf(level) {
  return CLEAR_SKY_AOD * Math.expm1(level * Math.log1p(FULL_SCALE_AOD / CLEAR_SKY_AOD));
}

/** The health band of air at pollution `level` (pollutionOf), its aerosol optical depth taken as PM2.5 at PM25_PER_AOD. */
export function airBandOf(level) {
  const pm25 = aodOf(level) * PM25_PER_AOD;
  return Object.values(AirBand).findLast((band) => pm25 >= band.from);
}
