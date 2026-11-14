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

// Sea level: one octave of D minor from D3 over the 1993–2024 rise; each year a harp ripple from D2 up to the water
// line, and a wave under it that comes in higher as the water rises, like the note of a filling vessel.
const SEA_HOME = 50;
const SEA_TOP_MM = 100;
const RIPPLE_TONES = Object.freeze([38, 41, 45, 50, 53, 57]); // D2 F2 A2 D3 F3 A3
const RIPPLE_GAP_SEC = 0.085;
const RIPPLE_NOTE_SEC = 1.4;
const WAVE_HOME = 62;
const WAVE_SEC = 2.6;
// The 1981–2010 normal, held under the whole track: D2 and A2.
const DRONE = Object.freeze([38, 45]);
const TIMPANI_KEY = 38;
// Time left after the last note is released, for its tail.
const TAIL_SEC = 1.5;

/**
 * Level of each part (linear gain), measured by rendering each part of the glacier tracks alone in a browser with the
 * FluidR3 samples (RMS while the years play, before the reverb). Cello and piano play at the same level; the sea
 * (harp and wave) reaches 6 dB under them in the last third, the wave sits 8 dB under the harp, the normal 14 dB
 * under the main instrument and the timpani 12 dB.
 */
export const MIX = Object.freeze({
  [Instrument.CELLO]: 3.3,
  [Instrument.PIANO]: 12.3,
  [Instrument.HARP]: 1.77,
  [Instrument.WAVES]: 0.98,
  [Instrument.STRINGS]: 1.15,
  [Instrument.TIMPANI]: 7.1,
});

function sea(timeSec, mm, mix) {
  const rise = Math.min(Math.max(mm, 0), SEA_TOP_MM) / SEA_TOP_MM;
  const top = minorDegree(SEA_HOME, Math.round(rise * 7));
  const ripple = [...RIPPLE_TONES.filter((key) => key < top), top];
  const velocity = 48 + 44 * rise;
  const notes = ripple.map((midi, i) => ({
    timeSec: timeSec + i * RIPPLE_GAP_SEC,
    durationSec: RIPPLE_NOTE_SEC,
    instrument: Instrument.HARP,
    midi,
    gain: velocityGain(Math.min(127, velocity + (midi === top ? 12 : 0))) * mix[Instrument.HARP],
    attackSec: 0.005,
    releaseSec: 0.6,
  }));
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
 * The notes of a polar track: the pole's ice on the main instrument (the normal is home, D; less ice is lower), the
 * sea level on harp and waves, the normal as a held string chord, and a timpani stroke on every record low.
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
  years.forEach((year, i) => {
    const timeSec = yearStartSec(timeline, i);
    const last = i === years.length - 1;
    notes.push({
      timeSec,
      durationSec: last ? end - timeSec : timeline.beatSec * voice.lengthBeats,
      instrument: voice.instrument,
      midi: minorDegree(voice.homeMidi, Math.round((year.extent - year.normal) / voice.kmPerStep)),
      gain: velocityGain(100) * mix[voice.instrument],
      attackSec: 0.02,
      releaseSec: 0.5,
    });
    notes.push(...sea(timeSec, year.seaLevelMm, mix));
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
