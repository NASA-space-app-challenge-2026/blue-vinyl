// Composer for the forest album, made to be followed by ear alone: the Earth turns once under the noon line, and three
// voices play the forest the line crosses — instruments with clear pitch height, not percussion toys.
//
//   voices: north (23–52° N) on flute; tropics on the track's lead (harp); south on
//     pizzicato. Height sets pitch and loudness; density sets rhythm.
//   the air: GEDI drew its map from April 2019 to March 2023, and those 48 months of global CO₂ go by over the turn.
//     The pad fills in and swells as the air thickens (dipping each northern summer), and a low cello joins it in
//     the thicker half.
//   landmarks: the sea is a wave; a bell marks each continent; a woodblock ticks every 30°.
//   legend (the first track): ten bars that explain the mappings while the line is already moving.
//
// D dorian in 3/4 at 120 beats a minute: a step is a sixteenth (noon-line.js STEP_SEC) and a degree of longitude.

import { Instrument } from '../instruments.js';
import { Band, LEGEND_STEPS, LINE_STEPS, REGIONS, STEP_SEC, airAt, bandAt, lineLonAt } from '../../../tracks/domain/noon-line.js';

const STEPS_PER_BAR = 12;
const SCALE = [0, 2, 3, 5, 7, 9, 10]; // D dorian, above D

const VOICES = Object.freeze({
  [Band.NORTH]: { instrument: Instrument.FLUTE, lowNote: 74 }, // D5
  [Band.TROPICS]: { instrument: null, lowNote: 62 }, // D4 — track lead
  [Band.SOUTH]: { instrument: Instrument.PIZZICATO, lowNote: 50 }, // D3
});
const HEIGHT_RANGE_M = Object.freeze({ low: 4, high: 24 });
const HEIGHT_DEGREES = 10;
const VELOCITY = Object.freeze({ low: 50, high: 115 });
const RHYTHM = Object.freeze([
  { from: 0, every: 4 },
  { from: 0.25, every: 2 },
  { from: 0.55, every: 1 },
]);

const SEA = Object.freeze({ note: 60, velocity: 45 });
const TICK = Object.freeze({ everyDeg: 30, note: 76, velocity: 50, loudAtStart: 80 });
const BELL_NOTES = Object.freeze([62, 69, 65, 72, 67]);
const BELL_VELOCITY = 85;
// The air: an open fifth on D (D3, A3), adding F3, C4 and E4 as the month's CO₂ passes a quarter, half and three
// quarters of the window's range; louder the thicker. A cello D2 under the thicker half.
const AIR = Object.freeze({
  pad: Object.freeze([[50, 0], [57, 0], [53, 0.25], [60, 0.5], [64, 0.75]]),
  padVelocity: Object.freeze([30, 88]),
  cello: 38,
  celloFrom: 0.5,
  celloVelocity: Object.freeze([45, 80]),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function noteAt(lowNote, degree) {
  return lowNote + 12 * Math.floor(degree / SCALE.length) + SCALE[degree % SCALE.length];
}

/** How loud and how high a voice plays forest `heightM` tall: 0 at the low end of the range to 1 at the top. */
function heightShare(heightM) {
  return clamp((heightM - HEIGHT_RANGE_M.low) / (HEIGHT_RANGE_M.high - HEIGHT_RANGE_M.low), 0, 1);
}

/**
 * The forest notes struck at a whole step of the line: one per band whose forest sounds and whose rhythm falls on this
 * step. The globe shows each where it is heard.
 *
 * @param {import('../../../tracks/domain/noon-line.js').NoonLine} line
 * @param {number} lineStep
 * @returns {{ band: string, height: number, density: number, every: number, share: number }[]}
 */
export function forestNotesAt(line, lineStep) {
  const notes = [];
  if (lineStep < 0 || lineStep >= LINE_STEPS) return notes;
  for (const band of Object.keys(VOICES)) {
    const forest = bandAt(line, band, lineStep);
    if (!forest) continue;
    const every = RHYTHM.findLast((r) => forest.density >= r.from).every;
    if (lineStep % every) continue;
    notes.push({ band, ...forest, every, share: heightShare(forest.height) });
  }
  return notes;
}

const LAND_BELLS = new Map(REGIONS.filter((r) => r.land).map((region, i) => [region, BELL_NOTES[i % BELL_NOTES.length]]));
const REGION_STARTS = new Map(REGIONS.map((region) => [Math.round(lineLonAt(0) - region.fromLon), region]));

export class NoonComposer {
  instruments = Object.freeze([
    Instrument.HARP,
    Instrument.PIZZICATO,
    Instrument.FLUTE,
    Instrument.CELLO,
    Instrument.SEASHORE,
    Instrument.TUBULAR_BELLS,
    Instrument.WOODBLOCK,
    Instrument.PAD,
  ]);

  stepSec = STEP_SEC;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {{ line: import('../../../tracks/domain/noon-line.js').NoonLine,
   *   air: import('../../../tracks/domain/noon-line.js').AirMonths, lead: Object,
   *   legend: boolean }} song
   */
  setSong(song) {
    this.song = song;
    this.voices = { ...VOICES, [Band.TROPICS]: { ...VOICES[Band.TROPICS], instrument: song.lead } };
  }

  reset() {}

  spaceAt() {
    return null;
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ songSec: number, at: number }} now
   */
  playStep(music, { songSec, at }) {
    const step = Math.round(songSec / STEP_SEC);
    if (step < 0 || step >= LINE_STEPS) return;
    if (step % STEPS_PER_BAR === 0) this.playAir(music, step, at);
    // The noon line and the globe move from step 0; the legend (if any) only explains on top.
    if (this.song.legend && step < LEGEND_STEPS) this.playLegend(music, step, at);
    this.playLine(music, step, at);
  }

  playAir(music, step, at) {
    const { thickness } = airAt(this.song.air, step);
    const lerp = ([low, high]) => low + thickness * (high - low);
    for (const [midi, from] of AIR.pad) {
      if (thickness >= from) music.note(Instrument.PAD, midi, lerp(AIR.padVelocity), at, STEPS_PER_BAR);
    }
    if (thickness >= AIR.celloFrom) music.note(Instrument.CELLO, AIR.cello, lerp(AIR.celloVelocity), at, STEPS_PER_BAR);
  }

  playLine(music, lineStep, at) {
    const region = REGION_STARTS.get(lineStep);
    if (region && LAND_BELLS.has(region)) music.note(Instrument.TUBULAR_BELLS, LAND_BELLS.get(region), BELL_VELOCITY, at, STEPS_PER_BAR);
    if (lineStep % TICK.everyDeg === 0) {
      music.note(Instrument.WOODBLOCK, TICK.note, lineStep === 0 ? TICK.loudAtStart : TICK.velocity, at, 1);
    }
    for (const note of forestNotesAt(this.song.line, lineStep)) {
      this.playVoice(music, this.voices[note.band], note.height, at, note.every);
    }
    const sounding = Object.keys(this.voices).some((band) => bandAt(this.song.line, band, lineStep));
    if (!sounding && lineStep % STEPS_PER_BAR === 0) music.note(Instrument.SEASHORE, SEA.note, SEA.velocity, at, STEPS_PER_BAR);
  }

  playVoice(music, voice, heightM, at, steps) {
    const share = heightShare(heightM);
    const degree = Math.round(share * HEIGHT_DEGREES);
    const velocity = VELOCITY.low + share * (VELOCITY.high - VELOCITY.low);
    music.note(voice.instrument, noteAt(voice.lowNote, degree), velocity, at, steps);
  }

  playLegend(music, step, at) {
    const lead = this.voices[Band.TROPICS];
    if (step < 30) {
      if (step % 2 === 0) this.playVoice(music, lead, HEIGHT_RANGE_M.low + ((HEIGHT_RANGE_M.high - HEIGHT_RANGE_M.low) * step) / 28, at, 2);
    } else if (step < 60) {
      const every = step < 42 ? 4 : step < 50 ? 2 : 1;
      if ((step - 30) % every === 0) this.playVoice(music, lead, 14, at, every);
    } else if (step < 90) {
      const voice = step < 70 ? this.voices[Band.NORTH] : step < 80 ? lead : this.voices[Band.SOUTH];
      if (step % 2 === 0) this.playVoice(music, voice, 6 + (step % 10), at, 2);
    } else if (step === 90) {
      music.note(Instrument.SEASHORE, SEA.note, SEA.velocity + 15, at, STEPS_PER_BAR);
    } else if (step === 100) {
      music.note(Instrument.TUBULAR_BELLS, BELL_NOTES[0], BELL_VELOCITY, at, STEPS_PER_BAR);
    } else if (step === 110) {
      music.note(Instrument.WOODBLOCK, TICK.note, TICK.loudAtStart, at, 1);
    }
  }
}
