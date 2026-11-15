import { AirBand } from '../../tracks/domain/pollution.js';
import { colorRamp } from './color-ramp.js';

// Each air band's colour: clear sky blue for good air, then the US EPA's yellow, orange, red, purple and maroon as the
// air worsens.
const BAND_COLOR = new Map([
  [AirBand.GOOD, [143, 227, 255]],
  [AirBand.MODERATE, [244, 226, 122]],
  [AirBand.SENSITIVE, [242, 154, 74]],
  [AirBand.UNHEALTHY, [226, 72, 64]],
  [AirBand.VERY_UNHEALTHY, [150, 72, 160]],
  [AirBand.HAZARDOUS, [128, 24, 48]],
]);

// The city's dot and name glow like neon tubes, each band in a brighter, more saturated colour than its map colour.
const NEON_COLOR = new Map([
  [AirBand.GOOD, [61, 245, 255]],
  [AirBand.MODERATE, [247, 255, 61]],
  [AirBand.SENSITIVE, [255, 159, 26]],
  [AirBand.UNHEALTHY, [255, 59, 79]],
  [AirBand.VERY_UNHEALTHY, [193, 61, 255]],
  [AirBand.HAZARDOUS, [255, 46, 136]],
]);

/**
 * The colour of a plain's haze (0 clear to 1 all fog; see tracks/domain/smog.js), for the glow round the globe: good
 * air's blue, through the bands' colours up to very unhealthy air's purple.
 */
export const smogColor = colorRamp([
  [0, BAND_COLOR.get(AirBand.GOOD)],
  [0.25, BAND_COLOR.get(AirBand.SENSITIVE)],
  [0.5, BAND_COLOR.get(AirBand.UNHEALTHY)],
  [1, BAND_COLOR.get(AirBand.VERY_UNHEALTHY)],
]);

/** The CSS neon colour of an air band (AirBand): cyan for good air, then yellow, orange, red, violet and hot pink. */
export function airBandColor(band) {
  return `rgb(${NEON_COLOR.get(band).join(' ')})`;
}
