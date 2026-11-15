// The smog over a plain, read the same way by the map and the music (see docs/albums/smog.md). Each cell's PM2.5
// becomes its pollution level (pollutionOf) and the fog it draws (fogOf); the plain's haze is the mean fog over its
// cells. The plain clears when its haze falls below CLEAR_BELOW and is smothered when it rises above SMOTHERED_ABOVE; in
// between it stays as it was.
//
// A song's hours play at an uneven pace (paceOf): the hours in which the air turns are drawn out and the days it sits
// still pass quickly, and each turn lands on a downbeat. Times on a song are playback ms from its start; `clock` gives
// the real time at each.

import { lastIndexAtOrBefore } from './bird-track.js';
import { pollutionOf } from './pollution.js';

// 120 BPM in 4/4: a bar is two seconds of playback, a step a sixteenth note.
export const BAR_MS = 2000;
export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = 16;
export const STEP_MS = BAR_MS / STEPS_PER_BAR;
/** About how long a song plays (ms); its bars round it (see paceOf). */
export const SONG_MS = 54000;

/** A cell is clear below `from` and fully fogged from `full` (pollution levels: about 40 and 330 µg/m³). */
export const FOG = Object.freeze({ from: 0.33, full: 0.85 });
// The plain's haze at which it counts as cleared and as smothered.
const CLEAR_BELOW = 0.3;
const SMOTHERED_ABOVE = 0.5;
// The pace: the hours leading into a turn play for a set number of bars (`clear`: the front sweeping the smog out,
// `smothered`: the smog rolling in), and the clear air after the last clearing for OUTRO_BARS; the rest of the song
// shares out what is left of SONG_MS. Within each stretch an hour plays for 1 + SLOW · |change in haze| / CHANGE of a
// unit, so the air changing fast is drawn out.
const LEAD = Object.freeze({
  clear: Object.freeze({ hours: 12, bars: 8 }),
  smothered: Object.freeze({ hours: 6, bars: 3 }),
});
const OUTRO_BARS = 4;
const SLOW = 8;
const CHANGE = 0.05;
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
 * From an hourly frame per row (each cell's PM2.5): each frame's pollution levels (0..255, for the map's textures),
 * how much fog each cell loses by the next hour (0..255 of a whole fog), the plain's haze each hour, and how much fog
 * the plain loses each hour on average over its cells (0 to 1).
 *
 * @param {ArrayLike<number>[]} pm25
 */
export function smogOf(pm25) {
  const levels = pm25.map((frame) => Uint8Array.from(frame, (v) => Math.round(LEVEL_BYTE * pollutionOf(v))));
  const fogs = levels.map((frame) => Float32Array.from(frame, (v) => fogOf(v / LEVEL_BYTE)));
  const clearing = fogs.map((fog, i) => {
    const next = fogs[Math.min(i + 1, fogs.length - 1)];
    return Uint8Array.from(fog, (v, k) => Math.round(LEVEL_BYTE * Math.max(0, v - next[k])));
  });
  const haze = Float32Array.from(fogs, (fog) => fog.reduce((sum, v) => sum + v, 0) / fog.length);
  const cleared = Float32Array.from(clearing, (frame) => frame.reduce((sum, v) => sum + v, 0) / frame.length / LEVEL_BYTE);
  return { levels, clearing, haze, cleared };
}

/** When the plain turns, each { hour (fractional, as the haze crosses), clear }, from its haze each hour. */
export function turnsOf(haze) {
  let clear = haze[0] < (CLEAR_BELOW + SMOTHERED_ABOVE) / 2;
  const turns = [];
  for (let i = 1; i < haze.length; i++) {
    const edge = clear ? SMOTHERED_ABOVE : CLEAR_BELOW;
    if (clear ? haze[i] <= edge : haze[i] >= edge) continue;
    clear = !clear;
    turns.push({ hour: i - 1 + (edge - haze[i - 1]) / (haze[i] - haze[i - 1]), clear });
  }
  return turns;
}

/** Each hour's playback time (ms), from the haze each hour and the turns: each turn and the song's end on a downbeat. */
export function paceOf(haze, turns) {
  const n = haze.length;
  const weight = Array.from({ length: n - 1 }, (_, i) => 1 + (SLOW * Math.abs(haze[i + 1] - haze[i])) / CHANGE);
  const cumulative = [0];
  for (const w of weight) cumulative.push(cumulative.at(-1) + w);
  // The weight up to fractional hour h.
  const upTo = (h) => {
    const i = Math.min(n - 2, Math.floor(h));
    return cumulative[i] + (h - i) * weight[i];
  };
  // The song's stretches, each { from, to } in hours, and `bars` when its length is set.
  const stretches = [];
  let from = 0;
  for (const turn of turns) {
    const lead = turn.clear ? LEAD.clear : LEAD.smothered;
    const leadFrom = Math.max(from, turn.hour - lead.hours);
    if (leadFrom > from) stretches.push({ from, to: leadFrom });
    stretches.push({ from: leadFrom, to: turn.hour, bars: lead.bars });
    from = turn.hour;
  }
  stretches.push({ from, to: n - 1, bars: turns.at(-1)?.clear ? OUTRO_BARS : undefined });
  const span = (stretch) => upTo(stretch.to) - upTo(stretch.from);
  const free = stretches.filter((stretch) => stretch.bars === undefined);
  const setMs = stretches.reduce((sum, stretch) => sum + (stretch.bars ?? 0) * BAR_MS, 0);
  const unit = Math.max(0, SONG_MS - setMs) / free.reduce((sum, stretch) => sum + span(stretch), 0);
  const times = new Float64Array(n);
  let start = 0;
  for (const stretch of stretches) {
    const ms = (stretch.bars ?? Math.max(1, Math.round((unit * span(stretch)) / BAR_MS))) * BAR_MS;
    for (let i = Math.ceil(stretch.from); i <= Math.floor(stretch.to); i++) {
      times[i] = start + (ms * (upTo(i) - upTo(stretch.from))) / span(stretch);
    }
    start += ms;
  }
  return times;
}

/** The playback time each turn lands on (a downbeat), given the hours' playback times: each { at, clear }. */
export function turnTimes(times, turns) {
  return turns.map((turn) => {
    const i = Math.floor(turn.hour);
    const at = times[i] + (turn.hour - i) * (times[i + 1] - times[i]);
    return { at: Math.round(at / BAR_MS) * BAR_MS, clear: turn.clear };
  });
}

/** The value at playback `time` of `values`, one per hour at `times`, between its hours, held at its ends. */
export function hourlyAt(times, values, time) {
  const i = lastIndexAtOrBefore(times, time);
  if (i < 0) return values[0];
  if (i === times.length - 1) return values[i];
  return values[i] + ((time - times[i]) / (times[i + 1] - times[i])) * (values[i + 1] - values[i]);
}

/**
 * A song of the smog over a plain.
 *
 * @typedef {Object} SmogTrack
 * @property {Float64Array} t each hour's playback time (ms from the song's start)
 * @property {Float32Array} haze the plain's haze each hour (0 clear to 1 all fog)
 * @property {Float32Array} cleared how much fog the plain loses each hour, on average over its cells (0 to 1)
 * @property {{ at: number, clear: boolean }[]} turns when the plain clears or is smothered (playback ms, on a downbeat)
 * @property {{ levels: Uint8Array[], clearing: Uint8Array[], rows: number, cols: number, south: number, west: number,
 *   stepDeg: number }} field each hour's cells (row 0 the box's south edge, column 0 its west; see smogOf), and the
 *   box: its south-west cell's centre and the cells' spacing (°)
 * @property {Float64Array} clock each hour's real time (ms since the epoch)
 */

/**
 * @param {ArrayLike<number>[]} pm25 each hour's cells' PM2.5 (µg/m³), south to north, west to east
 * @param {number} startMs the first hour's real time (ms since the epoch)
 * @param {{ rows: number, cols: number, south: number, west: number, stepDeg: number }} box
 * @returns {SmogTrack}
 */
export function buildSmogTrack(pm25, startMs, box) {
  const { levels, clearing, haze, cleared } = smogOf(pm25);
  const hourTurns = turnsOf(haze);
  const t = paceOf(haze, hourTurns);
  return {
    t,
    haze,
    cleared,
    turns: turnTimes(t, hourTurns),
    field: { levels, clearing, ...box },
    clock: Float64Array.from(t, (_, i) => startMs + i * HOUR_MS),
  };
}

// The globe looks at the box's middle from close enough that the label's edge is this many degrees of arc from it:
// nell-v2's globe drawn eleven times the label's size, its edge asin(1/11) of arc from the middle.
const PLAIN_ARC_DEG = (Math.asin(1 / 11) * 180) / Math.PI;

/** Where the globe looks for `track`: the middle of its box, the label's edge PLAIN_ARC_DEG of arc from it. */
export function plainFocus({ field: { rows, cols, south, west, stepDeg } }) {
  return { lat: south + ((rows - 1) * stepDeg) / 2, lon: west + ((cols - 1) * stepDeg) / 2, arcDeg: PLAIN_ARC_DEG };
}

/** How long `track` plays (s): to its last hour. */
export function smogDurationSec(track) {
  return track.t.at(-1) / 1000;
}
