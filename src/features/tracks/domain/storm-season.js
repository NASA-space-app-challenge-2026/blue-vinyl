// One ocean's storm season, as exported by notebooks/hemispheres_album.ipynb (section 11) into
// data/hemispheres/tracks/: every storm of the season, one track per run of tropical records, every 6 hours. Lookups
// over the season shared by the globe and the music.

import { lastIndexAtOrBefore, positionAt } from './bird-track.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const Hemisphere = Object.freeze({ NORTH: 'north', SOUTH: 'south' });

// A season track plays three days a second, held to `minSec`..`maxSec`: a basin's season of about five months in a
// minute or less.
const PACE = Object.freeze({ msPerSec: 3 * DAY_MS, minSec: 45, maxSec: 60 });

// Each hemisphere's storm season, as months (0 = January): `months` long from `first`, the north's from May, the
// south's six months later, from November. A storm up to EARLY_MONTHS before its season counts as early in it.
const SEASON = Object.freeze({
  [Hemisphere.NORTH]: Object.freeze({ first: 4, months: 7 }),
  [Hemisphere.SOUTH]: Object.freeze({ first: 10, months: 7 }),
});
const EARLY_MONTHS = 2;

// CSV column of each field; the unit is part of the column name.
const Column = Object.freeze({ time: 'time', storm: 'storm', name: 'name', lat: 'lat_deg', lon: 'lon_deg', wind: 'wind_kt' });

/**
 * @typedef {Object} StormTrack
 * @property {string} id  IBTrACS storm id and run, such as `2023239N21274-1`
 * @property {string} name
 * @property {Float64Array} t  ms since the epoch, ascending
 * @property {Float32Array} lat
 * @property {Float32Array} lon  continuous: never jumps by 360
 * @property {Float32Array} wind  knots
 */

/**
 * @param {string} csv
 * @returns {StormTrack[]} in the order the storms are born
 */
export function parseStormSeason(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const names = header.split(',');
  const index = Object.fromEntries(Object.entries(Column).map(([field, column]) => [field, names.indexOf(column)]));
  const absent = Object.keys(Column).filter((field) => index[field] < 0);
  if (absent.length) throw new Error(`season CSV lacks ${absent.map((field) => Column[field]).join(', ')}`);

  const rowsById = new Map();
  for (const line of lines) {
    const cells = line.split(',');
    const id = cells[index.storm];
    if (!rowsById.has(id)) rowsById.set(id, []);
    rowsById.get(id).push(cells);
  }
  return [...rowsById].map(([id, rows]) => buildTrack(id, rows, index)).sort((a, b) => a.t[0] - b.t[0]);
}

function buildTrack(id, rows, index) {
  rows.sort((a, b) => Date.parse(a[index.time]) - Date.parse(b[index.time]));
  const n = rows.length;
  const track = {
    id,
    name: rows[0][index.name],
    t: new Float64Array(n),
    lat: new Float32Array(n),
    lon: new Float32Array(n),
    wind: new Float32Array(n),
  };
  rows.forEach((cells, i) => {
    let lon = Number(cells[index.lon]);
    if (i > 0) lon += 360 * Math.round((track.lon[i - 1] - lon) / 360);
    track.t[i] = Date.parse(cells[index.time]);
    track.lat[i] = Number(cells[index.lat]);
    track.lon[i] = lon;
    track.wind[i] = Number(cells[index.wind]);
  });
  return track;
}

/**
 * The span of data time a season track plays, from its first record to its last.
 *
 * @param {string} from the first record's time, ISO 8601
 * @param {string} to the last record's time, ISO 8601
 * @returns {{ startMs: number, endMs: number }}
 */
export function seasonSpan(from, to) {
  return { startMs: Date.parse(from), endMs: Date.parse(to) };
}

/**
 * How long a season track that plays `span` lasts, at PACE.
 *
 * @param {{ startMs: number, endMs: number }} span
 */
export function seasonDurationSec({ startMs, endMs }) {
  return Math.min(PACE.maxSec, Math.max(PACE.minSec, (endMs - startMs) / PACE.msPerSec));
}

/**
 * Data time at `trackSec` into a track that plays `span` in `durationSec`.
 *
 * @param {{ startMs: number, endMs: number }} span
 * @param {number} durationSec
 * @param {number} trackSec
 */
export function seasonTimeAt(span, durationSec, trackSec) {
  return span.startMs + (trackSec / durationSec) * (span.endMs - span.startMs);
}

/**
 * @typedef {Object} Storm a storm as it is at one time
 * @property {StormTrack} track
 * @property {number} lat
 * @property {number} lon
 * @property {number} wind  knots
 * @property {number} east  degrees of longitude east of where the track began (negative: west)
 */

/**
 * The storms whose track has begun and not yet ended at `time`.
 *
 * @param {StormTrack[]} tracks
 * @param {number} time
 * @returns {Storm[]}
 */
export function stormsAt(tracks, time) {
  const storms = [];
  for (const track of tracks) {
    if (time < track.t[0] || time > track.t[track.t.length - 1]) continue;
    const i = lastIndexAtOrBefore(track.t, time);
    const [lat, lon] = positionAt(track, i, time);
    const next = Math.min(i + 1, track.t.length - 1);
    const f = next === i ? 0 : (time - track.t[i]) / (track.t[next] - track.t[i]);
    const wind = track.wind[i] + f * (track.wind[next] - track.wind[i]);
    storms.push({ track, lat, lon, wind, east: lon - track.lon[0] });
  }
  return storms;
}

/**
 * The path a track has drawn by `time`, from where it began to where it is (all of it once it has ended), as
 * [lat, lon] pairs with no point repeated in a row; empty before it begins.
 *
 * @param {StormTrack} track
 * @param {number} time
 * @returns {[number, number][]}
 */
export function pathBy(track, time) {
  if (time < track.t[0]) return [];
  const i = lastIndexAtOrBefore(track.t, time);
  const points = [];
  const add = ([lat, lon]) => {
    const last = points[points.length - 1];
    if (!last || last[0] !== lat || last[1] !== lon) points.push([lat, lon]);
  };
  for (let j = 0; j <= i; j++) add([track.lat[j], track.lon[j]]);
  if (i < track.t.length - 1) add(positionAt(track, i, time));
  return points;
}

/** The hemisphere a track began in. */
export function hemisphereOf(track) {
  return track.lat[0] >= 0 ? Hemisphere.NORTH : Hemisphere.SOUTH;
}

/**
 * When in its hemisphere's storm season `track`'s storm formed: 0 on the season's first day, 1 at its end. An early
 * storm, up to EARLY_MONTHS before the season, is held at 0; any other out of season at 1.
 *
 * @param {StormTrack} track
 */
export function seasonShare(track) {
  const { first, months } = SEASON[hemisphereOf(track)];
  const time = track.t[0];
  const date = new Date(time);
  const year = date.getUTCFullYear() - (date.getUTCMonth() < first - EARLY_MONTHS ? 1 : 0);
  const from = Date.UTC(year, first, 1);
  const to = Date.UTC(year, first + months, 1);
  return Math.min(1, Math.max(0, (time - from) / (to - from)));
}
