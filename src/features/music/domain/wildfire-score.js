import { yearStartSec } from '../../tracks/domain/year-timeline.js';
import { seasonDays } from '../../tracks/domain/wildfire-series.js';
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
// blast lands on the largest (2015, and 2020 within 1% of it). Under them, the year's largest MTBS fires (the ones the
// globe shows) are plucked as they start, through the bar the way they started through the year: higher and louder
// the larger, from the left in the West to the right in the East, so a big year crackles and a small one barely does.
//
// Track 2 — 2020 season, played from what its globe shows: a day a sixteenth note over C minor's i – VI – iv – v. The
// fire burning that day (every fire's heat, as the globe draws it) sets how dense the drums are, how high and loud the
// trombone (+ tuba when heavy) and how loud the roar; each new fire is plucked as its scar first shows; strings swell
// with the land burned so far. The blast lands on the hottest day (9 September).

/** FluidR3_GM instrument file names (see soundfont-bank.js). */
export const Instrument = Object.freeze({
  FRENCH_HORN: 'french_horn',
  TROMBONE: 'trombone',
  TUBA: 'tuba',
  CELLO: 'cello',
  CONTRABASS: 'contrabass',
  TIMPANI: 'timpani',
  TAIKO: 'taiko_drum',
  TOM: 'melodic_tom',
  REVERSE_CYMBAL: 'reverse_cymbal',
  HARP: 'orchestral_harp',
  PIZZICATO: 'pizzicato_strings',
  // The fire's roar: a low wash of sea noise.
  ROAR: 'seashore',
});

export const Part = Object.freeze({
  ACRES: 'acres',
  TREND: 'trend',
  BURN: 'burn',
  GROOVE: 'groove',
  SCAR: 'scar',
  RECORD: 'record',
  ROAR: 'roar',
  BUILD: 'build',
  BLAST: 'blast',
  IGNITE: 'ignite',
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
  [Instrument.TAIKO]: 1.2,
  [Instrument.TOM]: 0.8,
  [Instrument.REVERSE_CYMBAL]: 1.6,
  [Instrument.ROAR]: 1.3,
  [Instrument.HARP]: 0.8,
  // A pluck's first 150 ms is about 1.5 times as loud as the horn's: the largest fire's stays about 6 dB under it.
  [Instrument.PIZZICATO]: 0.5,
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

// Track 1: fires of at least `minKm2` (50,000 acres; 1 to 46 a year) are plucked; `fullKm2` (1,000,000 acres) is the
// top of the scale. Fires that start within `gapSec` of each other (about five days) are plucked together, the largest
// `chord` of them at once. Plucks within `crowdSec` of each other share one pluck's loudness.
const IGNITE = Object.freeze({ minKm2: 202, fullKm2: 4047, gapSec: 0.01, chord: 3, steps: 9, crowdSec: 0.025 });

// Track 2: sixteen days a bar. The trombone plays from `mainFrom` of the hottest day's fire (see seasonScore's fireOf),
// on `mainSteps` chord tones from G2; the tuba joins from `tubaFrom`. The cellos join the bass as the land burned so
// far reaches `scarFifth` and `scarThird` of the season's. New fires are plucked on `igniteSteps` chord tones from C4,
// from `igniteKm2.min` (FEDS's large-fire floor) to `igniteKm2.full`.
const SEASON = Object.freeze({
  daysPerBar: 16,
  mainFrom: 0.12,
  mainSteps: 8,
  tubaFrom: 0.6,
  scarFifth: 0.15,
  scarThird: 0.45,
  igniteSteps: 6,
  igniteKm2: { min: 50, full: 2000 },
});

// Track 2's harmony, as pitch classes in C minor, root first: a chord a bar.
const Chord = Object.freeze({
  I: Object.freeze([0, 3, 7]),
  VI: Object.freeze([8, 0, 3]),
  IV: Object.freeze([5, 8, 0]),
  V: Object.freeze([7, 10, 2]),
});
const PROGRESSION = Object.freeze([Chord.I, Chord.VI, Chord.IV, Chord.V]);

// Track 2's drums, step by step through the bar: a step is struck once the day's fire (0..1) reaches `fire`. Little
// fire strikes the downbeat; more adds the half bar, then taiko in 3 + 3 + 2, then toms on the eighths, then every
// sixteenth.
const GROOVE = Object.freeze(
  [
    [0.03, Instrument.TIMPANI, 36, 1],
    [0.75, Instrument.TOM, 55, 0.5],
    [0.5, Instrument.TOM, 50, 0.65],
    [0.3, Instrument.TAIKO, 43, 0.8],
    [0.5, Instrument.TOM, 50, 0.65],
    [0.75, Instrument.TOM, 55, 0.5],
    [0.3, Instrument.TAIKO, 43, 0.8],
    [0.75, Instrument.TOM, 55, 0.5],
    [0.15, Instrument.TAIKO, 36, 0.95],
    [0.75, Instrument.TOM, 55, 0.5],
    [0.5, Instrument.TOM, 50, 0.65],
    [0.3, Instrument.TAIKO, 43, 0.8],
    [0.5, Instrument.TOM, 50, 0.65],
    [0.75, Instrument.TOM, 55, 0.5],
    [0.3, Instrument.TAIKO, 43, 0.8],
    [0.75, Instrument.TOM, 55, 0.5],
  ].map(([fire, instrument, midi, accent]) => Object.freeze({ fire, instrument, midi, accent })),
);

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
const dbGain = (db) => 10 ** (db / 20);
const lerp = (range, t) => range.min + (range.max - range.min) * t;
// The lowest MIDI note at or above `lo` of pitch class `pc`.
const above = (pc, lo) => lo + ((((pc - lo) % 12) + 12) % 12);
// `count` tones of `chord` rising from `lo`.
function chordLadder(chord, lo, count) {
  const ladder = [];
  for (let midi = lo; ladder.length < count; midi++) if (chord.includes(midi % 12)) ladder.push(midi);
  return ladder;
}
// West (left) to east (right) across the CONUS, in tenths, so notes at one place share a panner.
const panOfLon = (lon) => Math.round(clamp(((lon + 125) / 60) * 2 - 1, -0.8, 0.8) * 10) / 10;

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
  // The fires still starting (the plucks) are not silenced: they are the data. Track 2's drums rest with the roar.
  const fire = new Set([Part.ROAR, Part.GROOVE]);
  const held = new Set([Part.ROAR, Part.ACRES, Part.TREND, Part.BURN, Part.SCAR]);
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
 * Track 1's plucks: each of a year's large fires as it starts, as far into the bar as it started into its year (the
 * globe lights it then too).
 *
 * @param {import('./ice-sea-score.js').NoteEvent[]} notes
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireYearFire[]} fires
 * @param {number} barSec when the year's bar starts
 * @param {number} beatSec how long it lasts
 */
function ignite(notes, fires, barSec, beatSec) {
  const large = fires.filter((f) => f.areaKm2 >= IGNITE.minKm2).sort((a, b) => a.yearShare - b.yearShare);
  /** @type {import('../../tracks/domain/wildfire-series.js').WildfireYearFire[][]} */
  const groups = [];
  for (const fire of large) {
    const group = groups.at(-1);
    if (group && (fire.yearShare - group[0].yearShare) * beatSec < IGNITE.gapSec) group.push(fire);
    else groups.push([fire]);
  }
  const plucks = [];
  for (const group of groups) {
    const timeSec = barSec + group[0].yearShare * beatSec;
    const largest = [...group].sort((a, b) => b.areaKm2 - a.areaKm2).slice(0, IGNITE.chord);
    for (const fire of largest) plucks.push(pluck(fire, timeSec));
  }
  // Where plucks crowd (a summer's outbreak), each is softer, so together they sound about as loud as one: the burst
  // is heard as many, not as louder than the horn.
  for (const note of plucks) {
    const crowd = plucks.filter((other) => Math.abs(other.timeSec - note.timeSec) <= IGNITE.crowdSec).length;
    note.gain /= Math.sqrt(crowd);
  }
  notes.push(...plucks);
}

// One fire's pluck: higher and louder the larger (on a log scale of its area), panned to where it burned.
function pluck(fire, timeSec) {
  const size = clamp(Math.log(fire.areaKm2 / IGNITE.minKm2) / Math.log(IGNITE.fullKm2 / IGNITE.minKm2), 0, 1);
  return {
    timeSec,
    durationSec: 0.1,
    instrument: Instrument.PIZZICATO,
    part: Part.IGNITE,
    midi: minorDegree(48, Math.round(size * IGNITE.steps), KEY_TONIC),
    gain: velocityGain(35 + 85 * size) * MIX[Instrument.PIZZICATO],
    attackSec: 0.003,
    releaseSec: 0.25,
    pan: panOfLon(fire.lon),
  };
}

/**
 * Track 1: US annual burned acres (5453), with each year's large MTBS fires plucked as they start.
 *
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireYear[]} years
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireYearFire[][]} firesByYear by year index
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline
 * @param {number} durationSec
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function annualBurnScore(years, firesByYear, timeline, durationSec) {
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
    ignite(notes, firesByYear[i] ?? [], timeSec, timeline.beatSec);

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
 * Track 2: the 2020 season's large fires day by day (FEDS / 5453 peak year), played from what the globe shows: how
 * much fire burns that day (each fire's heat, summed) and how much land has burned so far (every scar, summed).
 *
 * A day is a sixteenth note, sixteen days a bar, over C minor's i – VI – iv – v. The more fire burns, the denser the
 * drums, the higher and louder the trombone and the louder the roar; each new fire is plucked as its scar first shows;
 * the strings under them swell as the scars grow, and never fall back. The blast lands on the hottest day.
 *
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireDay[]} days
 * @param {import('../../tracks/domain/wildfire-series.js').WildfireFire[]} fires
 * @param {import('../../tracks/domain/year-timeline.js').YearTimeline} timeline read one beat a day
 * @param {number} durationSec
 * @returns {import('./ice-sea-score.js').NoteEvent[]}
 */
export function seasonScore(days, fires, timeline, durationSec) {
  const end = durationSec - timeline.tailSec;
  const season = seasonDays(fires, days.length);
  const bmax = Math.max(...season.map((d) => d.burning), 1e-6);
  const smax = Math.max(...season.map((d) => d.burnedKm2), 1e-6);
  const peakDay = season.findIndex((d) => d.burning === bmax);
  const peakSec = yearStartSec(timeline, peakDay);
  const peakBar = Math.floor(peakDay / SEASON.daysPerBar);
  const lastBar = Math.floor((days.length - 1) / SEASON.daysPerBar);
  // The hottest day falls in a bar of i, and the season ends on i.
  const chordAt = (bar) =>
    bar === lastBar ? Chord.I : PROGRESSION[(((bar - peakBar) % PROGRESSION.length) + PROGRESSION.length) % PROGRESSION.length];
  // How much fire burns, 0..1: the square root of the share of the hottest day, so a small fire is still heard.
  const fireOf = (d) => Math.sqrt(season[d].burning / bmax);
  /** @type {import('./ice-sea-score.js').NoteEvent[]} */
  const notes = [];
  const roar = createFire();
  const held = new Map();
  // A brass note carried on while the next one plays the same pitch.
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
  const untilOf = (d) => (d >= days.length - 1 ? end : yearStartSec(timeline, d + 1));

  season.forEach((day, d) => {
    const timeSec = yearStartSec(timeline, d);
    const step = d % SEASON.daysPerBar;
    const bar = Math.floor(d / SEASON.daysPerBar);
    const chord = chordAt(bar);
    const u = fireOf(d);
    const pan = day.burning > 0 ? panOfLon(day.lon) : 0;
    const inBuild = timeSec >= peakSec - BLAST.buildSec && timeSec < peakSec;

    // The strings under it all: a bar's chord, swelling with the land burned so far.
    if (step === 0) {
      const scar = season[d].burnedKm2 / smax;
      const barEnd = Math.min(end, yearStartSec(timeline, d + SEASON.daysPerBar));
      const voices = [[Instrument.CONTRABASS, above(chord[0], 33), -0.2]];
      if (scar >= SEASON.scarFifth) voices.push([Instrument.CELLO, above(chord[2], 48), -0.4]);
      if (scar >= SEASON.scarThird) voices.push([Instrument.CELLO, above(chord[1], 50), 0.4]);
      for (const [instrument, midi, voicePan] of voices) {
        notes.push({
          timeSec,
          durationSec: barEnd - timeSec + 0.1,
          instrument,
          part: Part.SCAR,
          midi,
          gain: velocityGain(45 + 55 * scar) * MIX[instrument],
          attackSec: 0.3,
          releaseSec: 0.5,
          pan: voicePan,
        });
      }
    }

    // The drums: the more fire, the more of the bar's sixteenths are struck; the downbeat strikes the chord's root on
    // the timpani. The build into the blast has its own roll.
    if (!inBuild && u >= GROOVE[step].fire) {
      const { instrument, midi, accent } = GROOVE[step];
      notes.push({
        timeSec,
        durationSec: 0.3,
        instrument,
        part: Part.GROOVE,
        midi: instrument === Instrument.TIMPANI ? above(chord[0], 36) : midi,
        gain: velocityGain((40 + 80 * u) * accent) * MIX[instrument],
        attackSec: 0.002,
        releaseSec: 0.4,
        pan: instrument === Instrument.TOM ? (step % 4 === 1 ? -0.3 : 0.3) : 0,
      });
    }

    // The trombone, an eighth note every two days: higher and louder as more fire burns, on the bar's chord; silent
    // while almost nothing burns. Tuba under the heaviest days.
    if (step % 2 === 0) {
      const u2 = Math.max(u, d + 1 < days.length ? fireOf(d + 1) : 0);
      const until = untilOf(Math.min(d + 1, days.length - 1));
      if (u2 < SEASON.mainFrom) held.clear();
      else {
        const ladder = chordLadder(chord, 43, SEASON.mainSteps);
        hold({
          timeSec,
          durationSec: until - timeSec,
          instrument: Instrument.TROMBONE,
          part: Part.BURN,
          midi: ladder[Math.round(u2 * (ladder.length - 1))],
          gain: velocityGain(50 + 75 * u2) * MIX[Instrument.TROMBONE],
          attackSec: 0.03,
          releaseSec: 0.22,
          pan: pan * 0.4,
        });
        if (u2 < SEASON.tubaFrom) held.delete(Instrument.TUBA);
        else {
          hold({
            timeSec,
            durationSec: until - timeSec,
            instrument: Instrument.TUBA,
            part: Part.BURN,
            midi: above(chord[0], 31),
            gain: velocityGain(40 + 60 * u2) * MIX[Instrument.TUBA],
            attackSec: 0.06,
            releaseSec: 0.3,
            pan: pan * 0.3,
          });
        }
      }
    }

    roar.beat(notes, { timeSec, untilSec: untilOf(d), size: day.burning / bmax, pan });

    // Each new fire plucked as its scar first shows, higher and louder the larger, where it burns.
    for (const fire of day.ignitions) {
      const size = clamp(Math.log(fire.areaKm2 / SEASON.igniteKm2.min) / Math.log(SEASON.igniteKm2.full / SEASON.igniteKm2.min), 0, 1);
      const ladder = chordLadder(chord, 60, SEASON.igniteSteps);
      notes.push({
        timeSec,
        durationSec: 0.1,
        instrument: Instrument.PIZZICATO,
        part: Part.IGNITE,
        midi: ladder[Math.round(size * (ladder.length - 1))],
        gain: (velocityGain(50 + 60 * size) * MIX[Instrument.PIZZICATO]) / Math.sqrt(day.ignitions.length),
        attackSec: 0.003,
        releaseSec: 0.25,
        pan: panOfLon(fire.lon),
      });
    }
  });

  blast(notes, peakSec);
  return clipToTrack(notes, durationSec);
}
