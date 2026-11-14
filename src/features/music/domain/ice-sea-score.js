import { yearStartSec } from '../../tracks/domain/year-timeline.js';
import { minorDegree, velocityGain } from './pitch.js';

/** General MIDI instruments the score uses, by their SoundFont file names. */
export const Instrument = Object.freeze({
  CELLO: 'cello',
  PIANO: 'acoustic_grand_piano',
  HARP: 'orchestral_harp',
  HORN: 'french_horn',
  WAVES: 'seashore',
  STRINGS: 'string_ensemble_2',
  TIMPANI: 'timpani',
});

/** What a note stands for. */
export const Part = Object.freeze({
  /** The pole's ice. */
  ICE: 'ice',
  /** The sea level line. */
  SEA: 'sea',
  /** The harp wave over the sea level line. */
  SEA_WAVE: 'sea-wave',
  /** The Seashore stroke under the harp. */
  WATER: 'water',
  /** The 1981–2010 normal. */
  NORMAL: 'normal',
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
 */

/** How the sea level line is played. */
export const SeaStyle = Object.freeze({
  /** One bass note a year, on the root of the year's chord. */
  LINE: 'line',
  /**
   * Tolling, after the opening of Rachmaninoff's Piano Concerto No. 2: the low F1, doubled an octave up, half a bar
   * after the ice note, the same notes every year, struck in each year the sea rose and harder the higher it is.
   */
  BELLS: 'bells',
});

/**
 * The chords a track moves through, one a bar, in C minor.
 *
 * @typedef {Object} Harmony
 * @property {number[][]} chords pitch classes of each chord: root, third, fifth, then any added tone
 * @property {number[]} roots the root of each chord low in the bass (MIDI)
 * @property {number[]} drone the held string notes under the whole track (MIDI)
 * @property {number} timpani the timpani's note (MIDI)
 */

/** The harmonies a track can move through. */
export const Harmony = Object.freeze({
  /** Cm, A♭, E♭, B♭ (i, VI, III, VII), so the waves move instead of repeating; C2 and G2 held under them. */
  CYCLE: Object.freeze({
    chords: [[0, 3, 7], [8, 0, 3], [3, 7, 10], [10, 2, 5]],
    roots: [36, 32, 39, 34],
    drone: [36, 43],
    timpani: 36,
  }),
  /**
   * After the first bars of Rachmaninoff's Second Concerto, all over F: F minor, then with D♭, then with D♮ added,
   * over and over; F2 and C3 held under them.
   */
  OPENING: Object.freeze({
    chords: [[5, 8, 0], [5, 8, 0, 1], [5, 8, 0, 2]],
    roots: [41, 41, 41],
    drone: [41, 48],
    timpani: 41,
  }),
});

/** Pitch class of the album's key: C minor, the key of Rachmaninoff's Second Concerto. */
export const KEY_TONIC = 0;

/**
 * How a track plays its sea level line.
 *
 * @typedef {Object} SeaVoice
 * @property {string} instrument one of Instrument
 * @property {string} [style] one of SeaStyle, LINE when left out
 * @property {number} offsetBeats how far after the ice the sea plays each year, in beats; the harp wave and the
 *   Seashore stroke follow it
 * @property {boolean} held a year on the same note as the last holds it on (for a horn); otherwise every year is
 *   struck again (for a piano, whose note dies away)
 * @property {number} transpose semitones above the low bass the line plays at (a horn sounds best an octave up)
 * @property {number} level gain on top of the instrument's MIX level
 */

/**
 * How a track plays its ice: the main instrument, the note for the 1981–2010 normal (a note of C minor), how much ice
 * one scale step stands for, the harmony, and how the sea level is played.
 *
 * @typedef {Object} IceVoice
 * @property {string} instrument one of Instrument
 * @property {number} homeMidi
 * @property {number} kmPerStep million km² per scale step
 * @property {number} lengthBeats how long each year's note lasts, in beats (legato above 1)
 * @property {Harmony} [harmony] Harmony.CYCLE when left out
 * @property {number} [level] gain on top of the instrument's MIX level (1 when left out)
 * @property {SeaVoice} sea
 */

// Sea level is heard as strength, not pitch. The held sea line, the harp wave and the wave stroke play harder the higher
// the sea, from very soft at the first year to strong at +100 mm. The sea line plays the root of the year's chord low
// in the bass; over it, on the harp, each year a wave washes in and recedes through the chord; under it a wave stroke
// says it is water. The bells too, from mf in the first year to fff at +100 mm.
const SEA_TOP_MM = 100;
const SEA_LINE = Object.freeze({ velocity: 40, velocityRise: 80, overlapSec: 0.12 });
// Attack and release of the sea line, by whether it is held.
const SEA_ENVELOPE = Object.freeze({ held: { attackSec: 0.18, releaseSec: 0.5 }, struck: { attackSec: 0.02, releaseSec: 0.5 } });
// Bells: the score's low F1, doubled an octave up (F2) so it is heard on small speakers that cannot play F1's 44 Hz,
// from mf at the first year's sea level, already clear, to fff at +100 mm.
const BELL = Object.freeze({ keys: [29, 41], velocity: 64, velocityRise: 63 });
const WAVE_NOTES = 6;
const WAVE_VELOCITY = Object.freeze({ base: 34, rise: 64, swell: 16 });
const WATER_VELOCITY = Object.freeze({ base: 45, rise: 80 });
const WAVE_GAP_SEC = 0.11;
const RECEDE_SEC = Object.freeze([0.26, 0.48]);
const HARP_NOTE_SEC = 1.6;
const LOWEST_HARP = 36;
const WAVE_HOME = 62;
const WAVE_SEC = 2.6;
// Small fixed variations in time (s) and velocity, so the waves do not sound machine-made; the same every time.
const HUMAN = Object.freeze({ timeSec: 0.012, velocity: 6 });
// The main instrument plays a year louder the more the ice changed from the year before: VELOCITY.base, plus
// VELOCITY.perStep for each scale step of change, up to VELOCITY.max.
const VELOCITY = Object.freeze({ base: 84, perStep: 6, max: 122 });

/**
 * Level of each instrument (linear gain), measured by rendering each part of the glacier tracks alone in a browser
 * with the FluidR3 samples (RMS while the years play, before the reverb). The ice, on piano or cello, plays at the
 * same level on top; the sea line rises to 3 dB under it in the last third (with its voice's `level`); the harp and
 * wave reach 8 dB under it, the wave 8 dB under the harp; the normal sits 14 dB under the ice and the timpani 12 dB.
 */
export const MIX = Object.freeze({
  [Instrument.CELLO]: 3.43,
  [Instrument.PIANO]: 11.2,
  [Instrument.HORN]: 2.24,
  [Instrument.HARP]: 1.18,
  [Instrument.WAVES]: 0.83,
  [Instrument.STRINGS]: 1.15,
  [Instrument.TIMPANI]: 7.1,
});

// A fixed pseudo-random number in -1..1 for a year and a note.
function jitter(year, note, salt) {
  const x = Math.sin(year * 12.9898 + note * 78.233 + salt * 37.719) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const seaRise = (mm) => Math.min(Math.max(mm, 0), SEA_TOP_MM) / SEA_TOP_MM;

// The sea level line: the root of each year's chord in the bass, `offsetSec` after the ice, harder as the sea rises.
// Held, a run of years on the same note is one note that lasts until the next; struck, every year is played again and
// lasts its beat. The last note lasts to `end`.
function seaLine(years, timeline, end, mix, voice, harmony) {
  if (voice.style === SeaStyle.BELLS) return seaBells(years, timeline, end, mix, voice);
  const offsetSec = voice.offsetBeats * timeline.beatSec;
  const envelope = voice.held ? SEA_ENVELOPE.held : SEA_ENVELOPE.struck;
  const notes = [];
  years.forEach((year, i) => {
    const midi = harmony.roots[i % harmony.roots.length] + voice.transpose;
    const timeSec = yearStartSec(timeline, i) + offsetSec;
    const previous = notes.at(-1);
    if (voice.held && previous?.midi === midi) return;
    if (previous) previous.durationSec = timeSec - previous.timeSec + SEA_LINE.overlapSec;
    const velocity = SEA_LINE.velocity + SEA_LINE.velocityRise * seaRise(year.seaLevelMm);
    notes.push({
      timeSec,
      durationSec: end - timeSec,
      instrument: voice.instrument,
      part: Part.SEA,
      midi,
      gain: velocityGain(velocity) * mix[voice.instrument] * voice.level,
      ...envelope,
    });
  });
  return notes;
}

// The tolling sea: the low F1 and F2 `offsetBeats` after the ice note, held to the end of the bar as the score's half
// note, in the first year and in every year the sea rose, harder the higher it is. The last one lasts to `end`.
function seaBells(years, timeline, end, mix, voice) {
  const offsetSec = voice.offsetBeats * timeline.beatSec;
  return years.flatMap((year, i) => {
    const before = years[i - 1];
    if (before && year.seaLevelMm <= before.seaLevelMm) return [];
    const velocity = BELL.velocity + BELL.velocityRise * seaRise(year.seaLevelMm);
    const timeSec = yearStartSec(timeline, i) + offsetSec;
    return BELL.keys.map((midi) => ({
      timeSec,
      durationSec: i === years.length - 1 ? end - timeSec : timeline.beatSec * (1 - voice.offsetBeats),
      instrument: voice.instrument,
      part: Part.SEA,
      midi,
      gain: velocityGain(Math.min(127, velocity)) * mix[voice.instrument] * voice.level,
      ...SEA_ENVELOPE.struck,
    }));
  });
}

// The harp wave and the Seashore stroke of one year.
function seaWave(timeSec, mm, index, mix, harmony) {
  const rise = seaRise(mm);
  const chord = harmony.chords[index % harmony.chords.length];
  // The same shape every year, low on the harp: up through the chord from its lowest tone, then back two notes.
  const climb = [];
  for (let midi = LOWEST_HARP; climb.length < WAVE_NOTES; midi++) if (chord.includes(midi % 12)) climb.push(midi);
  const recede = climb.slice(-3, -1).reverse();
  const base = WAVE_VELOCITY.base + WAVE_VELOCITY.rise * rise;
  const note = (midi, at, velocity, k) => ({
    timeSec: timeSec + at + jitter(index, k, 1) * HUMAN.timeSec,
    durationSec: HARP_NOTE_SEC,
    instrument: Instrument.HARP,
    part: Part.SEA_WAVE,
    midi,
    gain: velocityGain(Math.min(127, Math.max(1, velocity + jitter(index, k, 2) * HUMAN.velocity))) * mix[Instrument.HARP],
    attackSec: 0.005,
    releaseSec: 0.7,
  });
  // Swells towards the crest, then ebbs.
  const notes = climb.map((midi, k) => note(midi, k * WAVE_GAP_SEC, base + WAVE_VELOCITY.swell * (k / (climb.length - 1)), k));
  const crest = (climb.length - 1) * WAVE_GAP_SEC;
  recede.forEach((midi, k) => notes.push(note(midi, crest + RECEDE_SEC[k], base - 6 - 6 * k, climb.length + k)));
  notes.push({
    timeSec,
    durationSec: WAVE_SEC,
    instrument: Instrument.WAVES,
    part: Part.WATER,
    midi: WAVE_HOME,
    gain: velocityGain(Math.min(127, WATER_VELOCITY.base + WATER_VELOCITY.rise * rise)) * mix[Instrument.WAVES],
    attackSec: 0.3,
    releaseSec: 1,
  });
  return notes;
}

/**
 * The notes of a polar track, in C minor, one year a bar: the pole's ice on the main instrument (the normal is home;
 * less ice is lower, and a bigger change from the year before is louder), the sea level as strength (a low bass line or
 * bell, a harp wave and a wave stroke), the normal as a held string chord, and a timpani stroke on every record low.
 *
 * @param {import('../../tracks/domain/ice-sea-series.js').IceSeaYear[]} years
 * @param {IceVoice} voice
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline
 * @param {number} durationSec
 * @param {Record<string, number>} [mix]
 * @returns {NoteEvent[]}
 */
export function iceSeaScore(years, voice, timeline, durationSec, mix = MIX) {
  const end = durationSec - timeline.tailSec;
  const harmony = voice.harmony ?? Harmony.CYCLE;
  const lowest = Math.min(...years.map((y) => y.extent));
  const seaOffsetSec = voice.sea.offsetBeats * timeline.beatSec;
  const notes = harmony.drone.map((midi) => ({
    timeSec: 0,
    durationSec: end,
    instrument: Instrument.STRINGS,
    part: Part.NORMAL,
    midi,
    gain: velocityGain(60) * mix[Instrument.STRINGS],
    attackSec: 1.5,
    releaseSec: 1.2,
  }));
  notes.push(...seaLine(years, timeline, end, mix, voice.sea, harmony));
  const steps = years.map((year) => Math.round((year.extent - year.normal) / voice.kmPerStep));
  years.forEach((year, i) => {
    const timeSec = yearStartSec(timeline, i);
    const last = i === years.length - 1;
    const change = i === 0 ? 0 : Math.abs(steps[i] - steps[i - 1]);
    const top = minorDegree(voice.homeMidi, steps[i], KEY_TONIC);
    const velocity = Math.min(VELOCITY.max, VELOCITY.base + VELOCITY.perStep * change);
    const level = mix[voice.instrument] * (voice.level ?? 1);
    notes.push({
      timeSec,
      durationSec: last ? end - timeSec : timeline.beatSec * voice.lengthBeats,
      instrument: voice.instrument,
      part: Part.ICE,
      midi: top,
      gain: velocityGain(velocity) * level,
      attackSec: 0.02,
      releaseSec: 0.5,
    });
    notes.push(...seaWave(timeSec + seaOffsetSec, year.seaLevelMm, i, mix, harmony));
    if (year.recordLow) {
      notes.push({
        timeSec,
        durationSec: 1.2,
        instrument: Instrument.TIMPANI,
        part: Part.RECORD,
        midi: harmony.timpani,
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
