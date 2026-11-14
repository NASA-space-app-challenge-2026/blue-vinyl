// Composer for the arctic bird album: the flock (the birds on the map averaged together) plays a tune.
//
//   melody (each species has its own lead): the flock's mean latitude -> pitch, its mean speed -> how dense the notes
//     are and how hard they play, the way it heads (north or south) -> whether the run climbs or falls
//   accompaniment: a chord that follows the melody on pad and cello, with violin and viola as loud as the share of
//     birds flying
//
// The album's tracks are laid over one year; the music plays a week of it a second.

import { CC, Instrument } from '../instruments.js';

const BPM = 96;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
// The home chord comes back at the start of every phrase of this many bars, when it holds the melody's note.
const PHRASE_BARS = 4;
export const STEP_SEC = 60 / BPM / STEPS_PER_BEAT;

const KEY_ROOT_PC = 2; // D
const SCALE = [0, 2, 4, 7, 9]; // major pentatonic
const MELODY_LOW_NOTE = 60 + KEY_ROOT_PC;
const MELODY_DEGREES = 13; // two and a half octaves
// While the flock rests, the melody turns around its note with this motif of scale steps.
const RESTING_MOTIF = Object.freeze([0, 1, 0, -1]);
// The piccolo doubles the melody this far up and this much softer.
const PICCOLO = Object.freeze({ octaveUp: 12, softer: 20 });

const BASS_LOW_NOTE = 36;
const PAD_LOW_NOTE = 48;
const PAD_VELOCITY = 60;
const VIOLA_LOW_NOTE = 60;
const VIOLIN_LOW_NOTE = 72;
const STRINGS_VELOCITY = 70;

// Chords as pitch classes above the key's root, root first. Every note of the scale is in at least one.
const Chord = Object.freeze({
  I: { tones: [0, 4, 7] },
  VI: { tones: [9, 0, 4] },
  IV: { tones: [5, 9, 0] },
  V: { tones: [7, 11, 2] },
});
const CHORDS = Object.freeze(Object.values(Chord));
const HOME_CHORD = Chord.I;

// Ordered slowest to fastest; the speeds between tiers are measured from each track's flock (see setSong), so every
// track uses all of them. `melodyEvery`/`bassEvery`: steps between notes. `run`: how many scale steps the melody runs
// up or down from its note while the flock heads somewhere (0: it rests on the motif).
const SpeedTier = Object.freeze([
  { melodyEvery: 16, bassEvery: 16, run: 0, velocity: 50, piccolo: false },
  { melodyEvery: 8, bassEvery: 8, run: 2, velocity: 65, piccolo: false },
  { melodyEvery: 4, bassEvery: 4, run: 3, velocity: 80, piccolo: false },
  { melodyEvery: 2, bassEvery: 2, run: 4, velocity: 95, piccolo: true },
  { melodyEvery: 1, bassEvery: 2, run: 5, velocity: 110, piccolo: true },
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Pitch class of a chord tone or scale step given above the key's root. */
function pitchClass(aboveRoot) {
  return (KEY_ROOT_PC + aboveRoot) % 12;
}

function degreeToMidi(degree) {
  const octave = Math.floor(degree / SCALE.length);
  return MELODY_LOW_NOTE + 12 * octave + SCALE[degree % SCALE.length];
}

/**
 * @typedef {Object} Music what a composer plays through (see data/sound-engine.js)
 * @property {(instrument: Object, midi: number, velocity: number, at: number, steps: number) => void} note
 * @property {(instrument: Object, midi: number, velocity: number, at: number) => void} hold  a note held until released
 * @property {(instrument: Object, midi: number, at: number) => void} release
 * @property {(instrument: Object, semitones: number, at: number) => void} bend  the instrument's pitch wheel
 * @property {(instrument: Object, cc: number, value: number, at: number) => void} control
 * @property {(instrument: Object, sound: { program: number, volume: number }, at: number) => void} program  another
 *   sound of the same kind (melodic or drums) on the instrument's channel
 * @property {(patch: Object, midi: number, velocity: number, at: number, steps: number, shape: Object) => void} synthNote
 *   a note of a Patch on the analog synth (see data/analog-synth.js)
 * @property {(lead: Object, sound: Object, at: number) => { move: Function, close: Function }} voice  a held voice of a
 *   Lead on the analog synth, moved and closed by the composer
 * @property {(effect: Object, value: number, at: number) => void} effect  an Effect on the whole mix (see
 *   domain/effects.js)
 */

export class FlockComposer {
  // Every lead a track of the album takes, then the accompaniment.
  instruments = Object.freeze([
    Instrument.FLUTE,
    Instrument.OBOE,
    Instrument.FRENCH_HORN,
    Instrument.OCARINA,
    Instrument.PICCOLO,
    Instrument.PAD,
    Instrument.CELLO,
    Instrument.VIOLA,
    Instrument.VIOLIN,
  ]);

  stepSec = STEP_SEC;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * Fits the melody's range and the speed tiers to a track's flock, sampled once a day (its `path`).
   *
   * @param {{ path: import('../../../tracks/domain/bird-track.js').Flock[], lead: Object }} song `lead`: the
   *   Instrument that plays the melody
   */
  setSong({ path: samples, lead }) {
    this.lead = lead;
    const lats = samples.map((s) => s.lat);
    this.lat = { min: Math.min(...lats), max: Math.max(...lats) };
    const speeds = samples.map((s) => s.speed).sort((a, b) => a - b);
    this.tierSpeeds = SpeedTier.slice(1).map((_, i) => speeds[Math.floor(((i + 1) * speeds.length) / SpeedTier.length)]);
    this.mostFlying = Math.max(1, ...samples.map((s) => s.flying));
  }

  /** Back to the opening state, as the music starts. */
  reset() {
    this.melodyCount = 0;
    this.chord = HOME_CHORD;
  }

  /**
   * @param {Music} music
   * @param {{ sample: import('../../../tracks/domain/bird-track.js').Flock, step: number, bar: number, at: number }} now
   */
  playStep(music, { sample: flock, step, bar, at }) {
    const tier = SpeedTier[this.tierSpeeds.filter((speed) => flock.speed >= speed).length];
    if (step % tier.melodyEvery === 0) {
      const note = this.playMelody(music, flock, tier, at);
      if (step === 0) this.playChord(music, note, flock, bar, at);
    }
    if (step % tier.bassEvery === 0) {
      music.note(Instrument.CELLO, BASS_LOW_NOTE + pitchClass(this.chord.tones[0]), 60 + tier.velocity / 4, at, tier.bassEvery);
    }
  }

  // Plays the melody's note for this step and returns it.
  playMelody(music, flock, tier, at) {
    const { min, max } = this.lat;
    const target = Math.round((max > min ? (flock.lat - min) / (max - min) : 0.5) * (MELODY_DEGREES - 1));
    const n = this.melodyCount++;
    const offset = tier.run ? Math.sign(flock.latPerHour) * (n % tier.run) : RESTING_MOTIF[n % RESTING_MOTIF.length];
    const note = degreeToMidi(clamp(target + offset, 0, MELODY_DEGREES - 1));
    music.note(this.lead, note, tier.velocity, at, tier.melodyEvery);
    if (tier.piccolo) {
      music.note(Instrument.PICCOLO, note + PICCOLO.octaveUp, tier.velocity - PICCOLO.softer, at, tier.melodyEvery);
    }
    return note;
  }

  // At a bar's start: a chord holding the melody's note (the home chord at a phrase start when it does, otherwise the
  // next one that does), held for the bar on pad, and on viola and violin as loud as the share of birds flying.
  playChord(music, melodyNote, flock, bar, at) {
    const fits = CHORDS.filter((chord) => chord.tones.some((tone) => pitchClass(tone) === melodyNote % 12));
    const phraseStart = bar % PHRASE_BARS === 0;
    this.chord = phraseStart && fits.includes(HOME_CHORD) ? HOME_CHORD : fits[(fits.indexOf(this.chord) + 1) % fits.length];
    const [root, third, fifth] = this.chord.tones.map(pitchClass);
    for (const pc of [root, third, fifth]) music.note(Instrument.PAD, PAD_LOW_NOTE + pc, PAD_VELOCITY, at, STEPS_PER_BAR);
    const expression = Math.round((127 * flock.flying) / this.mostFlying);
    if (!expression) return;
    for (const inst of [Instrument.VIOLA, Instrument.VIOLIN]) music.control(inst, CC.EXPRESSION, expression, at);
    music.note(Instrument.VIOLA, VIOLA_LOW_NOTE + root, STRINGS_VELOCITY, at, STEPS_PER_BAR);
    music.note(Instrument.VIOLIN, VIOLIN_LOW_NOTE + third, STRINGS_VELOCITY, at, STEPS_PER_BAR);
    music.note(Instrument.VIOLIN, VIOLIN_LOW_NOTE + fifth, STRINGS_VELOCITY, at, STEPS_PER_BAR);
  }
}
