// Composer for the hot oceans album: one hurricane a track, its wind as the speed of its drums (see
// docs/albums/hot-oceans.md). The earlier single-storm album's band (nell-v2, "Chasing the Rising Storm") without its
// melody.
//
//   wind: the tempo, on one straight line from the album's weakest wind to its strongest (tempoOf), set at each bar. A
//     percussion family of the track's own (its Kit) plays one beat all track long, so the speed is all that changes;
//     at the storm's peak it plays its fill, once. Behind it a bass and a pad strike each bar and strings circle a
//     fixed minor progression, a part joining at each category.

import { CC, Instrument } from '../instruments.js';
import { StormCategory, atLeast, categoryOf, easeSpin, intensityOf, spinOf } from '../../../tracks/domain/storm-track.js';

const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
// The tempo's line: `slowBpm` at the album's weakest wind, `fastBpm` at its strongest, as fast as a drummer can still
// play the beats below.
const TEMPO = Object.freeze({ slowBpm: 60, fastBpm: 200 });
// A chord lasts at least this long (s), over as many bars as that takes at the tempo it starts at.
const CHORD_MIN_SEC = 2;

// D minor. The chords as semitones above TONIC, root first: i – VI – III – VII.
const TONIC = 62;
const PROGRESSION = Object.freeze([
  [0, 3, 7],
  [-4, 0, 3],
  [3, 7, 10],
  [-2, 2, 5],
]);
// The circling figure's steps through a chord spread over two octaves: up and back down.
const CIRCLE = Object.freeze([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
// The strings circle in the finest of these note spacings (steps) whose notes stay STRING_MIN_SEC apart.
const STRING_SPACINGS = Object.freeze([1, 2, 4]);
const STRING_MIN_SEC = 0.1;
// The strings' notes fall in groups of 3 + 3 + 2, each group's first note louder, so they drive rather than whir.
const STRING_GROUPS = Object.freeze({ every: 8, accents: [0, 3, 6], accent: 18 });

// How a drum is struck, by the letter that writes it in a kit's tab: its velocity, `grace` strokes played quickly into
// it (a flam has one, a drag two), or a `roll` through the step (see ROLL). '.' is a rest.
const Stroke = Object.freeze({
  X: Object.freeze({ velocity: 112, grace: 0 }),
  x: Object.freeze({ velocity: 84, grace: 0 }),
  g: Object.freeze({ velocity: 36, grace: 0 }),
  F: Object.freeze({ velocity: 112, grace: 1 }),
  D: Object.freeze({ velocity: 112, grace: 2 }),
  r: Object.freeze({ roll: true }),
});
// Grace strokes: each this long (s) at any tempo, and this loud.
const GRACE = Object.freeze({ sec: 0.03, velocity: 52 });
// A roll's strokes a second at any tempo, swelling from `from` to `to` velocity across the bar.
const ROLL = Object.freeze({ perSec: 24, from: 48, to: 120 });

// Each kit's pieces, by their key on the kit. Those that `ring` play on the kit's second channel, panned to the storm's
// turn, so they swirl round the listener; the rest keep the middle.
const DrumSetPiece = Object.freeze({
  KICK: { key: 36, ring: false },
  SNARE: { key: 38, ring: false },
  HIGH_TOM: { key: 50, ring: true },
  MID_TOM: { key: 47, ring: true },
  LOW_TOM: { key: 43, ring: true },
  FLOOR_TOM: { key: 41, ring: true },
  RIDE: { key: 51, ring: true },
});
const LatinPiece = Object.freeze({
  CLAVE: { key: 75, ring: false },
  COWBELL: { key: 56, ring: false },
  CONGA_MUTE: { key: 62, ring: true },
  CONGA_OPEN: { key: 63, ring: true },
  TUMBA: { key: 64, ring: true },
  TIMBALE_HIGH: { key: 65, ring: true },
  TIMBALE_LOW: { key: 66, ring: true },
});
const DrumlinePiece = Object.freeze({
  SNARE: { key: 38, ring: false },
  BASS: { key: 36, ring: false },
  BASS_HIGH: { key: 43, ring: true },
  BASS_LOW: { key: 41, ring: true },
  TENOR_1: { key: 50, ring: true },
  TENOR_2: { key: 48, ring: true },
  TENOR_3: { key: 47, ring: true },
  TENOR_4: { key: 45, ring: true },
  CYMBALS: { key: 49, ring: true },
});
// The orchestral kit's timpani tuned to D, C, A and G, and its concert snare.
const OrchestraPiece = Object.freeze({
  SNARE: { key: 38, ring: false },
  TIMPANI_D: { key: 50, ring: true },
  TIMPANI_C: { key: 48, ring: true },
  TIMPANI_A: { key: 45, ring: true },
  TIMPANI_G: { key: 43, ring: true },
});

/**
 * The percussion families a storm can be played on: its drum `inst`; `volume`, which evens out how loud the kits play
 * as the foreground; `bar`, the one beat it plays all track long; and `fill`, the bar it plays once, in the beat's
 * place, at the storm's peak. Each is a drummer's tab, a piece to 16 steps. The beats are the earlier album's
 * major-hurricane grooves, which a drummer can still play at TEMPO.fastBpm; the fills are its category 5 fills.
 */
export const Kit = Object.freeze({
  // A rock drummer: the ride keeps the time over the kick on 3 + 3 + 2 and flams on the backbeat; at the peak, a run
  // down the toms into a snare roll.
  DRUM_SET: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 89,
    bar: [
      [DrumSetPiece.KICK, 'X.....X...X..x..'],
      [DrumSetPiece.SNARE, '....F..g.g..F.gg'],
      [DrumSetPiece.RIDE, 'x.x.x.x.x.x.x.x.'],
    ],
    fill: [
      [DrumSetPiece.KICK, 'X...X...X.......'],
      [DrumSetPiece.HIGH_TOM, 'Xx..............'],
      [DrumSetPiece.MID_TOM, '..Xx............'],
      [DrumSetPiece.LOW_TOM, '....Xx..........'],
      [DrumSetPiece.FLOOR_TOM, '......Xx........'],
      [DrumSetPiece.SNARE, '........rrrrrrrr'],
    ],
  }),
  // A salsa section on the 3-2 son clave, the bar read in cut time: the conga's tumbao with a flam on the slap, the
  // bongo bell in eighths; at the peak, the timbales and congas run down into a timbale roll.
  LATIN: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 127,
    bar: [
      [LatinPiece.CLAVE, 'X..X..X...X.X...'],
      [LatinPiece.CONGA_MUTE, 'g.g.F.g.g.g.....'],
      [LatinPiece.CONGA_OPEN, '............x...'],
      [LatinPiece.TUMBA, '..............X.'],
      [LatinPiece.COWBELL, 'X.x.x.x.X.x.x.x.'],
    ],
    fill: [
      [LatinPiece.CLAVE, 'X...............'],
      [LatinPiece.TIMBALE_HIGH, 'Xx..............'],
      [LatinPiece.TIMBALE_LOW, '..Xx............'],
      [LatinPiece.CONGA_OPEN, '....Xx..........'],
      [LatinPiece.TUMBA, '......Xx........'],
      [LatinPiece.TIMBALE_LOW, '........rrrrrrrr'],
    ],
  }),
  // A marching drumline, every piece together on the eighths: the basses' pulse and splits under the snare's flams,
  // the tenors sweeping round their drums; at the peak, the tenors sweep the whole bar under the cymbals.
  DRUMLINE: Object.freeze({
    inst: Instrument.POWER_KIT,
    volume: 71,
    bar: [
      [DrumlinePiece.BASS, 'X.......X.......'],
      [DrumlinePiece.BASS_HIGH, '..x...X.....X...'],
      [DrumlinePiece.BASS_LOW, '......X...X...X.'],
      [DrumlinePiece.SNARE, 'F.g.X.g.F.g.X.g.'],
      [DrumlinePiece.TENOR_1, 'x.......x.......'],
      [DrumlinePiece.TENOR_2, '..x.......x.....'],
      [DrumlinePiece.TENOR_3, '....x.......x...'],
      [DrumlinePiece.TENOR_4, '......x.......x.'],
    ],
    fill: [
      [DrumlinePiece.BASS, 'X...X...X...X...'],
      [DrumlinePiece.TENOR_1, 'X.x.............'],
      [DrumlinePiece.TENOR_2, '....X.x.........'],
      [DrumlinePiece.TENOR_3, '........X.x.....'],
      [DrumlinePiece.TENOR_4, '............X.X.'],
      [DrumlinePiece.CYMBALS, '........x...X...'],
    ],
  }),
  // An orchestra's timpani and snare alone: the timpani rocking between D and A in eighths under the snare's flams and
  // ghost strokes; at the peak, the timpani fall D, C, A, G into a timpani and snare roll.
  ORCHESTRA: Object.freeze({
    inst: Instrument.ORCHESTRAL_KIT,
    volume: 98,
    bar: [
      [OrchestraPiece.TIMPANI_D, 'X...x...X...x...'],
      [OrchestraPiece.TIMPANI_A, '..x...x...x...x.'],
      [OrchestraPiece.SNARE, 'F.ggx.g.F.ggx.gg'],
    ],
    fill: [
      [OrchestraPiece.TIMPANI_D, 'Xx......rrrrrrrr'],
      [OrchestraPiece.TIMPANI_C, '..Xx............'],
      [OrchestraPiece.TIMPANI_A, '....Xx..........'],
      [OrchestraPiece.TIMPANI_G, '......Xx........'],
      [OrchestraPiece.SNARE, '........rrrrrrrr'],
    ],
  }),
});
// Every kit's tabs are well formed.
for (const [name, kit] of Object.entries(Kit)) {
  for (const [, tab] of [...kit.bar, ...kit.fill]) {
    if (tab.length !== STEPS_PER_BAR || [...tab].some((letter) => letter !== '.' && !Stroke[letter])) {
      throw new Error(`${name}: bad drum tab ${tab}`);
    }
  }
}

// The kit's two channels (see the pieces' `ring`); each song puts its kit on both.
const KIT_MIDDLE = Object.freeze({ program: 0, volume: 100, drums: true });
const KIT_RING = Object.freeze({ program: 0, volume: 100, drums: true });

// The band, each part playing from its category up. A part either holds the bar's chord (`hold`: octave offsets of its
// notes from TONIC) or circles it (`circle`: the octave it starts in, `turn`, how far round the circle it starts,
// `slower`, how many string notes each of its notes lasts, and `pan`, its fixed seat).
const PARTS = Object.freeze([
  { from: StormCategory.DEPRESSION, inst: Instrument.DOUBLE_BASS, hold: [-24], velocity: 70 },
  { from: StormCategory.DEPRESSION, inst: Instrument.PAD, hold: [-12, -12, -12], velocity: 56 },
  { from: StormCategory.STORM, inst: Instrument.CELLO, circle: -24, turn: 0, slower: 2, pan: 64, velocity: 52 },
  { from: StormCategory.CAT1, inst: Instrument.VIOLA, circle: -12, turn: 0, slower: 1, pan: 32, velocity: 42 },
  { from: StormCategory.CAT2, inst: Instrument.VIOLIN, circle: 0, turn: 5, slower: 1, pan: 96, velocity: 38 },
  { from: StormCategory.CAT3, inst: Instrument.VOICE_OOHS, hold: [0, 0, 0], velocity: 64 },
]);

/**
 * The album's weakest and strongest wind (kt), over every record of every track: the ends of the tempo's line.
 *
 * @typedef {{ minKt: number, maxKt: number }} WindRange
 */

/**
 * The tempo (beats a minute) for a wind of `kt`: on the line from TEMPO.slowBpm at the album's weakest wind to
 * TEMPO.fastBpm at its strongest.
 *
 * @param {number} kt
 * @param {WindRange} range
 */
export function tempoOf(kt, range) {
  const share = range.maxKt > range.minKt ? (kt - range.minKt) / (range.maxKt - range.minKt) : 1;
  return TEMPO.slowBpm + (TEMPO.fastBpm - TEMPO.slowBpm) * Math.min(1, Math.max(0, share));
}

/**
 * @typedef {Object} StormSong
 * @property {import('../../../tracks/domain/storm-track.js').StormTrack} track
 * @property {Object} kit one of Kit
 * @property {WindRange} windRange the album's (see tempoOf)
 */

export class HurricaneComposer {
  instruments = Object.freeze([KIT_MIDDLE, KIT_RING, ...new Set(PARTS.map((part) => part.inst))]);

  stepsPerBar = STEPS_PER_BAR;
  // A bar at the slowest tempo, for a step no storm sets the tempo of.
  stepSec = 60 / TEMPO.slowBpm / STEPS_PER_BEAT;

  /** @param {StormSong} song */
  setSong(song) {
    this.kit = song.kit;
    this.windRange = song.windRange;
    // The storm's peak: its first record at its strongest wind.
    const { t, windKt } = song.track;
    this.peakTime = t[windKt.indexOf(Math.max(...windKt))];
  }

  /** Back to the opening state, as the music starts. */
  reset() {
    this.kitDue = true;
    this.chordIndex = -1;
    this.chordBars = 0;
    this.chordBar = 0;
    this.chord = PROGRESSION[0];
    this.category = StormCategory.DEPRESSION;
    this.tabs = this.kit.bar;
    this.held = new Set();
    this.spin = 0;
    this.spinRate = null;
  }

  /** The step length of the bar starting with `sample`: its tempo is the wind's. */
  stepSecAt(sample) {
    return 60 / tempoOf(sample.windKt, this.windRange) / STEPS_PER_BEAT;
  }

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ sample: import('../../../tracks/domain/storm-track.js').StormSample, time: number, step: number,
   *   at: number, stepSec: number, stepMs: number }} now
   */
  playStep(music, { sample, time, step, at, stepSec, stepMs }) {
    this.category = categoryOf(sample.windKt);
    if (this.kitDue) {
      const sound = { program: this.kit.inst.program, volume: this.kit.volume };
      music.program(KIT_MIDDLE, sound, at);
      music.program(KIT_RING, sound, at);
      for (const part of PARTS) if (part.pan !== undefined) music.control(part.inst, CC.PAN, part.pan, at);
      this.kitDue = false;
    }
    if (step === 0) this.startBar(time, stepSec, stepMs);
    this.spinRate = easeSpin(this.spinRate, spinOf(intensityOf(sample.windKt)), stepSec);
    this.spin += stepSec * this.spinRate;
    this.playKit(music, step, at, stepSec);
    this.playParts(music, step, at);
  }

  // Moves on a bar starting at data time `time`. A chord lasts as many bars as CHORD_MIN_SEC takes at the tempo it
  // starts at. The bar the storm peaks in is the fill.
  startBar(time, stepSec, stepMs) {
    if (this.chordBar + 1 >= this.chordBars) {
      this.chordIndex = (this.chordIndex + 1) % PROGRESSION.length;
      this.chordBars = Math.max(1, Math.ceil(CHORD_MIN_SEC / (STEPS_PER_BAR * stepSec) - 1e-9));
      this.chordBar = 0;
    } else {
      this.chordBar++;
    }
    this.chord = PROGRESSION[this.chordIndex];
    this.stringEvery = STRING_SPACINGS.find((every) => every * stepSec >= STRING_MIN_SEC) ?? STRING_SPACINGS.at(-1);
    const peaks = this.peakTime >= time && this.peakTime < time + STEPS_PER_BAR * stepMs;
    this.tabs = peaks ? this.kit.fill : this.kit.bar;
    this.held.clear();
  }

  // The kit's ringing pieces panned to the storm's turn every step, and the strokes the bar's tabs write for it.
  playKit(music, step, at, stepSec) {
    music.control(KIT_RING, CC.PAN, Math.round(64 + 63 * Math.cos(this.spin)), at);
    for (const [piece, tab] of this.tabs) {
      const stroke = Stroke[tab[step]];
      if (!stroke) continue;
      const channel = piece.ring ? KIT_RING : KIT_MIDDLE;
      if (stroke.roll) {
        this.playRoll(music, channel, piece.key, step, at, stepSec);
        continue;
      }
      for (let k = 0; k < stroke.grace; k++) music.note(channel, piece.key, GRACE.velocity, at + k * GRACE.sec, 1);
      music.note(channel, piece.key, stroke.velocity, at + stroke.grace * GRACE.sec, 1);
    }
  }

  // A roll through this step at ROLL's pace whatever the tempo, as loud as its place in the bar's swell.
  playRoll(music, channel, key, step, at, stepSec) {
    const count = Math.max(1, Math.round(stepSec * ROLL.perSec));
    for (let k = 0; k < count; k++) {
      const place = (step + k / count) / STEPS_PER_BAR;
      music.note(channel, key, ROLL.from + (ROLL.to - ROLL.from) * place, at + (k / count) * stepSec, 1 / count);
    }
  }

  // The parts the storm's category calls for; a held part that comes in mid-bar holds for the rest of it.
  playParts(music, step, at) {
    for (const part of PARTS) {
      if (!atLeast(this.category, part.from)) continue;
      if (part.hold) {
        if (this.held.has(part)) continue;
        this.held.add(part);
        for (const [i, octave] of part.hold.entries()) {
          music.note(part.inst, TONIC + octave + this.chord[i], part.velocity, at, STEPS_PER_BAR - step);
        }
      } else if (step % (this.stringEvery * part.slower) === 0) {
        const every = this.stringEvery * part.slower;
        const tones = [0, 12].flatMap((octave) => this.chord.map((tone) => tone + octave));
        const count = step / every;
        const accented = STRING_GROUPS.accents.includes(count % STRING_GROUPS.every);
        const midi = TONIC + part.circle + tones[CIRCLE[(count + part.turn) % CIRCLE.length]];
        music.note(part.inst, midi, part.velocity + (accented ? STRING_GROUPS.accent : 0), at, every);
      }
    }
  }
}
