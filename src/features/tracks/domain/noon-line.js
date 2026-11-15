// The world's forest read under the noon line, as exported by notebooks/forest_album.ipynb (section 8) into
// data/forest/tracks/. The Earth turns once under the line, the meridian where the Sun stands highest, which moves west a
// degree of longitude a step from the date line round to it again. It is read in three bands, each a voice of the
// music. Lookups shared by the globe, the music and the docent.

/** Seconds a step lasts: a sixteenth note at 120 beats a minute. */
export const STEP_SEC = 0.125;
/** Steps in a bar: 3/4 in sixteenths. */
export const STEPS_PER_BAR = 12;
/** Steps the line takes to go once round the Earth: a degree of longitude each. */
export const LINE_STEPS = 360;
/**
 * Steps of the line that have sound: the last tree's note and the last bar of the drone end here (step 312, over North
 * America), and the Pacific after it is silent, so the track ends here. Measured from the picked trees (forest-trees.js)
 * and the line; measure it again if either changes.
 */
export const SOUND_STEPS = 312;
/** Seconds the track fades in over at its start and out over at its end. */
export const FADE_SEC = Object.freeze({ in: 2, out: 4 });
/** Steps the listening legend takes before the line starts, on a track that opens with it (10 bars of 3/4). */
export const LEGEND_STEPS = 120;
/** The line starts at the date line and moves west. */
const START_LON = 180;

/** The bands the line is read in, north to south, each a voice of the music. */
export const Band = Object.freeze({ NORTH: 'north', TROPICS: 'tropics', SOUTH: 'south' });
export const BANDS = Object.freeze([Band.NORTH, Band.TROPICS, Band.SOUTH]);
/** Each band's latitudes, south to north (°), as notebooks/forest_album.ipynb (section 4) reads them. */
export const BAND_LATS = Object.freeze({
  [Band.NORTH]: Object.freeze([23, 52]),
  [Band.TROPICS]: Object.freeze([-23, 23]),
  [Band.SOUTH]: Object.freeze([-52, -23]),
});

// A bar's mean forest density (see barLevelAt) that counts as the thickest the line meets.
const LEVEL_FULL_AT = 0.4;

// A band takes part where at least this share of it is land and its forest is this tall on average (m).
const PLAYS_FROM = Object.freeze({ land: 0.2, heightM: 4 });

/**
 * The regions the line crosses, in the order it reaches them, from the longitude where each begins (east edge) going
 * west; `land` regions are announced with a bell. Ours: drawn round the continents as they lie between 52° S and
 * 52° N.
 */
export const REGIONS = Object.freeze([
  { name: 'the Pacific Ocean', fromLon: 180, land: false },
  { name: 'East Asia and Australia', fromLon: 160, land: true },
  { name: 'South Asia', fromLon: 95, land: true },
  { name: 'Africa and Europe', fromLon: 60, land: true },
  { name: 'the Atlantic Ocean', fromLon: -18, land: false },
  { name: 'South America', fromLon: -35, land: true },
  { name: 'North America', fromLon: -82, land: true },
  { name: 'the Pacific Ocean', fromLon: -125, land: false },
]);

/**
 * @typedef {Object} BandSeries  one value per step
 * @property {Float32Array} height  mean canopy height (m) of the band's land under the line, NaN where none
 * @property {Float32Array} density  share of that land with canopy of 10 m or taller, NaN where none
 * @property {Float32Array} land  share of the band with data at all
 */

/**
 * @typedef {Object} NoonLine
 * @property {Float32Array} lon  the middle of the degree each step crosses
 * @property {Record<string, BandSeries>} bands  by Band
 */

/** @returns {NoonLine} */
export function parseNoonLine(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const names = header.split(',');
  const column = (name) => {
    const i = names.indexOf(name);
    if (i < 0) throw new Error(`noon line CSV lacks ${name}`);
    return i;
  };
  const rows = lines.map((line) => line.split(','));
  const series = (name) => {
    const i = column(name);
    return Float32Array.from(rows, (row) => (row[i] === '' ? NaN : Number(row[i])));
  };
  return {
    lon: series('lon_deg'),
    bands: Object.fromEntries(BANDS.map((band) => [band, {
      height: series(`${band}_height_m`),
      density: series(`${band}_density`),
      land: series(`${band}_land_share`),
    }])),
  };
}

/** Longitude of the noon line at a fractional step of the line (0 at the date line, LINE_STEPS once round). */
export function lineLonAt(lineStep) {
  return START_LON - Math.max(0, Math.min(LINE_STEPS, lineStep));
}

/** The step of the line at which it crosses longitude `lon` (degrees east). */
export function lineStepAt(lon) {
  return (((START_LON - lon) % LINE_STEPS) + LINE_STEPS) % LINE_STEPS;
}

/** The region the line is in at a whole step of the line. */
export function regionAt(lineStep) {
  const lon = lineLonAt(lineStep) - 0.5;
  return REGIONS.findLast((region) => lon <= region.fromLon) ?? REGIONS[0];
}

/**
 * What a band does at a whole step of the line: null where it stays quiet (sea, desert, grass), otherwise its forest's
 * height (m) and density (0..1).
 *
 * @param {NoonLine} line
 * @param {string} band
 * @param {number} lineStep
 */
export function bandAt(line, band, lineStep) {
  const series = line.bands[band];
  const height = series.height[lineStep];
  if (!(series.land[lineStep] >= PLAYS_FROM.land) || !(height >= PLAYS_FROM.heightM)) return null;
  return { height, density: series.density[lineStep] || 0 };
}

/**
 * How thick the forest under the line is over the bar a step is in, 0..1: each band's forest density where it sounds
 * (see bandAt), added up and shared over the bands, averaged over the bar's steps and counted full from `LEVEL_FULL_AT`. The drone under the music and the
 * brightness of the noon meridian both follow it, a bar at a time.
 *
 * @param {NoonLine} line
 * @param {number} lineStep
 */
export function barLevelAt(line, lineStep) {
  const first = Math.floor(lineStep / STEPS_PER_BAR) * STEPS_PER_BAR;
  let sum = 0;
  for (let step = first; step < first + STEPS_PER_BAR; step++) {
    if (step >= LINE_STEPS) break;
    for (const band of BANDS) sum += bandAt(line, band, step)?.density ?? 0;
  }
  return Math.min(1, sum / (STEPS_PER_BAR * BANDS.length) / LEVEL_FULL_AT);
}

/** The loudness of the forest track `sec` seconds in, 0..1: faded in at its start and out at its end. */
export function fadeAt(sec) {
  return Math.max(0, Math.min(1, sec / FADE_SEC.in, (SOUND_STEPS * STEP_SEC - sec) / FADE_SEC.out));
}
