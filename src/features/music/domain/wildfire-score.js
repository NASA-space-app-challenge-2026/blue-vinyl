import { yearStartSec } from '../../tracks/domain/year-timeline.js';
import { minorDegree, velocityGain } from './pitch.js';

// Ear-alone score for the wildfire album (EIC 40531 / 5453 / FEDS). Bad news stays dark: C minor, low brass and
// strings. What the ear learns on Track 1 (the national graph) carries to Track 2 (one peak year on the map).
//
// The main instrument says how big the fire is the same way in both tracks: higher and louder is bigger. Around it the
// fire itself is heard, so a listener who cannot see the globe hears its size too:
//
// - Roar: a low wash of sea noise, louder and brighter the bigger the fire, in two voices that stand wider apart.
// - Blast: into the track's peak an accelerating timpani roll, a rising harp run and a reverse cymbal build the
//   tension; on the peak the whole orchestra strikes at once, and the fire's sound falls silent for a breath while the
//   chord rings on.
//
// Track 1 — literal 5453 graph: one french-horn tone a year; pitch and loudness = burned acres. Fire = acres. A cello
// floor follows the 10-year mean (the rise since the 1980s). Timpani marks each of the ten largest-acre years; the
// blast lands on the largest (2015, and 2020 within 1% of it).
//
// Track 2 — 2020 season, one beat a day: trombone (+ tuba as weight when heavy) = that day's active large-fire area,
// held while it stays on one pitch. Roar = active area, centred where the fires burn; quiet cello = fireline length, every four days; timpani when the active area sets a clear season record; the blast
// lands on the day of the largest active area.

/** FluidR3_GM instrument file names (see soundfont-bank.js). */
export const Instrument = Object.freeze({
  FRENCH_HORN: 'french_horn',
  TROMBONE: 'trombone',
  TUBA: 'tuba',
  CELLO: 'cello',
  CONTRABASS: 'contrabass',
  TIMPANI: 'timpani',
  REVERSE_CYMBAL: 'reverse_cymbal',
  HARP: 'orchestral_harp',
  // The fire's roar: a low wash of sea noise.
  ROAR: 'seashore',
});

export const Part = Object.freeze({
  ACRES: 'acres',
  TREND: 'trend',
  AREA: 'area',
  FRONT: 'front',
  RECORD: 'record',
  ROAR: 'roar',
  BUILD: 'build',
  BLAST: 'blast',
});

export const KEY_TONIC = 0;

// Levels (linear gain), from the RMS of the FluidR3 samples: the fire at full size sits under the main instrument at
// full size, which stays on top (measured on an offline render of each track).
const MIX = Object.freeze({
  [Instrument.FRENCH_HORN]: 1.35,
  [Instrument.TROMBONE]: 1.25,
  [Instrument.TUBA]: 0.7,
  [Instrument.CELLO]: 0.55,
  [Instrument.CONTRABASS]: 0.5,
  [Instrument.TIMPANI]: 1.4,
  [Instrument.REVERSE_CYMBAL]: 1.6,
  [Instrument.ROAR]: 1.3,
  [Instrument.HARP]: 0.8,
});

// How the fire's size (0..1, share of the track's largest) sounds.
const FIRE = Object.freeze({
  // The roar spans 24 dB, so size is plain in loudness alone; its pitch rises an octave (a brighter rush).
  roarDb: { min: -24, max: 0 },
  roarMidi: { home: 36, steps: 7 },
  // How far apart the roar's two voices stand in the stereo field.
  width: { min: 0.15, max: 0.95 },
});

// The blast: how long the build takes, the roll's gaps from first to last, and the breath after it.
const BLAST = Object.freeze({
  buildSec: 1.8,
  rollGapSec: { first: 0.16, last: 0.035 },
  // The reverse cymbal (C3) swells to its peak this far into its sample.
  cymbalMidi: 48,
  cymbalPeakSec: 1.62,
  breathSec: 0.45,
});

// Track 2: a season record strikes the timpani only when it beats the last stroke's by this share, and this long after.
const RECORD = Object.freeze({ rise: 0.15, gapSec: 1.5 });

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const dbGain = (db) => 10 ** (db / 20);
const lerp = (range, t) => range.min + (range.max - range.min) * t;

/**
 * @param {import('./ice-sea-score.js').NoteEvent[]} notes
 * @param {number} durationSec
 */
function clipToTrack(notes, durationSec) {
  for (const note of notes) {
    note.durationSec = Math.min(note.durationSec, durationSec - note.timeSec - note.releaseSec);
  }
  return notes.filter((n) => n.timeSec >= 0 && n.durationSec > 0.02).sort((a, b) => a.timeSec - b.timeSec);
}

/**
 * The fire's roar, beat by beat, carried on from the last beat while it keeps its level, pitch and width.
 */
function createFire() {
  // The roar is two voices, one each side, a scale step apart so they do not fuse into one sound in the middle: the
  // wider they stand, the wider the fire sounds.
  const sides = [-1, 1];
  let roar = null;

  /**
   * @param {import('./ice-sea-score.js').NoteEvent[]} notes
   * @param {{ timeSec: number, untilSec: number, size: number, pan: number }} beat `size` (0..1) sets the roar's level,
   *   pitch and width; `pan` is the fire's centre (-1..1)
   */
  function beat(notes, { timeSec, untilSec, size, pan }) {
    if (size <= 0.01) {
      roar = null;
      return;
    }
    // Level in 1 dB steps, pitch in scale steps and width in tenths, so a steady fire holds its notes.
    const db = Math.round(lerp(FIRE.roarDb, Math.sqrt(size)));
    const step = Math.round(size * FIRE.roarMidi.steps);
    const spread = Math.round(lerp(FIRE.width, size) * 10) / 10;
    const key = `${db}:${step}:${spread}`;
    if (roar && roar.key === key && Math.abs(roar.endSec - timeSec) < 1e-6) {
      for (const note of roar.notes) note.durationSec = untilSec - note.timeSec;
      roar.endSec = untilSec;
      return;
    }
    const voices = sides.map((side) => ({
      timeSec,
      durationSec: untilSec - timeSec + 0.12,
      instrument: Instrument.ROAR,
      part: Part.ROAR,
      midi: minorDegree(FIRE.roarMidi.home, step + (side > 0 ? 1 : 0), KEY_TONIC),
      // Two voices, each at half the power.
      gain: dbGain(db) * MIX[Instrument.ROAR] * Math.SQRT1_2,
      attackSec: 0.12,
      releaseSec: 0.3,
      pan: clamp(pan * 0.4 + side * spread, -1, 1),
    }));
    notes.push(...voices);
    roar = { key, notes: voices, endSec: untilSec };
  }

  return { beat };
}

/**
 * The build into a peak at `peakSec` and the blast on it: an accelerating timpani roll swelling from soft to loud, a
 * harp run rising three octaves, a reverse cymbal swelling to the peak; then every section strikes a C minor chord
 * together, and everything else rests for a breath while the chord rings (see breathe).
 *
 * @param {import('./ice-sea-score.js').NoteEvent[]} notes
 * @param {number} peakSec
 */
function blast(notes, peakSec) {
  const start = peakSec - BLAST.buildSec;
  // Roll: gaps shrink geometrically from first to last.
  const ratio = BLAST.rollGapSec.last / BLAST.rollGapSec.first;
  let t = start;
  let k = 0;
  while (t < peakSec - 0.02) {
    const along = (t - start) / BLAST.buildSec;
    notes.push({
      timeSec: t,
      durationSec: 0.25,
      instrument: Instrument.TIMPANI,
      part: Part.BUILD,
      midi: k % 2 === 0 ? 36 : 43,
      gain: velocityGain(35 + 75 * along) * MIX[Instrument.TIMPANI],
      attackSec: 0.002,
      releaseSec: 0.3,
      pan: k % 2 === 0 ? -0.2 : 0.2,
    });
    t += BLAST.rollGapSec.first * ratio ** along;
    k++;
  }
  // Harp run up three octaves of C minor over the build's last second, quickening.
  const runStart = peakSec - 1.0;
  const degrees = 21;
  for (let i = 0; i < degrees; i++) {
    const along = i / degrees;
    notes.push({
      timeSec: runStart + 1.0 * (1 - (1 - along) ** 1.6),
      durationSec: 0.12,
      instrument: Instrument.HARP,
      part: Part.BUILD,
      midi: minorDegree(48, i, KEY_TONIC),
      gain: velocityGain(45 + 60 * along) * MIX[Instrument.HARP],
      attackSec: 0.003,
      releaseSec: 0.4,
      pan: -0.8 + 1.6 * along,
    });
  }
  notes.push({
    timeSec: peakSec - BLAST.cymbalPeakSec,
    durationSec: BLAST.cymbalPeakSec,
    instrument: Instrument.REVERSE_CYMBAL,
    part: Part.BUILD,
    midi: BLAST.cymbalMidi,
    gain: MIX[Instrument.REVERSE_CYMBAL],
    attackSec: 0.01,
    releaseSec: 0.06,
  });
  // Tutti: a C minor chord from the bass up, all at once.
  const chord = [
    [Instrument.CONTRABASS, 36, -0.3],
    [Instrument.TUBA, 36, 0],
    [Instrument.CELLO, 48, -0.4],
    [Instrument.TROMBONE, 55, 0.3],
    [Instrument.FRENCH_HORN, 63, -0.2],
    [Instrument.TIMPANI, 36, 0],
    [Instrument.HARP, 60, 0.6],
    [Instrument.HARP, 67, -0.6],
  ];
  for (const [instrument, midi, pan] of chord) {
    const struck = instrument === Instrument.TIMPANI || instrument === Instrument.HARP;
    notes.push({
      timeSec: peakSec,
      // A short stab that rings away, so the breath after it is heard.
      durationSec: struck ? 0.2 : 0.16,
      instrument,
      part: Part.BLAST,
      midi,
      gain: velocityGain(120) * MIX[instrument] * 1.8,
      attackSec: 0.004,
      releaseSec: struck ? 1.0 : 0.45,
      pan,
    });
  }
  // The breath: the fire falls silent just after the strike, then comes back.
  breathe(notes, peakSec + 0.06, peakSec + BLAST.breathSec);
}

// The breath after the blast, from `fromSec` to `toSec`. The fire's roar falls silent: a held roar is cut. The held lines (the main instrument and the strings under it) are
// let ring out instead of stopped, so the struck chord carries the peak, and come back in after it. Held notes come
// back for whatever is left of them.
function breathe(notes, fromSec, toSec) {
  const fire = new Set([Part.ROAR]);
  const held = new Set([Part.ROAR, Part.ACRES, Part.AREA, Part.TREND, Part.FRONT]);
  const resumed = [];
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    const isFire = fire.has(note.part);
    if (!isFire && !held.has(note.part)) continue;
    const end = note.timeSec + note.durationSec;
    const comeBack = held.has(note.part) && end > toSec + 0.05;
    const rest = { ...note, timeSec: toSec, durationSec: end - toSec, attackSec: 0.25 };
    if (note.timeSec >= fromSec && note.timeSec < toSec) {
      notes.splice(i, 1);
      if (comeBack) resumed.push(rest);
    } else if (note.timeSec < fromSec && end > fromSec) {
      note.durationSec = fromSec - note.timeSec;
      note.releaseSec = isFire ? 0.08 : 0.5;
      if (comeBack) resumed.push({ ...rest, releaseSec: rest.releaseSec });
    }
  }
  notes.push(...resumed);
}

/**
 * Track 1: US annual burned acres (5453).
 *
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireYear[]} years
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline
 * @param {number} durationSec
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function annualBurnScore(years, timeline, durationSec) {
  const end = durationSec - timeline.tailSec;
  const acres = years.map((y) => y.acres);
  const amin = Math.min(...acres);
  const amax = Math.max(...acres);
  // 10-year trailing mean of acres (EIC: appears to have increased).
  const trend = years.map((_, i) => {
    const slice = acres.slice(Math.max(0, i - 9), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
  const tmin = Math.min(...trend);
  const tmax = Math.max(...trend);
  // The blast lands on the largest year, and on any within 1% of it.
  const peaks = new Set(years.filter((y) => y.acres >= amax * 0.99).map((y) => y.year));
  /** @type {import('./ice-sea-score.js').NoteEvent[]} */
  const notes = [];
  const fire = createFire();

  years.forEach((year, i) => {
    const timeSec = yearStartSec(timeline, i);
    const last = i === years.length - 1;
    const a = (year.acres - amin) / (amax - amin || 1);
    const until = last ? end : timeSec + timeline.beatSec;
    notes.push({
      timeSec,
      durationSec: until + (last ? 0 : 0.08) - timeSec,
      instrument: Instrument.FRENCH_HORN,
      part: Part.ACRES,
      midi: minorDegree(36, Math.round(a * 14), KEY_TONIC),
      gain: velocityGain(55 + 70 * a) * MIX[Instrument.FRENCH_HORN],
      attackSec: 0.02,
      releaseSec: 0.3,
      pan: 0.15,
    });

    fire.beat(notes, { timeSec, untilSec: until, size: year.acres / amax, pan: 0 });

    const tr = (trend[i] - tmin) / (tmax - tmin || 1);
    notes.push({
      timeSec,
      durationSec: timeline.beatSec + 0.05,
      instrument: Instrument.CELLO,
      part: Part.TREND,
      midi: minorDegree(36, Math.round(tr * 9), KEY_TONIC),
      gain: velocityGain(40 + 50 * tr) * MIX[Instrument.CELLO],
      attackSec: 0.25,
      releaseSec: 0.35,
      pan: -0.25,
    });

    // The ten largest years strike the timpani; the largest get the blast instead.
    if (year.isTop10 && !peaks.has(year.year)) {
      notes.push({
        timeSec,
        durationSec: 1.25,
        instrument: Instrument.TIMPANI,
        part: Part.RECORD,
        midi: 36,
        gain: velocityGain(95 + 25 * a) * MIX[Instrument.TIMPANI],
        attackSec: 0.002,
        releaseSec: 0.85,
      });
    }
  });

  years.forEach((year, i) => {
    if (peaks.has(year.year)) blast(notes, yearStartSec(timeline, i));
  });
  return clipToTrack(notes, durationSec);
}

/**
 * Track 2: one peak year's large fires day by day (FEDS / 5453 peak year).
 *
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireDay[]} days
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline read one beat a day
 * @param {number} durationSec
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function seasonScore(days, timeline, durationSec) {
  const end = durationSec - timeline.tailSec;
  const amax = Math.max(...days.map((d) => d.areaKm2), 1);
  const lmax = Math.max(...days.map((d) => d.flinelen), 1);
  const peakDay = days.findIndex((d) => d.areaKm2 === amax);
  const peakSec = yearStartSec(timeline, peakDay);
  /** @type {import('./ice-sea-score.js').NoteEvent[]} */
  const notes = [];
  const fire = createFire();
  let record = 0;
  let lastStrokeSec = -Infinity;
  // The brass note each part holds, carried on while the next day plays the same pitch.
  const held = new Map();
  const hold = (note) => {
    const last = held.get(note.instrument);
    if (last && last.midi === note.midi && Math.abs(last.timeSec + last.durationSec - note.timeSec) < 1e-6) {
      last.durationSec += note.durationSec;
      last.gain = Math.max(last.gain, note.gain);
      return;
    }
    held.set(note.instrument, note);
    notes.push(note);
  };

  days.forEach((day, i) => {
    const timeSec = yearStartSec(timeline, i);
    const last = i === days.length - 1;
    const until = last ? end : timeSec + timeline.beatSec;
    const a = day.areaKm2 / amax;
    const lv = day.flinelen / lmax;
    // Where the day's fires burn, west (left) to east (right) across the CONUS.
    const pan = day.lon ? clamp(((day.lon + 125) / 60) * 2 - 1, -0.8, 0.8) : 0;

    if (a <= 0.02) held.clear();
    if (a > 0.02) {
      // Higher and louder as the fires grow, as the horn does in Track 1.
      hold({
        timeSec,
        durationSec: until - timeSec,
        instrument: Instrument.TROMBONE,
        part: Part.AREA,
        midi: minorDegree(43, Math.round(a * 9), KEY_TONIC),
        gain: velocityGain(45 + 80 * Math.sqrt(a)) * MIX[Instrument.TROMBONE],
        attackSec: 0.03,
        releaseSec: 0.22,
        pan: pan * 0.4,
      });
      if (a <= 0.45) held.delete(Instrument.TUBA);
      if (a > 0.45) {
        // Weight under the largest days, on the tonic.
        hold({
          timeSec,
          durationSec: until - timeSec,
          instrument: Instrument.TUBA,
          part: Part.AREA,
          midi: 36,
          gain: velocityGain(40 + 60 * a) * MIX[Instrument.TUBA],
          attackSec: 0.06,
          releaseSec: 0.3,
          pan: pan * 0.3,
        });
      }
    }

    fire.beat(notes, { timeSec, untilSec: until, size: a, pan });

    if (i % 4 === 0 && lv > 0.05) {
      notes.push({
        timeSec,
        durationSec: 4 * timeline.beatSec + 0.05,
        instrument: Instrument.CELLO,
        part: Part.FRONT,
        midi: minorDegree(36, Math.round(lv * 8), KEY_TONIC),
        gain: velocityGain(35 + 40 * lv) * MIX[Instrument.CELLO],
        attackSec: 0.2,
        releaseSec: 0.3,
        pan: -0.35,
      });
    }

    // Records strike the timpani, but not during the build into the blast, which has its own roll.
    const inBuild = timeSec > peakSec - BLAST.buildSec - 0.5 && timeSec <= peakSec + 1;
    const clearRecord = day.areaKm2 > amax * 0.25 && day.areaKm2 > record * (1 + RECORD.rise);
    if (clearRecord && !inBuild && timeSec - lastStrokeSec >= RECORD.gapSec) {
      record = day.areaKm2;
      lastStrokeSec = timeSec;
      notes.push({
        timeSec,
        durationSec: 1.1,
        instrument: Instrument.TIMPANI,
        part: Part.RECORD,
        midi: 36,
        gain: velocityGain(85 + 35 * a) * MIX[Instrument.TIMPANI],
        attackSec: 0.002,
        releaseSec: 0.8,
      });
    }
  });

  blast(notes, peakSec);
  return clipToTrack(notes, durationSec);
}
