// A year of lightning seen by the space station's lightning sensor (ISS LIS) over one side of the Earth, one CSV per
// track exported by notebooks/extreme_weather_album.ipynb (section 7) into data/extreme_weather/tracks/, and what the
// globe and the music read from it: its hemispheres, its values at any time, which flashes are struck (heard and
// flared), when the lead between the hemispheres changes hands, and where the lightning in sight is centred.

import { lastIndexAtOrBefore } from './bird-track.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// How long a flash stays in sight after it strikes (data days): where the lightning in sight is centred is the mean of
// these days' flashes.
export const VISIBLE_DAYS = 6;
// How many flashes are struck a day of data, from the track's quietest day to its busiest.
const STRIKES_PER_DAY = Object.freeze({ quiet: 0.4, busy: 2.4 });
// How many days the north's share must stay past one half for a change of lead to count.
const CROSSING_HOLD_DAYS = 10;

// The two halves of the Earth the flashes are split between. `key`: the CSV rows (and the season's per-day values) of
// it; `has(lat)`: whether a flash at `lat` is in it.
export const Hemisphere = Object.freeze({
  NORTH: Object.freeze({ key: 'north', has: (lat) => lat >= 0 }),
  SOUTH: Object.freeze({ key: 'south', has: (lat) => lat < 0 }),
});

// The CSV's kinds of row besides the hemispheres' (see the notebook): the noon sun's latitude, and the flashes.
const Kind = Object.freeze({ SUN: 'sun', FLASH: 'flash' });
// CSV column of each field; the unit is part of the column name.
const Column = Object.freeze({ time: 'time', kind: 'kind', lat: 'lat_deg', lon: 'lon_deg', level: 'level' });

/**
 * @typedef {Object} Flashes the flashes drawn and played, in time order
 * @property {Float64Array} t ms since the epoch
 * @property {Float32Array} lat
 * @property {Float32Array} lon
 * @property {Uint8Array} struck 1 for each flash the music strikes (see strike)
 * @property {Float64Array} heardAt the data time the music struck each, NaN until it has; the music sets it, the
 *   globe flares the flash then
 * @property {Float64Array} latSum running sum of their latitudes, so a stretch's mean takes two lookups
 */

/**
 * @typedef {Object} LightningSeason
 * @property {Float64Array} t the start of every day, and the midnight after the last (ms since the epoch)
 * @property {Float32Array} north how much lightning the northern hemisphere had in view around each day, 0 to 1
 * @property {Float32Array} south the same for the southern hemisphere
 * @property {Float32Array} sun the latitude the noon sun stands over each day
 * @property {Float32Array} amount both hemispheres' values added
 * @property {{ min: number, max: number }} amountRange
 * @property {Flashes} flashes
 * @property {{ time: number, north: boolean }[]} crossings see crossingsOf
 */

/**
 * @param {string} csv
 * @returns {LightningSeason}
 */
export function parseLightningSeason(csv) {
  const [header, ...lines] = csv.trim().split('\n');
  const names = header.split(',');
  const index = Object.fromEntries(Object.entries(Column).map(([field, column]) => [field, names.indexOf(column)]));
  const absent = Object.keys(Column).filter((field) => index[field] < 0);
  if (absent.length) throw new Error(`lightning CSV lacks ${absent.map((field) => Column[field]).join(', ')}`);

  const kinds = [Kind.SUN, Kind.FLASH, ...Object.values(Hemisphere).map((h) => h.key)];
  const rows = Object.fromEntries(kinds.map((kind) => [kind, []]));
  for (const line of lines) {
    const cells = line.split(',');
    const kind = cells[index.kind];
    if (!(kind in rows)) throw new Error(`lightning CSV has an unknown kind of row: ${kind}`);
    rows[kind].push(cells);
  }
  const sun = rows[Kind.SUN];
  const flashes = rows[Kind.FLASH];
  const season = {
    t: Float64Array.from(sun, (cells) => Date.parse(cells[index.time])),
    sun: Float32Array.from(sun, (cells) => Number(cells[index.lat])),
    flashes: {
      t: Float64Array.from(flashes, (cells) => Date.parse(cells[index.time])),
      lat: Float32Array.from(flashes, (cells) => Number(cells[index.lat])),
      lon: Float32Array.from(flashes, (cells) => Number(cells[index.lon])),
    },
  };
  for (const { key } of Object.values(Hemisphere)) season[key] = Float32Array.from(rows[key], (cells) => Number(cells[index.level]));
  return prepare(season);
}

// Adds what the rest of this file reads: the hemispheres' amount and its range, the flashes' running latitude sum,
// which are struck and when they were heard, and the changes of lead.
function prepare(season) {
  const north = season[Hemisphere.NORTH.key];
  const south = season[Hemisphere.SOUTH.key];
  season.amount = Float32Array.from(north, (n, i) => n + south[i]);
  season.amountRange = { min: Math.min(...season.amount), max: Math.max(...season.amount) };
  const { t, lat } = season.flashes;
  season.flashes.latSum = new Float64Array(t.length + 1);
  for (let i = 0; i < t.length; i++) season.flashes.latSum[i + 1] = season.flashes.latSum[i] + lat[i];
  season.flashes.struck = strike(season);
  season.flashes.heardAt = new Float64Array(t.length).fill(NaN);
  season.crossings = crossingsOf(season);
  return season;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** `values` (one of the season's per-day series) at `time`, interpolated between days and held at either end. */
export function seriesAt(season, values, time) {
  const n = season.t.length;
  const i = lastIndexAtOrBefore(season.t, time);
  if (i < 0) return values[0];
  if (i === n - 1) return values[n - 1];
  const f = (time - season.t[i]) / (season.t[i + 1] - season.t[i]);
  return values[i] + f * (values[i + 1] - values[i]);
}

/** Index of the first of the time-sorted `times` at or after `time` (times.length when none is). */
export function firstIndexAtOrAfter(times, time) {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// How full the lightning is at `time`, 0 to 1: its amount stretched so the season's quietest day is 0 and its busiest
// 1 (the tropics always have some lightning, so the raw amount never falls near 0).
function fullnessAt(season, time) {
  const { min, max } = season.amountRange;
  return clamp((seriesAt(season, season.amount, time) - min) / (max - min), 0, 1);
}

// Which flashes are struck: walking them in time order, each day of data earns a share of a strike, more the fuller
// the lightning (STRIKES_PER_DAY), and the first flash after a whole one is earned is struck. Earning stops at one, so
// a gap in the data never comes out as a burst.
function strike(season) {
  const { t } = season.flashes;
  const struck = new Uint8Array(t.length);
  let earned = 0;
  for (let i = 1; i < t.length; i++) {
    const perDay = STRIKES_PER_DAY.quiet + (STRIKES_PER_DAY.busy - STRIKES_PER_DAY.quiet) * fullnessAt(season, t[i]);
    earned = Math.min(1, earned + (perDay * (t[i] - t[i - 1])) / DAY_MS);
    if (earned < 1) continue;
    struck[i] = 1;
    earned -= 1;
  }
  return struck;
}

/** The north's share of the lightning at `time`, 0 (all south) to 1 (all north). */
function northShareAt(season, time) {
  const north = seriesAt(season, season[Hemisphere.NORTH.key], time);
  const south = seriesAt(season, season[Hemisphere.SOUTH.key], time);
  return north + south > 0 ? north / (north + south) : 0.5;
}

// The days the north's share crosses one half, each { time, north (true when the north takes the lead) }: the day it
// crosses and then stays on that side for at least CROSSING_HOLD_DAYS, so days of wavering around the half count once.
function crossingsOf(season) {
  const crossings = [];
  let northLeads = northShareAt(season, season.t[0]) > 0.5;
  for (let i = 1; i < season.t.length; i++) {
    const leads = northShareAt(season, season.t[i]) > 0.5;
    if (leads === northLeads) continue;
    const held = season.t.slice(i, i + CROSSING_HOLD_DAYS).every((time) => northShareAt(season, time) > 0.5 === leads);
    if (!held) continue;
    northLeads = leads;
    crossings.push({ time: season.t[i], north: leads });
  }
  return crossings;
}

/** The mean latitude of the flashes in sight at `time` (struck in the VISIBLE_DAYS before it), or null when none are. */
export function centreLat(season, time) {
  const { t, latSum } = season.flashes;
  const from = firstIndexAtOrAfter(t, time - VISIBLE_DAYS * DAY_MS);
  const to = firstIndexAtOrAfter(t, time);
  return to > from ? (latSum[to] - latSum[from]) / (to - from) : null;
}
