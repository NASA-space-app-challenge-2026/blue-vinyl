// Composer for the forest album: the ISS reads the forest under one orbit while the air thickens with CO₂.
//
//   melody (each track has its own wooden lead), from the colours of GEDI's map (SVS 4950) under the ISS:
//     canopy height (brown to white) -> pitch, and brightness: short forest sounds dark, tall forest open;
//     how thickly the forest stands around the ISS -> rhythm: a note a beat where it is thin, eighths, sixteenths
//     where it is dense (the track's tertiles, so every track has all three);
//     how uneven the canopy is -> how many notes sound together on each beat; tall forest -> a celesta an octave up.
//     Land under 5 m is quiet, and over the sea a wave washes in each bar instead.
//   the air: a choir holding an open D, more voices as the CO₂ rises (D minor, then its seventh and ninth), as loud
//     as the month's CO₂, so it swells as the years go and dips each northern summer when the forests draw it down;
//     a low cello under it.
//
// Slow 6/8 in D dorian: a step is a sixteenth (forest-track.js STEP_SEC), a bar 12 steps, a year two bars.

import { CC, Instrument } from '../instruments.js';
import { STEPS_PER_MONTH, STEP_SEC, TALL_FOREST_M, airAt } from '../../../tracks/domain/forest-track.js';

const STEPS_PER_BAR = 12;
// Steps per dotted-quarter beat; the canopy's spread is heard on each beat.
const STEPS_PER_BEAT = 6;
// Steps between the lead's notes, thin forest to dense: a dotted quarter, an eighth, a sixteenth.
const RHYTHM_EVERY = Object.freeze([6, 2, 1]);

const KEY_ROOT_PC = 2; // D
const SCALE = [0, 2, 3, 5, 7, 9, 10]; // dorian
const MELODY_LOW_NOTE = 50; // D3
const MELODY_TOP_M = 45;
const MELODY_DEGREES = 18; // two and a half octaves
// Below this the land plays nothing: grass, scrub, desert.
const QUIET_BELOW_M = 5;
const MELODY_VELOCITY = Object.freeze({ low: 55, high: 112 });
const DOWNBEAT_ACCENT = 8;
// Notes added below the melody on each beat, by how uneven the canopy is (the track's tertiles), in scale steps.
const SPREAD_CHORD = Object.freeze([[], [-2], [-2, -4]]);
const SPREAD_SOFTER = 15;
const CELESTA = Object.freeze({ octaveUp: 12, velocity: 70 });
// The lead's filter (CC 74): this dark over the shortest forest, opening to the sound font's own (64) at the tallest.
const BRIGHTNESS = Object.freeze({ dark: 18, open: 64 });

const SEA = Object.freeze({ note: 60, velocity: 42 });
// The air: an open D, then D minor, its seventh and its ninth as the CO₂ climbs past these shares of its range.
const AIR_VOICES = Object.freeze([
  { from: 0, midi: [50, 57] },
  { from: 0.25, midi: [53] },
  { from: 0.5, midi: [60] },
  { from: 0.75, midi: [64] },
]);
const AIR_VELOCITY = 64;
const AIR_EXPRESSION = Object.freeze({ thin: 45, thick: 127 });
const CELLO = Object.freeze({ midi: 38, velocity: { thin: 45, thick: 80 } });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degreeToMidi(degree) {
  const octave = Math.floor(degree / SCALE.length);
  return MELODY_LOW_NOTE + 12 * octave + SCALE[((degree % SCALE.length) + SCALE.length) % SCALE.length];
}

function lerp(range, t) {
  return range.thin + t * (range.thick - range.thin);
}

export class ForestComposer {
  // Every lead a track of the album takes, then the rest.
  instruments = Object.freeze([
    Instrument.MARIMBA,
    Instrument.HARP,
    Instrument.KOTO,
    Instrument.PIZZICATO,
    Instrument.CELESTA,
    Instrument.CHOIR,
    Instrument.SEASHORE,
    Instrument.CELLO,
  ]);

  stepSec = STEP_SEC;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * Fits the tiers of the canopy's spread and of the forest's density to a track's orbit: the edges between its
   * tertiles, over the steps the lead plays on.
   *
   * @param {import('../../../tracks/domain/forest-track.js').ForestSong & { lead: Object }} song
   */
  setSong(song) {
    this.song = song;
    const { orbit } = song;
    const tertiles = (values) => {
      const played = [...values].filter((v, i) => v >= 0 && orbit.height[i] >= QUIET_BELOW_M).sort((a, b) => a - b);
      return played.length ? [1, 2].map((k) => played[Math.floor((k * played.length) / 3)]) : [Infinity, Infinity];
    };
    this.spreadTiers = tertiles(orbit.heightSd);
    this.densityTiers = tertiles(orbit.forestShare);
  }

  reset() {}

  /** The mix stays in the middle. */
  spaceAt() {
    return null;
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ songSec: number, at: number }} now
   */
  playStep(music, { songSec, at }) {
    const { orbit, air, lead } = this.song;
    const step = Math.round(songSec / STEP_SEC);
    if (step < 0 || step >= orbit.lat.length) return;
    const inBar = step % STEPS_PER_BAR;
    const height = orbit.height[step];
    const { thickness } = airAt(air, step);

    if (step % STEPS_PER_MONTH === 0) {
      music.control(Instrument.CHOIR, CC.EXPRESSION, Math.round(lerp(AIR_EXPRESSION, thickness)), at);
    }
    if (inBar === 0) {
      for (const voice of AIR_VOICES) {
        if (thickness < voice.from) continue;
        for (const midi of voice.midi) music.note(Instrument.CHOIR, midi, AIR_VELOCITY, at, STEPS_PER_BAR);
      }
      music.note(Instrument.CELLO, CELLO.midi, lerp(CELLO.velocity, thickness), at, STEPS_PER_BAR);
      if (!(height >= 0)) music.note(Instrument.SEASHORE, SEA.note, SEA.velocity, at, STEPS_PER_BAR);
    }

    if (!(height >= QUIET_BELOW_M)) return;
    const every = RHYTHM_EVERY[this.densityTiers.filter((edge) => orbit.forestShare[step] >= edge).length];
    if (inBar % every) return;
    const share = clamp(height / MELODY_TOP_M, 0, 1);
    const degree = Math.round(share * (MELODY_DEGREES - 1));
    const note = degreeToMidi(degree);
    const velocity = MELODY_VELOCITY.low + share * (MELODY_VELOCITY.high - MELODY_VELOCITY.low) + (inBar === 0 ? DOWNBEAT_ACCENT : 0);
    music.control(lead, CC.BRIGHTNESS, Math.round(BRIGHTNESS.dark + share * (BRIGHTNESS.open - BRIGHTNESS.dark)), at);
    music.note(lead, note, clamp(velocity, 1, 127), at, every);
    if (inBar % STEPS_PER_BEAT === 0) {
      const tier = this.spreadTiers.filter((edge) => orbit.heightSd[step] >= edge).length;
      for (const below of SPREAD_CHORD[tier]) {
        music.note(lead, degreeToMidi(degree + below), clamp(velocity - SPREAD_SOFTER, 1, 127), at, STEPS_PER_BEAT);
      }
    }
    if (height >= TALL_FOREST_M) music.note(Instrument.CELESTA, note + CELESTA.octaveUp, CELESTA.velocity, at, every);
  }
}

