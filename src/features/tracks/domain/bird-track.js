// Birds' paths laid over one year, as exported by notebooks/arctic_bird_album.ipynb (section 9) into
// data/arctic_bird/tracks/: each path is one bird in one calendar year, its time measured from Jan 1 of that year, so
// the birds of every year fly together through one. Lookups and the flock (the birds on the map averaged together)
// over them, shared by the globe and the music.

import { distanceKm } from './geo.js';

const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
// The year every track is laid over, from Jan 1 to the end of Dec 31.
export const YEAR_MS = 365 * DAY_MS;
// A bird faster than this counts as flying.
const FLYING_KMH = 5;
// Longitudes east of this are shifted by -360, so paths stay continuous across the Bering Sea and the date line.
const LON_SPLIT = 10;

// CSV column of each field; the unit is part of the column name.
const Column = Object.freeze({ date: 'date', track: 'track', lat: 'lat_deg', lon: 'lon_deg' });

/**
 * @typedef {Object} BirdTrack
 * @property {string} id  `<bird>/<year>`
 * @property {Float64Array} t  ms since Jan 1 of the track's year, ascending
 * @property {Float32Array} lat
 * @property {Float32Array} lon  continuous: never jumps by 360
 */

/**
 * @param {string} csv rows sorted by track, then date
 * @returns {BirdTrack[]}
 */
export function parseBirdTracks(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const names = header.split(',');
  const index = Object.fromEntries(Object.entries(Column).map(([field, column]) => [field, names.indexOf(column)]));
  const absent = Object.keys(Column).filter((field) => index[field] < 0);
  if (absent.length) throw new Error(`track CSV lacks ${absent.map((field) => Column[field]).join(', ')}`);

  const rowsById = new Map();
  for (const line of lines) {
    const cells = line.split(',');
    const id = cells[index.track];
    if (!rowsById.has(id)) rowsById.set(id, []);
    rowsById.get(id).push(cells);
  }
  return [...rowsById].map(([id, rows]) => buildTrack(id, rows, index));
}

function buildTrack(id, rows, index) {
  const n = rows.length;
  const track = { id, t: new Float64Array(n), lat: new Float32Array(n), lon: new Float32Array(n) };
  const yearStart = Date.UTC(Number(rows[0][index.date].slice(0, 4)), 0, 1);
  let prevLon = null;
  rows.forEach((cells, i) => {
    const raw = Number(cells[index.lon]);
    let lon = raw > LON_SPLIT ? raw - 360 : raw;
    if (prevLon !== null) lon += 360 * Math.round((prevLon - lon) / 360);
    track.t[i] = Date.parse(cells[index.date]) - yearStart;
    track.lat[i] = Number(cells[index.lat]);
    track.lon[i] = lon;
    prevLon = lon;
  });
  return track;
}

/** Index of the last fix with t <= time, or -1. */
export function lastIndexAtOrBefore(times, time) {
  let lo = 0;
  let hi = times.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Whether the track has begun and not yet ended at `time`. */
export function covers(track, time) {
  return time >= track.t[0] && time <= track.t[track.t.length - 1];
}

/** [lat, lon] at `time`, between fix `i` and the next. */
export function positionAt(track, i, time) {
  if (i >= track.t.length - 1) return [track.lat[i], track.lon[i]];
  const f = (time - track.t[i]) / (track.t[i + 1] - track.t[i]);
  return [track.lat[i] + f * (track.lat[i + 1] - track.lat[i]), track.lon[i] + f * (track.lon[i + 1] - track.lon[i])];
}

/**
 * @typedef {Object} Flock
 * @property {number} lat  mean latitude of the birds on the map
 * @property {number} lon  mean longitude
 * @property {number} speed  mean speed, km/h
 * @property {number} latPerHour  mean change of latitude, degrees an hour (positive northward)
 * @property {number} count  birds on the map
 * @property {number} flying  birds faster than FLYING_KMH
 */

/**
 * The birds on the map at `time` averaged together, or null when none is.
 *
 * @param {BirdTrack[]} tracks
 * @param {number} time
 * @returns {Flock | null}
 */
export function sampleFlock(tracks, time) {
  let count = 0;
  let flying = 0;
  let lat = 0;
  let lon = 0;
  let speed = 0;
  let latPerHour = 0;
  for (const track of tracks) {
    if (!covers(track, time)) continue;
    const i = lastIndexAtOrBefore(track.t, time);
    const [pLat, pLon] = positionAt(track, i, time);
    count++;
    lat += pLat;
    lon += pLon;
    if (i === track.t.length - 1) continue;
    const hours = (track.t[i + 1] - track.t[i]) / HOUR_MS;
    const kmh = distanceKm(track.lat[i], track.lon[i], track.lat[i + 1], track.lon[i + 1]) / hours;
    speed += kmh;
    latPerHour += (track.lat[i + 1] - track.lat[i]) / hours;
    if (kmh > FLYING_KMH) flying++;
  }
  if (!count) return null;
  return { lat: lat / count, lon: lon / count, speed: speed / count, latPerHour: latPerHour / count, count, flying };
}

/**
 * The flock once a day over the year, skipping days no bird is on the map; each sample also has its `time`.
 *
 * @param {BirdTrack[]} tracks
 * @returns {(Flock & { time: number })[]}
 */
export function dailyFlock(tracks) {
  const samples = [];
  for (let time = 0; time < YEAR_MS; time += DAY_MS) {
    const flock = sampleFlock(tracks, time);
    if (flock) samples.push({ ...flock, time });
  }
  return samples;
}
