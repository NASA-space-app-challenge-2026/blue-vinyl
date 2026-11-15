// A city's year of smog, read the same way by the map and the music (see docs/albums/smog.md).
//
// A track plays one day a sixteenth note of a 136 BPM bar: the year in about 40 s. Each day has the city's PM2.5 (one
// hour a day, 00:30 UTC) and the box of cells around it the map draws. Every value becomes the fog it draws (fogOf), on
// one scale for every city, so a clean city's air is drawn and heard as thinly as it is.
//
// A swing (from the notebook) is a day the city's air crosses into its own dirtiest tenth of days (the smog rolls in)
// or into its cleanest tenth (it clears). Swings sound and flash on their own day: the air can swing back the very next
// day, so they are not moved onto the beat.

export const BPM = 136;
export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = 16;
/** A day is a sixteenth note. */
export const STEP_SEC = 60 / BPM / STEPS_PER_BEAT;
export const DAY_MS = 24 * 60 * 60 * 1000;
/** Data ms a second of a track plays. */
export const SMOG_MS_PER_SEC = DAY_MS / STEP_SEC;

// The fog scale, the same for every city: none at the WHO 2021 24-hour guideline for PM2.5, all of it from the lowest
// value of the US EPA's "very unhealthy" category (2024 breakpoints), log-scaled between (µg/m³; user, 2026-11-15).
const FOG_FROM_PM25 = 15;
const FOG_FULL_PM25 = 125.5;
// The grid's fog is stored as bytes, 0..FOG_BYTE.
const FOG_BYTE = 255;

/** How thick the fog of air at `pm25` (µg/m³) is, 0 (clear) to 1. */
export function fogOf(pm25) {
  if (!(pm25 > FOG_FROM_PM25)) return 0;
  return Math.min(1, Math.log(pm25 / FOG_FROM_PM25) / Math.log(FOG_FULL_PM25 / FOG_FROM_PM25));
}

/** The swing a day can mark, by its CSV value. */
export const Swing = Object.freeze({ SMOG: 'smog', CLEAR: 'clear' });

/**
 * How far the last swing before `trackSec` (s into the track) still shows, 0 to 1, fading over `fadeSec`: `smog` as the
 * smog rolls in, `clear` as it clears.
 *
 * @param {SmogTrack} track
 */
export function swingGlowAt(track, trackSec, fadeSec) {
  let last = null;
  for (const swing of track.swings) {
    if (swing.day * STEP_SEC > trackSec) break;
    last = swing;
  }
  const glow = last ? Math.max(0, 1 - (trackSec - last.day * STEP_SEC) / fadeSec) : 0;
  return { smog: last && !last.clear ? glow : 0, clear: last?.clear ? glow : 0 };
}

/** How long a track of `days` days plays (s). */
export function smogDurationSec(days) {
  return days * STEP_SEC;
}

/**
 * @typedef {Object} SmogTrack
 * @property {Float64Array} t each day's time (ms since the epoch, its 00:30 UTC hour)
 * @property {Float32Array} pm25 the city's PM2.5 each day (µg/m³)
 * @property {Float32Array} fog the city's fog each day (fogOf)
 * @property {{ day: number, clear: boolean }[]} swings each swing: its day (the step it sounds on, from the track's
 *   start) and whether the air cleared
 */

/**
 * @param {string} csv the track's file: date, pm25_ugm3, swing
 * @param {string} sampleUtc the hour of each day the values are from, `HH:MM`
 * @returns {SmogTrack}
 */
export function parseSmogTrack(csv, sampleUtc) {
  const rows = csv.trim().split('\n').slice(1).map((line) => line.split(','));
  const t = Float64Array.from(rows, ([date]) => Date.parse(`${date}T${sampleUtc}:00Z`));
  const pm25 = Float32Array.from(rows, ([, value]) => Number(value));
  const fog = Float32Array.from(pm25, fogOf);
  const swings = [];
  rows.forEach(([, , swing], day) => {
    if (!swing) return;
    if (swing !== Swing.SMOG && swing !== Swing.CLEAR) throw new Error(`unknown swing "${swing}" on day ${day}`);
    swings.push({ day, clear: swing === Swing.CLEAR });
  });
  return { t, pm25, fog, swings };
}

/**
 * The fog over the box around the city, each day.
 *
 * @typedef {Object} SmogGrid
 * @property {number} rows
 * @property {number} cols
 * @property {{ south: number, west: number, stepDeg: number }} box the cell centres' south-west corner and spacing (°)
 * @property {Uint8Array[]} fog each day's cells (row 0 the box's south edge, column 0 its west), 0..255 of a whole fog
 * @property {Float32Array} thinning how much fog the box loses by the next day, averaged over its cells (0 to 1)
 */

/**
 * @param {string} csv the grid file: date, then each cell's PM2.5 (µg/m³) row by row
 * @param {{ south: number, west: number, stepDeg: number, rows: number, cols: number }} grid the box (tracks.json)
 * @returns {SmogGrid}
 */
export function parseSmogGrid(csv, { south, west, stepDeg, rows, cols }) {
  const lines = csv.trim().split('\n').slice(1);
  const fog = lines.map((line) => {
    const cells = line.split(',').slice(1);
    if (cells.length !== rows * cols) throw new Error(`grid row has ${cells.length} cells, not ${rows * cols}`);
    return Uint8Array.from(cells, (value) => Math.round(FOG_BYTE * fogOf(Number(value))));
  });
  const thinning = Float32Array.from(fog, (day, i) => {
    const next = fog[Math.min(i + 1, fog.length - 1)];
    let lost = 0;
    for (let k = 0; k < day.length; k++) lost += Math.max(0, day[k] - next[k]);
    return lost / day.length / FOG_BYTE;
  });
  return { rows, cols, box: { south, west, stepDeg }, fog, thinning };
}

// The globe looks at the city from close enough that the label's edge stays this share of the way to the box's nearest
// edge, so the fog fills the label.
const VIEW_FILL = 0.9;

/**
 * Where the globe looks for a city's track: the city in the middle, the label's edge `arcDeg` of arc from it, inside
 * the box at the city's latitude, where a degree of longitude is cos(latitude) of a degree of arc.
 *
 * @param {{ lat: number, lon: number }} city
 * @param {SmogGrid} grid
 */
export function cityFocus(city, { rows, cols, box }) {
  const halfArc = (box.stepDeg / 2) * Math.min(rows, cols * Math.cos((city.lat * Math.PI) / 180));
  return { lat: city.lat, lon: city.lon, arcDeg: VIEW_FILL * halfArc };
}

/** The day (fractional) at data `time` of `track`, from its first day. */
export function dayAt(track, time) {
  return (time - track.t[0]) / DAY_MS;
}
