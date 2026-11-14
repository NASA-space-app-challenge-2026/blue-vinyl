// Composer for the hot oceans album: one hurricane a track, its wind against the sea under it (see
// docs/albums/hot-oceans.md).
//
//   wind (the result): the tempo is the wind, as many beats a minute as it blows km/h, rising more gently past 150
//     (tempoOf), set at each bar. A percussion family of the track's own (its Kit) leads that speed, each category
//     playing it with more of its pieces and more craft, by the same mapping on every kit (see FILL_FROM). Behind it a
//     bass and a pad strike each bar and strings circle a fixed minor progression, a part joining at each category.
//   sea (the cause): a slow, low ocean line on trombone in place of a melody, one note a chord, read from the sea under
//     the storm against the basin's neutral SST, where storms on average neither strengthen nor weaken. Above it the
//     note sits on the chord, fuller and louder the warmer the water, the tuba joining under it once it is a degree
//     warmer. Below it the note leaves the chord, bends flat, thins and breaks off early: the fuel is running out.
//     Over land the line stops.
//   landfall (the event): the big drum and a low bass strike the moment the storm comes ashore.
//
// The ocean line reads the sea under the storm record by record, as the SST shown beside the storm does, so a new note
// sounds the moment the number changes enough to call for one. Like the sea, it is heard as weight, never brightness.

import { CC, Instrument } from '../instruments.js';
import {
  KMH_PER_KT,
  STORM_CATEGORIES,
  StormCategory,
  atLeast,
  categoryOf,
  easeSpin,
  intensityOf,
  isGrowingSea,
  spinOf,
} from '../../../tracks/domain/storm-track.js';

const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
// Where the tempo stops following the wind's km/h one for one, and how fast it rises past it (see tempoOf).
const TEMPO_KNEE = Object.freeze({ bpm: 150, slope: 1 / 3 });
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
const MINOR_SCALE = Object.freeze([0, 2, 3, 5, 7, 8, 10]);
// The circling figure's steps through a chord spread over two octaves: up and back down.
const CIRCLE = Object.freeze([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
// The strings circle in the finest of these note spacings (steps) whose notes stay STRING_MIN_SEC apart.
const STRING_SPACINGS = Object.freeze([1, 2, 4]);
const STRING_MIN_SEC = 0.1;
// The strings' notes fall in groups of 3 + 3 + 2, each group's first note louder, so they drive rather than whir.
const STRING_GROUPS = Object.freeze({ every: 8, accents: [0, 3, 6], accent: 18 });

// The ocean line. Its note: D3 at the neutral SST, a step of D minor for every `cPerStep` warmer (or cooler), between
// `lowest` and `highest`; above the neutral SST moved to the nearest note of the chord. Its velocity rises by
// `velocity.perC` a degree from `velocity.neutral`. The tuba doubles it an octave down from `tubaFromC` above the
// neutral SST. Below it the note bends flat by `bend.perC` semitones a degree (at most `bend.max`, the pitch wheel's
// range) over `bend.glideSec`, and is let go after `hold.perC` less of its chord a degree (never under `hold.min`).
const OCEAN = Object.freeze({
  homeMidi: 50,
  cPerStep: 0.5,
  lowest: 41,
  highest: 62,
  velocity: Object.freeze({ neutral: 74, perC: 8, min: 46, max: 104 }),
  tubaFromC: 1,
  bend: Object.freeze({ perC: 0.5, max: 2, glideSec: 1.2 }),
  hold: Object.freeze({ perC: 0.12, min: 0.45 }),
});

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
// The mapping every kit plays by: its beats climb the categories one by one, each keeping the last one's craft and
// adding its own; from FILL_FROM up the phrase's last bar is a fill, and from OPENING_FROM up its first bar opens with
// a stroke on top of the beat.
const FILL_FROM = StormCategory.CAT3;
const OPENING_FROM = StormCategory.CAT4;

// Each kit's pieces, by their key on the kit. Those that `ring` play on the kit's second channel, panned to the storm's
// turn, so they swirl round the listener; the rest keep the middle.
const LatinPiece = Object.freeze({
  CLAVE: { key: 75, ring: false },
  MARACAS: { key: 70, ring: false },
  BONGO_HIGH: { key: 60, ring: false },
  BONGO_LOW: { key: 61, ring: false },
  COWBELL: { key: 56, ring: false },
  CONGA_MUTE: { key: 62, ring: true },
  CONGA_OPEN: { key: 63, ring: true },
  TUMBA: { key: 64, ring: true },
  TIMBALE_HIGH: { key: 65, ring: true },
  TIMBALE_LOW: { key: 66, ring: true },
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
 * as the foreground; and `beats`, what it plays from each category up, as a drummer's tab of 16 steps a piece. `bar`
 * is every bar; `fill`, in its place, the phrase's last bar; `opening`, on top of it, the phrase's first bar.
 */
export const Kit = Object.freeze({
  // A salsa section on the 3-2 son clave, the bar read in cut time: maracas, the conga's tumbao, the bongo's martillo,
  // the bongo bell, then the timbales' runs, the mambo bell and their rolls.
  LATIN: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 127,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[LatinPiece.CLAVE, 'x..x..x...x.x...'], [LatinPiece.MARACAS, 'x...x...x...x...']] },
      {
        from: StormCategory.STORM,
        bar: [
          [LatinPiece.CLAVE, 'X..X..X...X.X...'],
          [LatinPiece.CONGA_MUTE, 'g.g.X.g.g.g.....'],
          [LatinPiece.CONGA_OPEN, '............x.x.'],
          [LatinPiece.MARACAS, 'x.g.x.g.x.g.x.g.'],
        ],
      },
      {
        from: StormCategory.CAT1,
        bar: [
          [LatinPiece.CLAVE, 'X..X..X...X.X...'],
          [LatinPiece.CONGA_MUTE, 'g.g.X.g.g.g.....'],
          [LatinPiece.CONGA_OPEN, '............x.x.'],
          [LatinPiece.BONGO_HIGH, 'x.g.x.X.x.g.x...'],
          [LatinPiece.BONGO_LOW, '..............X.'],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [LatinPiece.CLAVE, 'X..X..X...X.X...'],
          [LatinPiece.CONGA_MUTE, 'g.g.F.g.g.g.....'],
          [LatinPiece.CONGA_OPEN, '............x...'],
          [LatinPiece.TUMBA, '..............X.'],
          [LatinPiece.COWBELL, 'X...x...X...x...'],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [LatinPiece.CLAVE, 'X..X..X...X.X...'],
          [LatinPiece.CONGA_MUTE, 'g.g.F.g.g.g.....'],
          [LatinPiece.CONGA_OPEN, '............x...'],
          [LatinPiece.TUMBA, '..............X.'],
          [LatinPiece.COWBELL, 'X.x.x.x.X.x.x.x.'],
        ],
        fill: [
          [LatinPiece.CLAVE, 'X..X..X.........'],
          [LatinPiece.COWBELL, 'X.x.x.x.........'],
          [LatinPiece.TIMBALE_HIGH, '........xx......'],
          [LatinPiece.TIMBALE_LOW, '..........xx....'],
          [LatinPiece.CONGA_OPEN, '............xx..'],
          [LatinPiece.TUMBA, '..............xX'],
        ],
      },
      {
        from: StormCategory.CAT4,
        bar: [
          [LatinPiece.CLAVE, 'X..X..X...X.X...'],
          [LatinPiece.CONGA_MUTE, 'g.g.F.g.g.g.....'],
          [LatinPiece.CONGA_OPEN, '............x...'],
          [LatinPiece.TUMBA, '..........x...X.'],
          [LatinPiece.COWBELL, 'X.x.X.xxX.x.X.x.'],
          [LatinPiece.TIMBALE_HIGH, '......X.....X...'],
        ],
        fill: [
          [LatinPiece.CLAVE, 'X...............'],
          [LatinPiece.TIMBALE_HIGH, 'Xxxx............'],
          [LatinPiece.TIMBALE_LOW, '....Xxxx........'],
          [LatinPiece.CONGA_OPEN, '........Xxxx....'],
          [LatinPiece.TUMBA, '............XxxX'],
        ],
        opening: [[LatinPiece.CRASH, 'X...............'], [LatinPiece.TIMBALE_LOW, 'X...............']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [LatinPiece.CLAVE, 'X..X..X...X.X...'],
          [LatinPiece.CONGA_MUTE, 'g.g.F.g.g.g.....'],
          [LatinPiece.CONGA_OPEN, '............x...'],
          [LatinPiece.TUMBA, '..........x...X.'],
          [LatinPiece.COWBELL, 'X.x.X.xxX.x.X.x.'],
          [LatinPiece.TIMBALE_HIGH, '......D.....D...'],
        ],
        fill: [
          [LatinPiece.CLAVE, 'X...............'],
          [LatinPiece.TIMBALE_HIGH, 'Xx..............'],
          [LatinPiece.TIMBALE_LOW, '..Xx............'],
          [LatinPiece.CONGA_OPEN, '....Xx..........'],
          [LatinPiece.TUMBA, '......Xx........'],
          [LatinPiece.TIMBALE_LOW, '........rrrrrrrr'],
        ],
        opening: [[LatinPiece.CRASH, 'X...............'], [LatinPiece.TIMBALE_LOW, 'X...............']],
      },
    ],
  }),
  // A marching drumline: the basses' pulse under the snare's taps, diddles and flams, the basses splitting the beat,
  // the tenors sweeping round their drums, cymbal crashes. From category 3 up every piece keeps to the eighths, together
  // as well as alone: at a major hurricane's tempo anything finer rattles like gunfire.
  DRUMLINE: Object.freeze({
    inst: Instrument.POWER_KIT,
    volume: 71,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[DrumlinePiece.BASS, 'X...............'], [DrumlinePiece.SNARE, 'x...x...x...x...']] },
      { from: StormCategory.STORM, bar: [[DrumlinePiece.BASS, 'X.......X.......'], [DrumlinePiece.SNARE, 'x.x.X.x.x.x.X.x.']] },
      {
        from: StormCategory.CAT1,
        bar: [
          [DrumlinePiece.BASS, 'X.......X.......'],
          [DrumlinePiece.BASS_HIGH, '......x.........'],
          [DrumlinePiece.BASS_LOW, '..............x.'],
          [DrumlinePiece.SNARE, 'x.ggX.x.x.ggX.x.'],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [DrumlinePiece.BASS, 'X...............'],
          [DrumlinePiece.BASS_HIGH, '......X.........'],
          [DrumlinePiece.BASS_LOW, '..........X.....'],
          [DrumlinePiece.SNARE, 'F.xgx.xgF.xgx.xg'],
          [DrumlinePiece.TENOR_1, '......x.........'],
          [DrumlinePiece.TENOR_3, '..........x.....'],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [DrumlinePiece.BASS, 'X.......X.......'],
          [DrumlinePiece.BASS_HIGH, '......X.........'],
          [DrumlinePiece.BASS_LOW, '..........X.....'],
          [DrumlinePiece.SNARE, 'F.g.x.g.F.g.x.g.'],
          [DrumlinePiece.TENOR_1, 'x.......x.......'],
          [DrumlinePiece.TENOR_2, '..x.......x.....'],
          [DrumlinePiece.TENOR_3, '....x.......x...'],
          [DrumlinePiece.TENOR_4, '......x.......x.'],
        ],
        fill: [
          [DrumlinePiece.BASS, 'X.......X.......'],
          [DrumlinePiece.SNARE, 'F.g.x.g.........'],
          [DrumlinePiece.TENOR_1, '........x.......'],
          [DrumlinePiece.TENOR_2, '..........x.....'],
          [DrumlinePiece.TENOR_3, '............x...'],
          [DrumlinePiece.BASS_LOW, '..............X.'],
        ],
      },
      {
        from: StormCategory.CAT4,
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
        ],
        opening: [[DrumlinePiece.CYMBALS, 'X...............']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [DrumlinePiece.BASS, 'X.......X.......'],
          [DrumlinePiece.BASS_HIGH, '..x...X.....X...'],
          [DrumlinePiece.BASS_LOW, '......X...X...X.'],
          [DrumlinePiece.SNARE, 'F.g.X.g.F.g.X.g.'],
          [DrumlinePiece.CYMBALS, '....x.......x...'],
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
        opening: [[DrumlinePiece.CYMBALS, 'X...............']],
      },
    ],
  }),
  // An orchestra's timpani and snare alone: the timpani's D pulsing, then D and A under the snare's backbeat, ghost
  // strokes into it, the timpani on 3 + 3 + 2 under flams, rocking D and A in eighths, a line through D, C and A with G,
  // C and D struck together to open each phrase, and the timpani and snare rolling together.
  ORCHESTRA: Object.freeze({
    inst: Instrument.ORCHESTRAL_KIT,
    volume: 98,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[OrchestraPiece.TIMPANI_D, 'x...g...x...g...']] },
      {
        from: StormCategory.STORM,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X.......X.......'],
          [OrchestraPiece.TIMPANI_A, '....x.......x...'],
          [OrchestraPiece.SNARE, '....x.......x...'],
        ],
      },
      {
        from: StormCategory.CAT1,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X.......X.......'],
          [OrchestraPiece.TIMPANI_A, '....x.......x...'],
          [OrchestraPiece.SNARE, '..ggx.....ggx...'],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X...........X...'],
          [OrchestraPiece.TIMPANI_A, '......X.........'],
          [OrchestraPiece.SNARE, 'F.g.x.F.g.x.F.gg'],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X...x...X...x...'],
          [OrchestraPiece.TIMPANI_A, '..x...x...x...x.'],
          [OrchestraPiece.SNARE, 'F.ggx.g.F.ggx.gg'],
        ],
        fill: [
          [OrchestraPiece.TIMPANI_D, 'X...x...xx......'],
          [OrchestraPiece.TIMPANI_A, '..x...x.....xx..'],
          [OrchestraPiece.SNARE, 'F.ggx.g.........'],
          [OrchestraPiece.TIMPANI_C, '..........xx....'],
          [OrchestraPiece.TIMPANI_G, '..............xX'],
        ],
      },
      {
        from: StormCategory.CAT4,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X...x.......x...'],
          [OrchestraPiece.TIMPANI_C, '........X.......'],
          [OrchestraPiece.TIMPANI_A, '..x...x...x...x.'],
          [OrchestraPiece.SNARE, 'F.ggX.g.F.ggX.gg'],
        ],
        fill: [
          [OrchestraPiece.SNARE, 'x...x...x...x...'],
          [OrchestraPiece.TIMPANI_D, 'X.x.............'],
          [OrchestraPiece.TIMPANI_C, '....X.x.........'],
          [OrchestraPiece.TIMPANI_A, '........X.x.....'],
          [OrchestraPiece.TIMPANI_G, '............X.xX'],
        ],
        opening: [[OrchestraPiece.TIMPANI_G, 'X...............'], [OrchestraPiece.TIMPANI_C, 'X...............']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X...x.......x...'],
          [OrchestraPiece.TIMPANI_C, '........X.......'],
          [OrchestraPiece.TIMPANI_A, '..x...x...x...x.'],
          [OrchestraPiece.SNARE, 'D.ggX.g.D.ggX.gg'],
        ],
        fill: [
          [OrchestraPiece.TIMPANI_D, 'Xx......rrrrrrrr'],
          [OrchestraPiece.TIMPANI_C, '..Xx............'],
          [OrchestraPiece.TIMPANI_A, '....Xx..........'],
          [OrchestraPiece.TIMPANI_G, '......Xx........'],
          [OrchestraPiece.SNARE, '........rrrrrrrr'],
        ],
        opening: [[OrchestraPiece.TIMPANI_G, 'X...............'], [OrchestraPiece.TIMPANI_C, 'X...............']],
      },
    ],
  }),
});
// Every kit keeps the mapping: a beat for each category in order, fills and openings from where they begin, and
// well-formed tabs.
for (const [name, kit] of Object.entries(Kit)) {
  if (kit.beats.length !== STORM_CATEGORIES.length || kit.beats.some((beat, i) => beat.from !== STORM_CATEGORIES[i])) {
    throw new Error(`${name}: beats must climb every category in order`);
  }
  for (const beat of kit.beats) {
    if (Boolean(beat.fill) !== atLeast(beat.from, FILL_FROM) || Boolean(beat.opening) !== atLeast(beat.from, OPENING_FROM)) {
      throw new Error(`${name}: fills and openings must begin at the same categories as every kit's`);
    }
    for (const [, tab] of [...beat.bar, ...(beat.fill ?? []), ...(beat.opening ?? [])]) {
      if (tab.length !== STEPS_PER_BAR || [...tab].some((letter) => letter !== '.' && !Stroke[letter])) {
        throw new Error(`${name}: bad drum tab ${tab}`);
      }
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

// A landfall: the big drum, and a low tonic under it.
const LANDFALL = Object.freeze({ drum: 50, drumVelocity: 127, bass: TONIC - 36, bassVelocity: 100 });

/**
 * The tempo (beats a minute) for a wind of `kmh`: as many as the wind blows km/h up to the knee, then rising only
 * `slope` as fast, so a major hurricane's band still races without blurring (150 kt, 278 km/h, plays at about 193).
 */
export function tempoOf(kmh) {
  return kmh <= TEMPO_KNEE.bpm ? kmh : TEMPO_KNEE.bpm + (kmh - TEMPO_KNEE.bpm) * TEMPO_KNEE.slope;
}

/**
 * The ocean line's note for the sea `sstC` (°C) under the chord `chord`, against the basin's neutral SST.
 *
 * @returns {{ midi: number, velocity: number, tuba: boolean, bendSemitones: number, holdShare: number }}
 */
export function oceanNote(sstC, neutralC, chord) {
  const warmth = sstC - neutralC;
  const steps = Math.round(warmth / OCEAN.cPerStep);
  const scaleMidi = clamp(minorStep(OCEAN.homeMidi, steps), OCEAN.lowest, OCEAN.highest);
  const v = OCEAN.velocity;
  const velocity = clamp(v.neutral + v.perC * warmth, v.min, v.max);
  if (isGrowingSea(sstC, neutralC)) {
    return { midi: nearestChordTone(scaleMidi, chord), velocity, tuba: warmth >= OCEAN.tubaFromC, bendSemitones: 0, holdShare: 1 };
  }
  const cool = -warmth;
  return {
    midi: scaleMidi,
    velocity,
    tuba: false,
    bendSemitones: -Math.min(OCEAN.bend.max, cool * OCEAN.bend.perC),
    holdShare: Math.max(OCEAN.hold.min, 1 - cool * OCEAN.hold.perC),
  };
}

/**
 * @typedef {Object} StormSong
 * @property {import('../../../tracks/domain/storm-track.js').StormTrack} track
 * @property {Object} kit one of Kit
 * @property {number} neutralSstC the basin's neutral SST (°C)
 */

export class HurricaneComposer {
  instruments = Object.freeze([
    Instrument.TROMBONE,
    Instrument.TUBA,
    KIT_MIDDLE,
    KIT_RING,
    ...new Set(PARTS.map((part) => part.inst)),
    Instrument.TAIKO,
  ]);

  stepsPerBar = STEPS_PER_BAR;
  // The pitch wheel bends as far as the ocean line ever does.
  bendRangeSemitones = OCEAN.bend.max;
  // A bar at 120 BPM, for a step no storm sets the tempo of.
  stepSec = 60 / 120 / STEPS_PER_BEAT;

  /** @param {StormSong} song */
  setSong(song) {
    this.kit = song.kit;
    this.landfalls = song.track.landfalls;
    this.neutralSstC = song.neutralSstC;
  }

  /** Back to the opening state, as the music starts. */
  reset() {
    this.kitDue = true;
    this.chordIndex = -1;
    this.chordBars = 0;
    this.chordBar = 0;
    this.chordSec = 0;
    this.chord = PROGRESSION[0];
    this.category = StormCategory.DEPRESSION;
    this.beat = this.kit.beats[0];
    this.held = new Set();
    // The ocean note sounding: { midi, tuba, struckAt, releaseAt, bendSemitones, sstC }, or null.
    this.ocean = null;
    this.spin = 0;
    this.spinRate = null;
    this.checkedUntil = null;
  }

  /** The step length of the bar starting with `sample`: its tempo is the wind's. */
  stepSecAt(sample) {
    return 60 / tempoOf(sample.windKt * KMH_PER_KT) / STEPS_PER_BEAT;
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
    const chordStarts = step === 0 && this.startBar(at, stepSec);
    this.spinRate = easeSpin(this.spinRate, spinOf(intensityOf(sample.windKt)), stepSec);
    this.spin += stepSec * this.spinRate;
    this.playKit(music, step, at, stepSec);
    this.playParts(music, step, at);
    this.playOcean(music, sample.sstC, at, chordStarts);
    this.playLandfalls(music, time, at, stepSec, stepMs);
  }

  // Moves on a bar; returns whether a new chord starts with it. A chord lasts as many bars as CHORD_MIN_SEC takes at
  // the tempo it starts at.
  startBar(at, stepSec) {
    const barSec = STEPS_PER_BAR * stepSec;
    const chordStarts = this.chordBar + 1 >= this.chordBars;
    if (chordStarts) {
      this.chordIndex = (this.chordIndex + 1) % PROGRESSION.length;
      this.chordBars = Math.max(1, Math.ceil(CHORD_MIN_SEC / barSec - 1e-9));
      this.chordBar = 0;
      this.chordSec = this.chordBars * barSec;
    } else {
      this.chordBar++;
    }
    this.chord = PROGRESSION[this.chordIndex];
    this.phraseStarts = this.chordIndex === 0 && this.chordBar === 0;
    this.phraseEnds = this.chordIndex === PROGRESSION.length - 1 && this.chordBar === this.chordBars - 1;
    this.stringEvery = STRING_SPACINGS.find((every) => every * stepSec >= STRING_MIN_SEC) ?? STRING_SPACINGS.at(-1);
    this.beat = this.kit.beats.findLast((beat) => atLeast(this.category, beat.from));
    this.held.clear();
    return chordStarts;
  }

  // The kit's ringing pieces panned to the storm's turn every step, and the strokes the bar's beat writes for it.
  playKit(music, step, at, stepSec) {
    music.control(KIT_RING, CC.PAN, Math.round(64 + 63 * Math.cos(this.spin)), at);
    const { bar, fill, opening } = this.beat;
    const tabs = [...(this.phraseEnds && fill ? fill : bar), ...(this.phraseStarts && opening ? opening : [])];
    for (const [piece, tab] of tabs) {
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

  // The ocean line: struck as each chord starts and whenever the sea under the storm calls for another note; stopped
  // over land and, over cool water, let go partway through its chord. Over cool water it bends flat as it sounds.
  playOcean(music, sstC, at, chordStarts) {
    if (sstC === null) {
      this.stopOcean(music, at);
      return;
    }
    const note = oceanNote(sstC, this.neutralSstC, this.chord);
    const sounding = this.ocean;
    if (chordStarts || !sounding || sounding.midi !== note.midi || sounding.tuba !== note.tuba) {
      this.stopOcean(music, at);
      this.strikeOcean(music, note, at);
      return;
    }
    // The same note over slightly different water: it keeps sounding, bending as far as the water now calls for.
    sounding.bendSemitones = note.bendSemitones;
    if (sounding.released) return;
    if (at >= sounding.releaseAt) {
      this.letGoOcean(music, at);
      return;
    }
    const along = Math.min(1, (at - sounding.struckAt) / OCEAN.bend.glideSec);
    music.bend(Instrument.TROMBONE, sounding.bendSemitones * along, at);
  }

  strikeOcean(music, note, at) {
    music.bend(Instrument.TROMBONE, 0, at);
    music.hold(Instrument.TROMBONE, note.midi, note.velocity, at);
    if (note.tuba) music.hold(Instrument.TUBA, note.midi - 12, note.velocity, at);
    this.ocean = { ...note, struckAt: at, releaseAt: at + this.chordSec * note.holdShare, released: false };
  }

  // Lets the sounding note go, keeping it as the line's note until another is struck.
  letGoOcean(music, at) {
    const { midi, tuba } = this.ocean;
    music.release(Instrument.TROMBONE, midi, at);
    if (tuba) music.release(Instrument.TUBA, midi - 12, at);
    this.ocean.released = true;
  }

  stopOcean(music, at) {
    if (this.ocean && !this.ocean.released) this.letGoOcean(music, at);
    this.ocean = null;
  }

  // A landfall within this step sounds the moment it happens, the step lasting `stepSec` and covering `stepMs`. Each
  // step picks up where the last one's window ended, so jitter in the clock neither drops nor repeats a landfall; after
  // a jump (a seek) it starts afresh.
  playLandfalls(music, time, at, stepSec, stepMs) {
    const contiguous = this.checkedUntil !== null && Math.abs(time - this.checkedUntil) < stepMs;
    const start = contiguous ? this.checkedUntil : time;
    const end = time + stepMs;
    this.checkedUntil = end;
    for (const landfall of this.landfalls) {
      if (landfall < start || landfall >= end) continue;
      const when = at + (Math.max(0, landfall - time) / stepMs) * stepSec;
      music.note(Instrument.TAIKO, LANDFALL.drum, LANDFALL.drumVelocity, when, STEPS_PER_BAR);
      music.note(Instrument.DOUBLE_BASS, LANDFALL.bass, LANDFALL.bassVelocity, when, STEPS_PER_BAR);
    }
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// `steps` steps of D minor from `home` (a note of the scale), up or down.
function minorStep(home, steps) {
  const at = MINOR_SCALE.indexOf((((home - TONIC) % 12) + 12) % 12);
  const index = at + steps;
  const octave = Math.floor(index / MINOR_SCALE.length);
  return home - MINOR_SCALE[at] + 12 * octave + MINOR_SCALE[index - octave * MINOR_SCALE.length];
}

// The note of `chord` (semitones above TONIC) nearest `midi`, the lower one on a tie: the heavier.
function nearestChordTone(midi, chord) {
  const classes = new Set(chord.map((tone) => (((TONIC + tone) % 12) + 12) % 12));
  for (let distance = 0; distance < 12; distance++) {
    if (classes.has((midi - distance) % 12)) return midi - distance;
    if (classes.has((midi + distance) % 12)) return midi + distance;
  }
  return midi;
}
