import { yearStartSec } from '../../tracks/domain/year-timeline.js';
import { minorDegree, velocityGain } from './pitch.js';

/** General MIDI instruments the score uses, by their SoundFont file names. */
export const Instrument = Object.freeze({
  CELLO: 'cello',
  PIANO: 'acoustic_grand_piano',
  HARP: 'orchestral_harp',
  WAVES: 'seashore',
  STRINGS: 'string_ensemble_2',
  TIMPANI: 'timpani',
});

/**
 * One note to play.
 *
 * @typedef {Object} NoteEvent
 * @property {number} timeSec start, from the track start
 * @property {number} durationSec until the key is released
 * @property {string} instrument one of Instrument
 * @property {number} midi
 * @property {number} gain linear
 * @property {number} attackSec
 * @property {number} releaseSec
 */

/**
 * How a track plays its ice: the main instrument, the note for the 1981–2010 normal (a D), and how much ice one
 * scale step stands for.
 *
 * @typedef {Object} IceVoice
 * @property {string} instrument one of Instrument
 * @property {number} homeMidi
 * @property {number} kmPerStep million km² per scale step
 * @property {number} lengthBeats how long each year's note lasts, in beats (legato above 1)
 */

// Sea level on the harp: each year a wave washes in and recedes. It climbs the chord of the year up to the water
// line, a note of D minor from D3 (the first year) to A4 (+100 mm), then falls back two notes; the higher the sea,
// the more notes it has and the louder it is. A wave stroke under it, higher as the water rises, says it is water.
const SEA_HOME = 50;
const SEA_TOP_MM = 100;
const SEA_STEPS = 11;
const WAVE_NOTES = Object.freeze({ min: 4, max: 8 });
const WAVE_GAP_SEC = 0.11;
const RECEDE_SEC = Object.freeze([0.26, 0.48]);
const HARP_NOTE_SEC = 1.6;
const LOWEST_HARP = 38;
const WAVE_HOME = 62;
const WAVE_SEC = 2.6;
// The harmony moves through four chords of D minor, one a year: Dm, B♭, F, C (i, VI, III, VII), as pitch classes.
const CHORDS = Object.freeze([[2, 5, 9], [10, 2, 5], [5, 9, 0], [0, 4, 7]]);
// Small fixed variations in time (s) and velocity, so the waves do not sound machine-made; the same every time.
const HUMAN = Object.freeze({ timeSec: 0.012, velocity: 6 });
// The main instrument plays a year louder the more the ice changed from the year before: VELOCITY.base, plus
// VELOCITY.perStep for each scale step of change, up to VELOCITY.max.
const VELOCITY = Object.freeze({ base: 84, perStep: 6, max: 122 });
// The 1981–2010 normal, held under the whole track: D2 and A2.
const DRONE = Object.freeze([38, 45]);
const TIMPANI_KEY = 38;
// Time left after the last note is released, for its tail.
const TAIL_SEC = 1.5;

/**
 * Level of each part (linear gain), measured by rendering each part of the glacier tracks alone in a browser with the
 * FluidR3 samples (RMS while the years play, before the reverb). Piano and cello play at the same level; the sea
 * (harp and wave) reaches 5 dB under them in the last third, the wave sits 8 dB under the harp, the normal 14 dB
 * under the main instrument and the timpani 12 dB.
 */
export const MIX = Object.freeze({
  [Instrument.CELLO]: 3.43,
  [Instrument.PIANO]: 11.2,
  [Instrument.HARP]: 1.87,
  [Instrument.WAVES]: 1.11,
  [Instrument.STRINGS]: 1.15,
  [Instrument.TIMPANI]: 7.1,
});

// A fixed pseudo-random number in -1..1 for a year and a note.
function jitter(year, note, salt) {
  const x = Math.sin(year * 12.9898 + note * 78.233 + salt * 37.719) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function sea(timeSec, mm, index, mix) {
  const rise = Math.min(Math.max(mm, 0), SEA_TOP_MM) / SEA_TOP_MM;
  const top = minorDegree(SEA_HOME, Math.round(rise * SEA_STEPS));
  const chord = CHORDS[index % CHORDS.length];
  // The chord tones just under the water line, so the wave sits where the water is.
  const tones = [];
  for (let midi = LOWEST_HARP; midi < top; midi++) if (chord.includes(midi % 12)) tones.push(midi);
  const count = Math.round(WAVE_NOTES.min + rise * (WAVE_NOTES.max - WAVE_NOTES.min));
  const climb = [...tones.slice(-count), top];
  // Falls back from the crest through the two chord tones under it.
  const recede = tones.slice(-2).reverse();
  const base = 44 + 38 * rise;
  const note = (midi, at, velocity, k) => ({
    timeSec: timeSec + at + jitter(index, k, 1) * HUMAN.timeSec,
    durationSec: HARP_NOTE_SEC,
    instrument: Instrument.HARP,
    midi,
    gain: velocityGain(Math.min(127, Math.max(1, velocity + jitter(index, k, 2) * HUMAN.velocity))) * mix[Instrument.HARP],
    attackSec: 0.005,
    releaseSec: 0.7,
  });
  // Swells towards the crest, then ebbs.
  const notes = climb.map((midi, k) => note(midi, k * WAVE_GAP_SEC, base + 16 * (k / Math.max(1, climb.length - 1)), k));
  const crest = (climb.length - 1) * WAVE_GAP_SEC;
  recede.forEach((midi, k) => notes.push(note(midi, crest + RECEDE_SEC[k], base - 6 - 6 * k, climb.length + k)));
  notes.push({
    timeSec,
    durationSec: WAVE_SEC,
    instrument: Instrument.WAVES,
    midi: WAVE_HOME + Math.round(12 * rise),
    gain: velocityGain(70 + 50 * rise) * mix[Instrument.WAVES],
    attackSec: 0.3,
    releaseSec: 1,
  });
  return notes;
}

/**
 * The notes of a polar track: the pole's ice on the main instrument (the normal is home, D; less ice is lower, and a
 * bigger change from the year before is louder), the sea level as a wave on the harp over a moving harmony, with a
 * wave stroke, the normal as a held string chord, and a timpani stroke on every record low.
 *
 * @param {import('../../tracks/domain/ice-sea-series.js').IceSeaYear[]} years
 * @param {IceVoice} voice
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline
 * @param {number} durationSec
 * @param {Record<string, number>} [mix]
 * @returns {NoteEvent[]}
 */
export function iceSeaScore(years, voice, timeline, durationSec, mix = MIX) {
  const end = durationSec - TAIL_SEC;
  const lowest = Math.min(...years.map((y) => y.extent));
  const notes = DRONE.map((midi) => ({
    timeSec: 0,
    durationSec: end,
    instrument: Instrument.STRINGS,
    midi,
    gain: velocityGain(60) * mix[Instrument.STRINGS],
    attackSec: 1.5,
    releaseSec: 1.2,
  }));
  const steps = years.map((year) => Math.round((year.extent - year.normal) / voice.kmPerStep));
  years.forEach((year, i) => {
    const timeSec = yearStartSec(timeline, i);
    const last = i === years.length - 1;
    const change = i === 0 ? 0 : Math.abs(steps[i] - steps[i - 1]);
    notes.push({
      timeSec,
      durationSec: last ? end - timeSec : timeline.beatSec * voice.lengthBeats,
      instrument: voice.instrument,
      midi: minorDegree(voice.homeMidi, steps[i]),
      gain: velocityGain(Math.min(VELOCITY.max, VELOCITY.base + VELOCITY.perStep * change)) * mix[voice.instrument],
      attackSec: 0.02,
      releaseSec: 0.5,
    });
    notes.push(...sea(timeSec, year.seaLevelMm, i, mix));
    if (year.recordLow) {
      notes.push({
        timeSec,
        durationSec: 1.2,
        instrument: Instrument.TIMPANI,
        midi: TIMPANI_KEY,
        gain: velocityGain(year.extent === lowest ? 112 : 78) * mix[Instrument.TIMPANI],
        attackSec: 0.002,
        releaseSec: 0.8,
      });
    }
  });
  return notes.sort((a, b) => a.timeSec - b.timeSec);
}
