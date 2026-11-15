import { yearStartSec } from '../../tracks/domain/year-timeline.js';
import { minorDegree, velocityGain } from './pitch.js';

// The score is written to be understood by ear alone, without the globe: two streams a listener can tell apart at
// once, each with one meaning, on sounds whose meaning is familiar from life.
//
// - Ice is the pitch of a mallet instrument, one note a year held to the next: less ice is lower. Pitch is what the ear
//   tells apart most finely, so the small changes from one year to the next are heard: each step of C minor is 4% of
//   the 1981–2010 normal, which sits on G5. Each track has its own: a vibraphone (struck metal) in the north, a piano
//   in the south.
// - Sea is the pitch of a low held string line that climbs as the water rises, like a bottle filling with water, a
//   step of C minor for each 15 mm, one octave over the 100 mm the sea rose from 1993 to 2024.
// - A record low is a single timpani stroke, the only other sound.
//
// So the ice falls as the sea rises, and the two lines draw together. They are told apart by sound (struck against
// bowed strings), by register (the ice above, the sea below) and by side (the ice a little right, the sea a
// little left). The two tracks share the rest of the score, so what a listener learns on one holds on the other.

/** General MIDI instruments the score uses, by their SoundFont file names. */
export const Instrument = Object.freeze({
  VIBRAPHONE: 'vibraphone',
  PIANO: 'acoustic_grand_piano',
  STRINGS: 'string_ensemble_1',
  TIMPANI: 'timpani',
});

/** What a note stands for. */
export const Part = Object.freeze({
  /** The pole's ice. */
  ICE: 'ice',
  /** The sea level line. */
  SEA: 'sea',
  /** A record low. */
  RECORD: 'record',
});

/**
 * One note to play.
 *
 * @typedef {Object} NoteEvent
 * @property {number} timeSec start, from the track start
 * @property {number} durationSec until the key is released
 * @property {string} instrument one of Instrument
 * @property {string} part one of Part
 * @property {number} midi
 * @property {number} gain linear
 * @property {number} attackSec
 * @property {number} releaseSec
 * @property {number} [pan] stereo position, -1 (left) to 1 (right); centre when left out
 * @property {{ angle: number, gone: number }} [space] a place around the listener instead of `pan`: `angle` in radians
 *   clockwise from straight ahead (north), `gone` from 0 (near) to 1 (far); see music-player.js
 */

/** Pitch class of the album's key: C minor. */
export const KEY_TONIC = 0;

// Ice: G5 at the 1981–2010 normal, a step of C minor down (or up) for every `perStep` of the normal the extent is below
// (or above) it, between C4 and B♭6. Quieter too with less ice: velocity base + perNormal × (extent / normal).
const ICE = Object.freeze({
  homeMidi: 79,
  perStep: 0.04,
  lowest: 60,
  highest: 94,
  velocity: { base: 70, perNormal: 30, min: 50, max: 115 },
  attackSec: 0.005,
  releaseSec: 0.8,
  overlapSec: 0.1,
  pan: 0.3,
});

/**
 * The instrument a track plays its ice on, with the RMS (dB) of each of its samples the ice can play, over a bar
 * (1.2 s, decoded with afconvert). Each note is evened out to `referenceDb`, so only the ice changes how loud it is:
 * the vibraphone's and the piano's samples come from a few recordings each and jump by up to 10 dB and 8 dB from one key
 * to the next.
 *
 * @typedef {Object} IceVoice
 * @property {string} instrument one of Instrument
 * @property {Record<number, number>} levelsDb by MIDI note, C4 to B♭6 in C minor
 * @property {number} referenceDb
 */

/** The instruments a track can play its ice on. */
export const IceVoice = Object.freeze({
  VIBRAPHONE: Object.freeze({
    instrument: Instrument.VIBRAPHONE,
    levelsDb: Object.freeze({
      60: -36.7, 62: -36.7, 63: -36.7, 65: -40.9, 67: -37.4, 68: -37.4, 70: -37.4,
      72: -38.4, 74: -38.4, 75: -38.4, 77: -38.4, 79: -46.4, 80: -46.4, 82: -44.2,
      84: -44.3, 86: -43.2, 87: -43.3, 89: -41.7, 91: -42.0, 92: -42.1, 94: -42.6,
    }),
    referenceDb: -38.3,
  }),
  PIANO: Object.freeze({
    instrument: Instrument.PIANO,
    levelsDb: Object.freeze({
      60: -34.7, 62: -35.2, 63: -39.3, 65: -39.7, 67: -35.7, 68: -36.0, 70: -36.5,
      72: -38.2, 74: -38.7, 75: -42.2, 77: -42.6, 79: -42.0, 80: -42.3, 82: -42.8,
      84: -43.4, 86: -39.9, 87: -40.2, 89: -40.7, 91: -40.0, 92: -40.2, 94: -40.7,
    }),
    referenceDb: -39,
  }),
});

// Sea: C3 at the first year's level, a step of C minor up for every mmPerStep of rise; louder too as it rises.
const SEA = Object.freeze({
  homeMidi: 48,
  mmPerStep: 15,
  velocity: { base: 60, rise: 40 },
  topMm: 100,
  overlapSec: 0.12,
  attackSec: 0.3,
  releaseSec: 0.8,
  pan: -0.3,
});

const TIMPANI_MIDI = 36;

/**
 * Level of each instrument (linear gain), set from the RMS of the FluidR3 samples (decoded with afconvert, first
 * 1.82 s): the ice at the normal and the sea line in the middle of its rise about 3 dB apart, the ice on top; the
 * piano at the vibraphone's level (each evened out to its `referenceDb`). Not yet measured in a browser render of the
 * whole score.
 */
export const MIX = Object.freeze({
  [Instrument.VIBRAPHONE]: 4.8,
  [Instrument.PIANO]: 5.2,
  [Instrument.STRINGS]: 1.9,
  [Instrument.TIMPANI]: 7.1,
});

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const seaRise = (mm) => clamp(mm, 0, SEA.topMm) / SEA.topMm;

/** The ice's note for a year: its extent against the normal, as steps of C minor from G5. */
export function iceMidi(year) {
  const steps = Math.round((year.extent / year.normal - 1) / ICE.perStep);
  return clamp(minorDegree(ICE.homeMidi, steps, KEY_TONIC), ICE.lowest, ICE.highest);
}

/** The sea line's note for a sea level (mm above the first year). */
export function seaMidi(mm) {
  return minorDegree(SEA.homeMidi, Math.round(mm / SEA.mmPerStep), KEY_TONIC);
}

// The ice note of one year on `voice`, struck at `timeSec` and held until `untilSec`.
function iceNote(year, voice, timeSec, untilSec, mix) {
  const v = ICE.velocity;
  const velocity = clamp(v.base + v.perNormal * (year.extent / year.normal), v.min, v.max);
  const midi = iceMidi(year);
  const evenOut = 10 ** ((voice.referenceDb - voice.levelsDb[midi]) / 20);
  return {
    timeSec,
    durationSec: untilSec - timeSec,
    instrument: voice.instrument,
    part: Part.ICE,
    midi,
    gain: velocityGain(velocity) * evenOut * mix[voice.instrument],
    attackSec: ICE.attackSec,
    releaseSec: ICE.releaseSec,
    pan: ICE.pan,
  };
}

// The sea line: one held string note that moves only when the sea reaches another step, so a run of years on the same
// step is one long note. The last note lasts to `end`.
function seaLine(years, timeline, end, mix) {
  const notes = [];
  years.forEach((year, i) => {
    const midi = seaMidi(year.seaLevelMm);
    const timeSec = yearStartSec(timeline, i);
    const previous = notes.at(-1);
    if (previous?.midi === midi) return;
    if (previous) previous.durationSec = timeSec - previous.timeSec + SEA.overlapSec;
    const velocity = SEA.velocity.base + SEA.velocity.rise * seaRise(year.seaLevelMm);
    notes.push({
      timeSec,
      durationSec: end - timeSec,
      instrument: Instrument.STRINGS,
      part: Part.SEA,
      midi,
      gain: velocityGain(velocity) * mix[Instrument.STRINGS],
      attackSec: SEA.attackSec,
      releaseSec: SEA.releaseSec,
      pan: SEA.pan,
    });
  });
  return notes;
}

/**
 * The notes of a polar track, in C minor, one year a bar: the ice as a note on `iceVoice` that falls as the ice shrinks,
 * the sea level as a low string line that climbs as the water rises, and a timpani stroke on every record low.
 *
 * @param {import('../../tracks/domain/ice-sea-series.js').IceSeaYear[]} years
 * @param {IceVoice} iceVoice
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline
 * @param {number} durationSec
 * @param {Record<string, number>} [mix]
 * @returns {NoteEvent[]}
 */
export function iceSeaScore(years, iceVoice, timeline, durationSec, mix = MIX) {
  const end = durationSec - timeline.tailSec;
  const lowest = Math.min(...years.map((y) => y.extent));
  const notes = seaLine(years, timeline, end, mix);
  years.forEach((year, i) => {
    const timeSec = yearStartSec(timeline, i);
    const last = i === years.length - 1;
    notes.push(iceNote(year, iceVoice, timeSec, last ? end : timeSec + timeline.beatSec + ICE.overlapSec, mix));
    if (year.recordLow) {
      notes.push({
        timeSec,
        durationSec: 1.2,
        instrument: Instrument.TIMPANI,
        part: Part.RECORD,
        midi: TIMPANI_MIDI,
        gain: velocityGain(year.extent === lowest ? 112 : 78) * mix[Instrument.TIMPANI],
        attackSec: 0.002,
        releaseSec: 0.8,
      });
    }
  });
  // Nothing rings past the end of the track into the next one.
  for (const note of notes) note.durationSec = Math.min(note.durationSec, durationSec - note.timeSec - note.releaseSec);
  return notes.sort((a, b) => a.timeSec - b.timeSec);
}
