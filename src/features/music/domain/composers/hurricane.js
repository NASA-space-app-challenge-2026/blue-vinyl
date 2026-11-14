// Composer for the hot oceans album: one hurricane a track, its wind as the speed of its drums (see
// docs/albums/hot-oceans.md). The earlier single-storm album's band (nell-v2, "Chasing the Rising Storm") without its
// melody.
//
//   wind: the tempo, in proportion to the wind (tempoOf), set at each beat: a wind three times as strong plays three
//     times as fast. A percussion family of the track's own (its Kit) plays one beat all track long, so the speed is
//     all that changes; at the storm's peak a single cymbal crashes, once, the loudest sound of the track, and rings out.
//     Behind it a bass and a pad strike each bar and strings circle a fixed minor progression, a part joining at each
//     category. The whole band fades in and out with the storm on the globe (stormFadeAt).

import { CC, Instrument } from '../instruments.js';
import {
  StormCategory,
  atLeast,
  categoryOf,
  easeSpin,
  intensityOf,
  spinOf,
  stormFadeAt,
} from '../../../tracks/domain/storm-track.js';

const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
// The tempo at the album's strongest wind, as fast as a drummer can still play the beats below; every other wind plays in
// proportion to it.
const FASTEST_BPM = 200;
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

// How a drum is struck, by the letter that writes it in a kit's tab: its velocity, and `grace` strokes played quickly
// into it (a flam has one). '.' is a rest.
const Stroke = Object.freeze({
  X: Object.freeze({ velocity: 112, grace: 0 }),
  x: Object.freeze({ velocity: 84, grace: 0 }),
  g: Object.freeze({ velocity: 36, grace: 0 }),
  F: Object.freeze({ velocity: 112, grace: 1 }),
});
// Grace strokes: each this long (s) at any tempo, and this loud.
const GRACE = Object.freeze({ sec: 0.03, velocity: 52 });
// The cymbal at the storm's peak: on a channel of its own at full volume, as loud as a drum can be struck, bent down
// `bendSemitones` so it sounds bigger and rings longer, and held `ringSec` so it rings out to the end of its sample.
const PEAK = Object.freeze({ velocity: 127, bendSemitones: -4, ringSec: 6 });

// Each kit's pieces, by their key on the kit. Those that `ring` play on the kit's second channel, panned to the storm's
// turn, so they swirl round the listener; the rest keep the middle.
const DrumSetPiece = Object.freeze({
  KICK: { key: 36, ring: false },
  SNARE: { key: 38, ring: false },
  RIDE: { key: 51, ring: true },
  CRASH: { key: 49, ring: true },
});
const LatinPiece = Object.freeze({
  CLAVE: { key: 75, ring: false },
  COWBELL: { key: 56, ring: false },
  CONGA_MUTE: { key: 62, ring: true },
  CONGA_OPEN: { key: 63, ring: true },
  TUMBA: { key: 64, ring: true },
  CRASH: { key: 49, ring: true },
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
// The orchestral kit's timpani tuned to D and A, its concert snare and its crash cymbal (key 57: its orchestral
// cymbal on 59 dies away in 2.3 s, the crash rings for 3.8).
const OrchestraPiece = Object.freeze({
  SNARE: { key: 38, ring: false },
  TIMPANI_D: { key: 50, ring: true },
  TIMPANI_A: { key: 45, ring: true },
  CRASH: { key: 57, ring: true },
});

/**
 * The percussion families a storm can be played on: its drum `inst`; `volume`, which evens out how loud the kits play
 * as the foreground; `bar`, the one beat it plays all track long, a drummer's tab, a piece to 16 steps; and `peak`,
 * the cymbal it crashes once on the downbeat of the bar the storm peaks in (see PEAK). The beats are the earlier album's
 * major-hurricane grooves, which a drummer can still play at FASTEST_BPM.
 */
export const Kit = Object.freeze({
  // A rock drummer: the ride keeps the time over the kick on 3 + 3 + 2 and flams on the backbeat; a crash at the peak.
  DRUM_SET: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 89,
    peak: DrumSetPiece.CRASH,
    bar: [
      [DrumSetPiece.KICK, 'X.....X...X..x..'],
      [DrumSetPiece.SNARE, '....F..g.g..F.gg'],
      [DrumSetPiece.RIDE, 'x.x.x.x.x.x.x.x.'],
    ],
  }),
  // A salsa section on the 3-2 son clave, the bar read in cut time: the conga's tumbao with a flam on the slap, the
  // bongo bell in eighths; a crash at the peak.
  LATIN: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 127,
    peak: LatinPiece.CRASH,
    bar: [
      [LatinPiece.CLAVE, 'X..X..X...X.X...'],
      [LatinPiece.CONGA_MUTE, 'g.g.F.g.g.g.....'],
      [LatinPiece.CONGA_OPEN, '............x...'],
      [LatinPiece.TUMBA, '..............X.'],
      [LatinPiece.COWBELL, 'X.x.x.x.X.x.x.x.'],
    ],
  }),
  // A marching drumline, every piece together on the eighths: the basses' pulse and splits under the snare's flams,
  // the tenors sweeping round their drums; the cymbals crash at the peak.
  DRUMLINE: Object.freeze({
    inst: Instrument.POWER_KIT,
    volume: 71,
    peak: DrumlinePiece.CYMBALS,
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
  }),
  // An orchestra's timpani and snare: the timpani rocking between D and A in eighths under the snare's flams and ghost
  // strokes; a crash at the peak.
  ORCHESTRA: Object.freeze({
    inst: Instrument.ORCHESTRAL_KIT,
    volume: 98,
    peak: OrchestraPiece.CRASH,
    bar: [
      [OrchestraPiece.TIMPANI_D, 'X...x...X...x...'],
      [OrchestraPiece.TIMPANI_A, '..x...x...x...x.'],
      [OrchestraPiece.SNARE, 'F.ggx.g.F.ggx.gg'],
    ],
  }),
});
// Every kit's tabs are well formed.
for (const [name, kit] of Object.entries(Kit)) {
  for (const [, tab] of kit.bar) {
    if (tab.length !== STEPS_PER_BAR || [...tab].some((letter) => letter !== '.' && !Stroke[letter])) {
      throw new Error(`${name}: bad drum tab ${tab}`);
    }
  }
}

// The kit's two channels (see the pieces' `ring`); each song puts its kit on both.
const KIT_MIDDLE = Object.freeze({ program: 0, volume: 100, drums: true });
const KIT_RING = Object.freeze({ program: 0, volume: 100, drums: true });

// The peak's cymbal plays alone on this channel, at full volume in the middle.
const KIT_PEAK = Object.freeze({ program: 0, volume: 127, drums: true });

function channelOf(piece) {
  return piece.ring ? KIT_RING : KIT_MIDDLE;
}

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
 * The tempo (beats a minute) for a wind of `kt`, in proportion to it: FASTEST_BPM at the album's strongest wind
 * (`fastestKt`, over every record of every track), so 80 km/h plays a third as fast as 240 km/h.
 *
 * @param {number} kt
 * @param {number} fastestKt
 */
export function tempoOf(kt, fastestKt) {
  return (FASTEST_BPM * kt) / fastestKt;
}

/**
 * @typedef {Object} StormSong
 * @property {import('../../../tracks/domain/storm-track.js').StormTrack} track
 * @property {Object} kit one of Kit
 * @property {number} fastestKt the album's strongest wind (see tempoOf)
 */

export class HurricaneComposer {
  instruments = Object.freeze([KIT_MIDDLE, KIT_RING, KIT_PEAK, ...new Set(PARTS.map((part) => part.inst))]);

  stepsPerBar = STEPS_PER_BAR;
  // The pitch wheel bends as far as the peak's cymbal does.
  bendRangeSemitones = Math.abs(PEAK.bendSemitones);
  // The tempo follows the wind every beat, so it rises and falls with it even while a slow bar lasts several seconds.
  stepsPerTempo = STEPS_PER_BEAT;
  // A beat a second, for a step no storm sets the tempo of.
  stepSec = 1 / STEPS_PER_BEAT;

  /** @param {StormSong} song */
  setSong(song) {
    this.kit = song.kit;
    this.fastestKt = song.fastestKt;
    // The storm's peak: its first record at its strongest wind.
    const { t, windKt } = song.track;
    this.peakTime = t[windKt.indexOf(Math.max(...windKt))];
    this.startMs = t[0];
    this.msPerSec = song.msPerSec;
    this.durationSec = (t[t.length - 1] - t[0]) / song.msPerSec;
  }

  /** Back to the opening state, as the music starts. */
  reset() {
    this.kitDue = true;
    this.chordIndex = -1;
    this.chordBars = 0;
    this.chordBar = 0;
    this.chord = PROGRESSION[0];
    this.category = StormCategory.DEPRESSION;
    this.peaks = false;
    this.held = new Set();
    this.spin = 0;
    this.spinRate = null;
    this.expression = null;
  }

  /** The step length from `sample` on: its tempo is the wind's. */
  stepSecAt(sample) {
    return 60 / tempoOf(sample.windKt, this.fastestKt) / STEPS_PER_BEAT;
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
      music.program(KIT_PEAK, { program: this.kit.inst.program, volume: KIT_PEAK.volume }, at);
      music.bend(KIT_PEAK, PEAK.bendSemitones, at);
      for (const part of PARTS) if (part.pan !== undefined) music.control(part.inst, CC.PAN, part.pan, at);
      this.kitDue = false;
    }
    if (step === 0) this.startBar(time, stepSec, stepMs);
    this.spinRate = easeSpin(this.spinRate, spinOf(intensityOf(sample.windKt)), stepSec);
    this.spin += stepSec * this.spinRate;
    this.fade(music, time, at);
    this.playKit(music, step, at);
    this.playParts(music, step, at);
  }

  // Every channel's expression follows the storm's fade on the globe at the data time `time`.
  fade(music, time, at) {
    const expression = Math.round(127 * stormFadeAt((time - this.startMs) / this.msPerSec, this.durationSec));
    if (expression === this.expression) return;
    this.expression = expression;
    for (const inst of this.instruments) music.control(inst, CC.EXPRESSION, expression, at);
  }

  // Moves on a bar starting at data time `time`. A chord lasts as many bars as CHORD_MIN_SEC takes at the tempo it
  // starts at. The bar the storm peaks in opens with the peak's cymbal.
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
    this.peaks = this.peakTime >= time && this.peakTime < time + STEPS_PER_BAR * stepMs;
    this.held.clear();
  }

  // The kit's ringing pieces panned to the storm's turn every step, the strokes the beat writes for it, and the peak's
  // cymbal on the downbeat of the bar the storm peaks in.
  playKit(music, step, at) {
    music.control(KIT_RING, CC.PAN, Math.round(64 + 63 * Math.cos(this.spin)), at);
    for (const [piece, tab] of this.kit.bar) {
      const stroke = Stroke[tab[step]];
      if (!stroke) continue;
      const channel = channelOf(piece);
      for (let k = 0; k < stroke.grace; k++) music.note(channel, piece.key, GRACE.velocity, at + k * GRACE.sec, 1);
      music.note(channel, piece.key, stroke.velocity, at + stroke.grace * GRACE.sec, 1);
    }
    if (this.peaks && step === 0) {
      const { key } = this.kit.peak;
      music.hold(KIT_PEAK, key, PEAK.velocity, at);
      music.release(KIT_PEAK, key, at + PEAK.ringSec);
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
