// Composer for the arctic bird album: one data day per step, a folded year per track.
//
//   where the flock is (latitude)      -> the lead's pitch, on one scale shared by the album
//   how far it flies that day (km)     -> how often the lead plays and how hard, on thresholds shared by the album
//   which way it heads (north / south) -> the shape of the lead's phrase, rising or falling
//   how far it has flown since Jan 1   -> how many string voices sound and how loud, against the album's farthest
//
// Accompaniment: a cello root and a soft pad hold a chord that contains the lead's note at each bar start.

import { CC, Instrument } from '../instruments.js';
import { latPerDay } from '../../../tracks/domain/flock-year.js';

const BPM = 105;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
// One step (a sixteenth note) plays one day, so a year of 365 days lasts about 52 s.
export const DAY_SEC = 60 / BPM / STEPS_PER_BEAT;

const KEY_ROOT_PC = 2; // D
const SCALE = [0, 2, 4, 7, 9]; // major pentatonic
// The lead's range in scale degrees from its instrument's lowNote: about two and a half octaves.
const MELODY_DEGREES = 12;
// Most scale degrees the lead moves from one note to the next on its way to where the flock is, so a fast change
// sounds as a run rather than a leap.
const MAX_STEP_DEGREES = 2;

// Ordered from resting to flying hardest. A day plays the last pace whose `minKm` it reaches. The thresholds are
// the same for every track, so a species that flies farther sounds busier. `every`: steps between lead notes.
const Pace = Object.freeze([
  { minKm: 0, every: 16, velocity: 54 },
  { minKm: 10, every: 8, velocity: 66 },
  { minKm: 40, every: 4, velocity: 80 },
  { minKm: 100, every: 2, velocity: 94 },
  { minKm: 200, every: 1, velocity: 108 },
]);

// The lead's phrase, as degree offsets from where the flock is, cycled note by note.
const Heading = Object.freeze({
  NORTH: { motif: [0, 1, 2, 1] },
  SOUTH: { motif: [0, -1, -2, -1] },
  STILL: { motif: [0, 0, 1, 0] },
});
// Latitude change (degrees a day, over HEADING_WINDOW_DAYS each side) beyond which the flock heads north or south.
const HEADING_DEG_PER_DAY = 0.3;
const HEADING_WINDOW_DAYS = 3;

// Chords as pitch classes above the key's root; `tones` are root, third, fifth. Every scale tone is in at least one.
const Chord = Object.freeze({
  I: { tones: [0, 4, 7] },
  VI: { tones: [9, 0, 4] },
  IV: { tones: [5, 9, 0] },
  V: { tones: [7, 11, 2] },
});
const CHORDS = Object.freeze(Object.values(Chord));

const STRING_VOICES = 6;
const STRING_EXPRESSION = Object.freeze({ min: 40, max: 127 });
const STRING_VELOCITY = 64;
const PAD_VELOCITY = 44;
const BASS_VELOCITY = 58;

/** The first note at or above `midi` whose pitch class is the key's root. */
function rootFrom(midi) {
  return midi + ((((KEY_ROOT_PC - midi) % 12) + 12) % 12);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @typedef {{ instrument: Object, midi: number, velocity: number, steps: number }} NoteEvent
 * @typedef {{ instrument: Object, cc: number, value: number }} ControlEvent
 * @typedef {{ notes: NoteEvent[], controls: ControlEvent[], pulse: number | null }} StepEvents
 *   `pulse`: how strongly (0..1) the visuals should mark this step, when the lead plays on it.
 */

export class MigrationComposer {
  instruments = Object.freeze([
    Instrument.FLUTE,
    Instrument.OBOE,
    Instrument.FRENCH_HORN,
    Instrument.CLARINET,
    Instrument.STRINGS,
    Instrument.CELLO,
    Instrument.WARM_PAD,
  ]);

  /**
   * Fits the shared scales to every track of the album, so the same latitude or distance sounds the same in all.
   *
   * @param {import('../../../tracks/domain/flock-year.js').FlockDay[][]} years
   */
  setAlbum(years) {
    const lats = years.flat().map((d) => d.lat);
    this.lat = { min: Math.min(...lats), max: Math.max(...lats) };
    this.farthestKm = Math.max(...years.map((year) => year[year.length - 1].kmSoFar));
  }

  /**
   * @param {import('../../../tracks/domain/flock-year.js').FlockDay[]} year
   * @param {Object} lead one of Instrument
   * @param {number} day the day playing starts from
   */
  setTrack(year, lead, day) {
    this.year = year;
    this.lead = lead;
    this.noteCount = 0;
    this.degree = this.targetDegree(year[Math.min(day, year.length - 1)]);
    this.chord = Chord.I;
  }

  /**
   * @param {number} day index into the track's year
   * @returns {StepEvents}
   */
  step(day) {
    const flock = this.year[day];
    const pace = Pace.findLast((p) => flock.kmPerDay >= p.minKm);
    const events = { notes: [], controls: [], pulse: null };
    if (day % pace.every === 0) {
      const midi = this.playLead(flock, day, pace, events);
      if (day % STEPS_PER_BAR === 0) this.playBar(midi, flock, events);
    }
    return events;
  }

  targetDegree(flock) {
    const { min, max } = this.lat;
    const f = max > min ? (flock.lat - min) / (max - min) : 0.5;
    return Math.round(f * (MELODY_DEGREES - 1));
  }

  degreeToMidi(degree) {
    const octave = Math.floor(degree / SCALE.length);
    return rootFrom(this.lead.lowNote) + 12 * octave + SCALE[degree % SCALE.length];
  }

  heading(day) {
    const rate = latPerDay(this.year, day, HEADING_WINDOW_DAYS);
    if (rate > HEADING_DEG_PER_DAY) return Heading.NORTH;
    if (rate < -HEADING_DEG_PER_DAY) return Heading.SOUTH;
    return Heading.STILL;
  }

  // Plays the lead's note for `day` and returns it.
  playLead(flock, day, pace, events) {
    const target = this.targetDegree(flock);
    this.degree += clamp(target - this.degree, -MAX_STEP_DEGREES, MAX_STEP_DEGREES);
    const { motif } = this.heading(day);
    const offset = motif[this.noteCount++ % motif.length];
    const midi = this.degreeToMidi(clamp(this.degree + offset, 0, MELODY_DEGREES - 1));
    events.notes.push({ instrument: this.lead, midi, velocity: pace.velocity, steps: pace.every });
    events.pulse = pace.velocity / 127;
    return midi;
  }

  // At a bar start: a chord holding the lead's note on cello and pad, and the strings for the distance so far.
  playBar(leadMidi, flock, events) {
    const pc = (((leadMidi - KEY_ROOT_PC) % 12) + 12) % 12;
    const candidates = CHORDS.filter((c) => c.tones.includes(pc));
    if (!candidates.includes(this.chord)) this.chord = candidates[0];
    const [root] = this.chord.tones;

    events.notes.push({
      instrument: Instrument.CELLO,
      midi: rootFrom(Instrument.CELLO.lowNote) + root,
      velocity: BASS_VELOCITY,
      steps: STEPS_PER_BAR,
    });
    const padRoot = rootFrom(Instrument.WARM_PAD.lowNote);
    for (const tone of this.chord.tones) {
      events.notes.push({ instrument: Instrument.WARM_PAD, midi: padRoot + tone, velocity: PAD_VELOCITY, steps: STEPS_PER_BAR });
    }

    const share = this.farthestKm > 0 ? flock.kmSoFar / this.farthestKm : 0;
    const voices = Math.round(share * STRING_VOICES);
    if (!voices) return;
    const expression = Math.round(STRING_EXPRESSION.min + share * (STRING_EXPRESSION.max - STRING_EXPRESSION.min));
    events.controls.push({ instrument: Instrument.STRINGS, cc: CC.EXPRESSION, value: expression });
    const stringRoot = rootFrom(Instrument.STRINGS.lowNote);
    // Lowest voices first, so the chord grows upward as the distance adds up.
    const voicing = [0, 1].flatMap((octave) => this.chord.tones.map((tone) => stringRoot + 12 * octave + tone)).sort((a, b) => a - b);
    for (const midi of voicing.slice(0, voices)) {
      events.notes.push({ instrument: Instrument.STRINGS, midi, velocity: STRING_VELOCITY, steps: STEPS_PER_BAR });
    }
  }
}
