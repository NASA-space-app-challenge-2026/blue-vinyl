// One ocean's storm season, as exported by notebooks/hemispheres_album.ipynb (section 11) into
// data/hemispheres/tracks/: every storm of the season, one track per run of tropical records, every 6 hours. Lookups
// over the season shared by the globe and the music.

import { lastIndexAtOrBefore, positionAt } from './bird-track.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const Hemisphere = Object.freeze({ NORTH: 'north', SOUTH: 'south' });

// Each hemisphere's storm calendar, as [month, day]: the northern one from May 1 to Nov 30, the southern one six months
// on. A storm's path is coloured by where its birth falls in it (see calendarShare).
const CALENDAR = Object.freeze({
  [Hemisphere.NORTH]: { from: [5, 1], to: [11, 30] },
  [Hemisphere.SOUTH]: { from: [11, 1], to: [5, 31] },
});

// Saffir-Simpson thresholds in knots: below the first a tropical depression, then a tropical storm, then categories 1
// to 5.
const CATEGORY_KT = Object.freeze([34, 64, 83, 96, 113, 137]);

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
 * The span of data time a season track plays, from the start of its first day to the end of its last.
 *
 * @param {string} from first day, `YYYY-MM-DD`
 * @param {string} to last day, `YYYY-MM-DD`
 * @returns {{ startMs: number, endMs: number }}
 */
export function seasonSpan(from, to) {
  return { startMs: Date.parse(`${from}T00:00Z`), endMs: Date.parse(`${to}T00:00Z`) + DAY_MS };
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
 * Where the day `time` falls in `hemisphere`'s storm calendar: 0 on its first day, 1 on its last. A day between two
 * calendars is held at the end of the nearer one: an early storm at 0, a late one at 1.
 *
 * @param {number} time ms since the epoch
 * @param {string} hemisphere one of Hemisphere
 */
export function calendarShare(time, hemisphere) {
  const { from, to } = CALENDAR[hemisphere];
  const day = (y, [month, d]) => Date.UTC(y, month - 1, d);
  const year = new Date(time).getUTCFullYear();
  // The calendars begun the year before, this year and the next; the southern one runs over the new year.
  for (const y of [year - 1, year, year + 1]) {
    const start = day(y, from);
    const end = day(day(y, to) < start ? y + 1 : y, to);
    const halfGap = (day(y + 1, from) - end) / 2;
    if (time >= start - halfGap && time < end + halfGap) return Math.min(1, Math.max(0, (time - start) / (end - start)));
  }
  throw new Error(`no ${hemisphere} storm calendar holds ${new Date(time).toISOString()}`);
}

/**
 * Saffir-Simpson category of a wind: -1 for a tropical depression, 0 for a tropical storm, then 1 to 5.
 *
 * @param {number} windKt
 */
export function categoryOf(windKt) {
  return CATEGORY_KT.filter((kt) => windKt >= kt).length - 1;
}
