// One hurricane's life, from the best track the album notebook exports (see docs/data-guide.md): where its centre was
// and how hard its wind blew, record by record. Read the same way by the music and the globe, so what is heard and
// what is seen come from one place.

import { lastIndexAtOrBefore } from './bird-track.js';

export const KMH_PER_KT = 1.852;

// The wind (kt) at the top of the scale the storm's size, spin and colour follow: a little above a strong category 5 storm
// (150 kt), so any Atlantic hurricane fits.
const FULL_SCALE_KT = 160;

/**
 * The storm's category, weakest first: the National Hurricane Center's names below hurricane strength, then the
 * Saffir-Simpson categories. `fromKt`: its lowest maximum sustained wind; `rank`: its place in that order.
 */
export const StormCategory = Object.freeze({
  DEPRESSION: Object.freeze({ rank: 0, fromKt: 0, name: 'Tropical depression' }),
  STORM: Object.freeze({ rank: 1, fromKt: 34, name: 'Tropical storm' }),
  CAT1: Object.freeze({ rank: 2, fromKt: 64, name: 'Category 1' }),
  CAT2: Object.freeze({ rank: 3, fromKt: 83, name: 'Category 2' }),
  CAT3: Object.freeze({ rank: 4, fromKt: 96, name: 'Category 3' }),
  CAT4: Object.freeze({ rank: 5, fromKt: 113, name: 'Category 4' }),
  CAT5: Object.freeze({ rank: 6, fromKt: 137, name: 'Category 5' }),
});
export const STORM_CATEGORIES = Object.freeze(Object.values(StormCategory));

/** @param {number} kt */
export function categoryOf(kt) {
  return STORM_CATEGORIES.findLast((category) => kt >= category.fromKt);
}

/** Whether `category` is `floor` or stronger. */
export function atLeast(category, floor) {
  return category.rank >= floor.rank;
}

/** 0 for calm air, rising linearly with the wind to 1 at full scale. */
export function intensityOf(kt) {
  return Math.min(1, Math.max(0, kt / FULL_SCALE_KT));
}

// How fast the storm turns, in radians a second of playback: from `calm` in calm air, rising with its intensity to
// `full` at full scale. The storm on the globe turns at this rate, and the music swirls its ringing drums with it. Both
// ease toward it over `easeSec`, so a sharp change of wind between two records speeds it up or slows it down gently.
const SPIN = Object.freeze({ calm: 2, full: 6, easeSec: 3 });

/** @param {number} intensity 0..1 (see intensityOf) */
export function spinOf(intensity) {
  return SPIN.calm + (SPIN.full - SPIN.calm) * intensity;
}

/** The spin rate `rate` eased `dt` seconds toward `target`; `target` itself when there is none yet (null). */
export function easeSpin(rate, target, dt) {
  return rate === null ? target : target + (rate - target) * Math.exp(-dt / SPIN.easeSec);
}

/**
 * @typedef {Object} StormTrack
 * @property {number[]} t record times, ms since the epoch (UTC), ascending
 * @property {number[]} lat
 * @property {number[]} lon
 * @property {number[]} windKt maximum sustained wind
 */

/**
 * Parses a track CSV: `time_utc,lat,lon,wind_kt,pressure_hpa,landfall`.
 *
 * @param {string} csv
 * @returns {StormTrack}
 */
export function parseStormTrack(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const columns = header.split(',');
  const at = (name) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new Error(`storm track: no ${name} column`);
    return index;
  };
  const col = { time: at('time_utc'), lat: at('lat'), lon: at('lon'), wind: at('wind_kt') };
  const track = { t: [], lat: [], lon: [], windKt: [] };
  for (const line of lines) {
    const cells = line.split(',');
    track.t.push(Date.parse(cells[col.time]));
    track.lat.push(Number(cells[col.lat]));
    track.lon.push(Number(cells[col.lon]));
    track.windKt.push(Number(cells[col.wind]));
  }
  return track;
}

/**
 * @typedef {Object} StormSample
 * @property {number} lat
 * @property {number} lon
 * @property {number} windKt
 */

/**
 * The storm at `time`: its centre and wind between its records. Null outside its life.
 *
 * @param {StormTrack} track
 * @param {number} time
 * @returns {StormSample | null}
 */
export function sampleStorm(track, time) {
  const last = track.t.length - 1;
  if (time < track.t[0] || time > track.t[last]) return null;
  const i = Math.min(lastIndexAtOrBefore(track.t, time), last);
  const j = Math.min(i + 1, last);
  const f = j === i ? 0 : (time - track.t[i]) / (track.t[j] - track.t[i]);
  const mix = (values) => values[i] + f * (values[j] - values[i]);
  return { lat: mix(track.lat), lon: mix(track.lon), windKt: mix(track.windKt) };
}

/** Data time (ms) `sec` into a track `durationSec` long that plays the storm's whole life at an even pace. */
export function stormTimeAt(track, sec, durationSec) {
  const span = track.t[track.t.length - 1] - track.t[0];
  return track.t[0] + (Math.min(Math.max(sec, 0), durationSec) / durationSec) * span;
}

/** How much data time (ms) a second of the track plays. */
export function stormMsPerSec(track, durationSec) {
  return (track.t[track.t.length - 1] - track.t[0]) / durationSec;
}
