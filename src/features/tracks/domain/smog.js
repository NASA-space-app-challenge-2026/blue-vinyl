// The smog over a box of cells around a city, read the same way by the map and the music (see docs/albums/smog.md).
// Each cell's aerosol optical depth (AOD) becomes its pollution level (pollutionOf) and the fog it draws (fogOf); the haze is the fog over
// the city's own cell, the box's middle (user, 2026-11-15: the air right over the city, what the label's middle shows).
//
// Time runs at one fixed speed, the same in every song (user, 2026-11-15): HOURS_PER_BAR hours of the data a bar, so a
// song is as long as its hours. Times on a song are playback ms from its start; `clock` gives the real time at each.

import { lastIndexAtOrBefore } from './bird-track.js';
import { pollutionOf } from './pollution.js';

// 120 BPM in 4/4: a bar is two seconds of playback, a step a sixteenth note.
export const BAR_MS = 2000;
export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = 16;
export const STEP_MS = BAR_MS / STEPS_PER_BAR;
/** How many hours of the data play in a bar: 3 hours a second. */
export const HOURS_PER_BAR = 6;

/** A cell is clear below `from` and fully fogged from `full` (pollution levels: AOD about 0.27 and 2.8). */
export const FOG = Object.freeze({ from: 0.33, full: 0.85 });
/** The haze below which the air counts as clear: the muffling starts above it. */
export const CLEAR_BELOW = 0.3;
/**
 * The pollution level at which a cell's fog is CLEAR_BELOW (AOD about 0.67): the smoothstep in fogOf turned back,
 * x = 1/2 − sin(asin(1 − 2y) / 3).
 */
export const CLEAR_LEVEL = FOG.from + (FOG.full - FOG.from) * (0.5 - Math.sin(Math.asin(1 - 2 * CLEAR_BELOW) / 3));
/**
 * The fog's fade toward its box's edge, by distance from the box's middle on the ground, 1 where the box's nearer
 * sides are: whole up to `from` and gone by `to`, that distance pushed in and out by up to ±`ragged`/2 with the
 * billows (see globe/presentation/smog-layer.js). `to` + `ragged`/2 stays below 1, so nothing is left at the sides.
 */
export const FOG_EDGE = Object.freeze({ from: 0.45, to: 0.85, ragged: 0.25 });
// The pollution levels the map's textures hold, 0..LEVEL_BYTE.
const LEVEL_BYTE = 255;
const HOUR_MS = 60 * 60 * 1000;

const smooth = (x) => x * x * (3 - 2 * x);

/** How thick the fog over a cell at pollution `level` (pollutionOf) is, 0 to 1. */
export function fogOf(level) {
  return smooth(Math.min(1, Math.max(0, (level - FOG.from) / (FOG.full - FOG.from))));
}

/** The step of a song's grid nearest playback `time`: { index, bar, step, time }. */
export function gridAt(time) {
  const index = Math.round(time / STEP_MS);
  const bar = Math.floor(index / STEPS_PER_BAR);
  return { index, bar, step: index - bar * STEPS_PER_BAR, time: index * STEP_MS };
}

/**
 * From an hourly frame per row (each cell's AOD): each frame's pollution levels (0..255, for the map's textures),
 * how much fog each cell loses by the next hour (0..255 of a whole fog), and the pollution level and the haze (its fog)
 * over cell `city` each hour.
 *
 * @param {ArrayLike<number>[]} aod
 * @param {number} city the index of the city's cell in each frame
 */
export function smogOf(aod, city) {
  const levels = aod.map((frame) => Uint8Array.from(frame, (v) => Math.round(LEVEL_BYTE * pollutionOf(v))));
  const fogs = levels.map((frame) => Float32Array.from(frame, (v) => fogOf(v / LEVEL_BYTE)));
  const clearing = fogs.map((fog, i) => {
    const next = fogs[Math.min(i + 1, fogs.length - 1)];
    return Uint8Array.from(fog, (v, k) => Math.round(LEVEL_BYTE * Math.max(0, v - next[k])));
  });
  const level = Float32Array.from(levels, (frame) => frame[city] / LEVEL_BYTE);
  const haze = Float32Array.from(fogs, (fog) => fog[city]);
  return { levels, clearing, level, haze };
}

/** The value at playback `time` of `values`, one per hour at `times`, between its hours, held at its ends. */
export function hourlyAt(times, values, time) {
  const i = lastIndexAtOrBefore(times, time);
  if (i < 0) return values[0];
  if (i === times.length - 1) return values[i];
  return values[i] + ((time - times[i]) / (times[i + 1] - times[i])) * (values[i + 1] - values[i]);
}

/**
 * A song of the smog over a box around a city.
 *
 * @typedef {Object} SmogTrack
 * @property {Float64Array} t each hour's playback time (ms from the song's start), BAR_MS / HOURS_PER_BAR apart
 * @property {Float32Array} level the pollution level over the city's cell each hour (pollutionOf, 0 to 1)
 * @property {Float32Array} haze the fog over the city's cell each hour (0 clear to 1 all fog)
 * @property {{ levels: Uint8Array[], clearing: Uint8Array[], rows: number, cols: number, south: number, west: number,
 *   stepDeg: number }} field each hour's cells (row 0 the box's south edge, column 0 its west; see smogOf), and the
 *   box: its south-west cell's centre and the cells' spacing (°)
 * @property {Float64Array} clock each hour's real time (ms since the epoch)
 */

/**
 * @param {ArrayLike<number>[]} aod each hour's cells' aerosol optical depth, south to north, west to east
 * @param {number} startMs the first hour's real time (ms since the epoch)
 * @param {{ rows: number, cols: number, south: number, west: number, stepDeg: number }} box centred on the city's cell
 * @returns {SmogTrack}
 */
export function buildSmogTrack(aod, startMs, box) {
  const { levels, clearing, level, haze } = smogOf(aod, ((box.rows - 1) / 2) * box.cols + (box.cols - 1) / 2);
  return {
    t: Float64Array.from(aod, (_, i) => (i * BAR_MS) / HOURS_PER_BAR),
    level,
    haze,
    field: { levels, clearing, ...box },
    clock: Float64Array.from(aod, (_, i) => startMs + i * HOUR_MS),
  };
}

/**
 * Where the globe looks for `track`: the middle of its box (the city's cell), close enough that the fog it draws fills
 * the label, the label's edge where the fog is gone (FOG_EDGE.to of the way to the box's nearer sides on the ground;
 * user, 2026-11-15).
 */
export function boxFocus({ field: { rows, cols, south, west, stepDeg } }) {
  const lat = south + ((rows - 1) * stepDeg) / 2;
  const halfGround = (stepDeg / 2) * Math.min(rows, cols * Math.cos((lat * Math.PI) / 180));
  return { lat, lon: west + ((cols - 1) * stepDeg) / 2, arcDeg: FOG_EDGE.to * halfGround };
}

/** How long `track` plays (s): to its last hour. */
export function smogDurationSec(track) {
  return track.t.at(-1) / 1000;
}
