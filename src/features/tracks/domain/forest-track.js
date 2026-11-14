// One ISS orbit over a forest and the CO₂ months under it, as exported by notebooks/forest_album.ipynb (section 8)
// into data/forest/tracks/. A track is laid out in steps (sixteenth notes): the orbit has a row per step, each forest
// cell drawn on the globe has the step at which the orbit first passes it, and two steps make a month of CO₂.
// Lookups shared by the globe and the music.

/** Seconds a step lasts; the notebook lays the orbit and the months out on the same grid. */
export const STEP_SEC = 0.22;
/** Steps a month of CO₂ takes. */
export const STEPS_PER_MONTH = 2;
/** Canopy at least this tall (m) is tall forest: it flashes white on the globe and rings a bell in the music. */
export const TALL_FOREST_M = 25;

/**
 * @typedef {Object} Orbit  one row per step
 * @property {Float32Array} lat
 * @property {Float32Array} lon  continuous: never jumps by 360
 * @property {Float32Array} height  mean canopy height (m) under the step, NaN over the sea or a gap
 * @property {Float32Array} heightSd  standard deviation of canopy height (m) in the cells under the step, or NaN
 * @property {Float32Array} forestShare  share (0..1) of the cells around the step (the band drawn on the globe) whose
 *   canopy is 10 m or taller: how thickly the forest stands; NaN where there are none with data
 */

/**
 * @typedef {Object} ForestCells  the cells drawn on the globe, ordered by step
 * @property {Uint16Array} step
 * @property {Float32Array} lat
 * @property {Float32Array} lon
 * @property {Float32Array} height  m
 */

/**
 * @typedef {Object} Air  the global CO₂, a row per month
 * @property {string[]} month  `YYYY-MM-01`
 * @property {Float32Array} ppm
 * @property {number} min  lowest month's ppm
 * @property {number} max  highest month's ppm
 */

/**
 * @typedef {Object} ForestSong
 * @property {Orbit} orbit
 * @property {ForestCells} cells
 * @property {Air} air
 */

function readCsv(csv, columns) {
  const [header, ...lines] = csv.trim().split('\n');
  const names = header.split(',');
  const index = columns.map((column) => names.indexOf(column));
  const absent = columns.filter((_, i) => index[i] < 0);
  if (absent.length) throw new Error(`CSV lacks ${absent.join(', ')}`);
  return { rows: lines.map((line) => line.split(',')), index };
}

const number = (cell) => (cell === '' ? NaN : Number(cell));

/** @returns {Orbit} */
export function parseOrbit(csv) {
  const { rows, index } = readCsv(csv, ['lat_deg', 'lon_deg', 'height_m', 'height_sd_m', 'forest_share']);
  const n = rows.length;
  const orbit = {
    lat: new Float32Array(n),
    lon: new Float32Array(n),
    height: new Float32Array(n),
    heightSd: new Float32Array(n),
    forestShare: new Float32Array(n),
  };
  let prevLon = null;
  rows.forEach((cells, i) => {
    let lon = number(cells[index[1]]);
    if (prevLon !== null) lon += 360 * Math.round((prevLon - lon) / 360);
    orbit.lat[i] = number(cells[index[0]]);
    orbit.lon[i] = lon;
    orbit.height[i] = number(cells[index[2]]);
    orbit.heightSd[i] = number(cells[index[3]]);
    orbit.forestShare[i] = number(cells[index[4]]);
    prevLon = lon;
  });
  return orbit;
}

/** @returns {ForestCells} */
export function parseForestCells(csv) {
  const { rows, index } = readCsv(csv, ['step', 'lat_deg', 'lon_deg', 'height_m']);
  const n = rows.length;
  const cells = { step: new Uint16Array(n), lat: new Float32Array(n), lon: new Float32Array(n), height: new Float32Array(n) };
  rows.forEach((row, i) => {
    cells.step[i] = number(row[index[0]]);
    cells.lat[i] = number(row[index[1]]);
    cells.lon[i] = number(row[index[2]]);
    cells.height[i] = number(row[index[3]]);
  });
  return cells;
}

/** @returns {Air} */
export function parseAir(csv) {
  const { rows, index } = readCsv(csv, ['date', 'xco2_ppm']);
  const ppm = Float32Array.from(rows, (row) => number(row[index[1]]));
  return { month: rows.map((row) => row[index[0]]), ppm, min: Math.min(...ppm), max: Math.max(...ppm) };
}

/** Number of steps in the song. */
export function stepCount(song) {
  return song.orbit.lat.length;
}

/** Where the ISS is at a fractional `step`, between the row it is in and the next. */
export function issAt(orbit, step) {
  const last = orbit.lat.length - 1;
  const i = Math.max(0, Math.min(last, Math.floor(step)));
  if (i === last) return { lat: orbit.lat[i], lon: orbit.lon[i] };
  const f = Math.max(0, step - i);
  return { lat: orbit.lat[i] + f * (orbit.lat[i + 1] - orbit.lat[i]), lon: orbit.lon[i] + f * (orbit.lon[i + 1] - orbit.lon[i]) };
}

/**
 * The CO₂ at a fractional `step`: the month, its ppm, and how thick the air is, 0 at the song's lowest month to 1 at
 * its highest. The months are not smoothed, so the yearly dip (northern summer) shows and is heard.
 *
 * @param {Air} air
 * @param {number} step
 */
export function airAt(air, step) {
  const i = Math.max(0, Math.min(air.ppm.length - 1, Math.floor(step / STEPS_PER_MONTH)));
  const { min, max } = air;
  return { month: air.month[i], ppm: air.ppm[i], thickness: max > min ? (air.ppm[i] - min) / (max - min) : 0 };
}
