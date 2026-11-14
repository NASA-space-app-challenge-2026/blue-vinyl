// Composer for the hot oceans album: one hurricane a track, its wind on drums and its landfall on a gong (see
// docs/albums/hot-oceans.md).
//
//   wind: a percussion family of the track's own (its Kit) leads, at one tempo all album long. The wind is heard as how
//     finely the beat is split: each category splits it finer (SUBDIVISION), from quarter notes for a tropical
//     depression to twelve strokes a beat for a category 5, and adds pieces and craft by the same mapping on every kit
//     (see FILL_FROM). Behind it a bass and a pad strike each bar and strings circle a fixed minor progression, a part
//     joining at each category.
//   landfall: a gong, as loud as the wind the storm comes ashore with, and a low bass under it.

import { CC, Instrument } from '../instruments.js';
import {
  STORM_CATEGORIES,
  StormCategory,
  atLeast,
  categoryOf,
  easeSpin,
  intensityOf,
  spinOf,
} from '../../../tracks/domain/storm-track.js';

const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
const BEATS_PER_BAR = STEPS_PER_BAR / STEPS_PER_BEAT;
// One tempo for every storm: the wind is heard in how finely the beat is split, not in how fast it comes.
const TEMPO_BPM = 90;
const STEP_SEC = 60 / TEMPO_BPM / STEPS_PER_BEAT;
// A chord lasts at least this long (s), over as many bars as that takes.
const CHORD_MIN_SEC = 2;

// How many strokes a beat each category splits it into: the finest note its kit plays. Straight and triplet splits
// take turns, so each category is heard as a new feel: quarters, eighths, triplets, sixteenths, sextuplets,
// thirty-seconds, then twelve a beat (90 BPM: 1.5 to 18 strokes a second).
const SUBDIVISION = new Map([
  [StormCategory.DEPRESSION, 1],
  [StormCategory.STORM, 2],
  [StormCategory.CAT1, 3],
  [StormCategory.CAT2, 4],
  [StormCategory.CAT3, 6],
  [StormCategory.CAT4, 8],
  [StormCategory.CAT5, 12],
]);

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
// The strings circle in eighth notes at every category, so the speed is left to the drums.
const STRING_EVERY = 2;
// The strings' notes fall in groups of 3 + 3 + 2, each group's first note louder, so they drive rather than whir.
const STRING_GROUPS = Object.freeze({ every: 8, accents: [0, 3, 6], accent: 18 });

// How a drum is struck, by the letter that writes it in a kit's tab: its velocity, `grace` strokes played quickly just
// before it (a flam has one, a drag two), or a `roll` through its slot (see ROLL). '.' is a rest.
const Stroke = Object.freeze({
  X: Object.freeze({ velocity: 112, grace: 0 }),
  x: Object.freeze({ velocity: 84, grace: 0 }),
  g: Object.freeze({ velocity: 36, grace: 0 }),
  F: Object.freeze({ velocity: 112, grace: 1 }),
  D: Object.freeze({ velocity: 112, grace: 2 }),
  r: Object.freeze({ roll: true }),
});
// Grace strokes: each this long (s) and this loud.
const GRACE = Object.freeze({ sec: 0.025, velocity: 52 });
// A roll's strokes a second, swelling from `from` to `to` velocity across the bar.
const ROLL = Object.freeze({ perSec: 24, from: 48, to: 120 });
// The mapping every kit plays by: its beats climb the categories one by one, each splitting the beat as SUBDIVISION
// says; from FILL_FROM up the phrase's last bar is a fill, and from OPENING_FROM up its first bar opens with a stroke on
// top of the beat.
const FILL_FROM = StormCategory.CAT3;
const OPENING_FROM = StormCategory.CAT4;

// Each kit's pieces, by their key on the kit. Those that `ring` play on the kit's second channel, panned to the storm's
// turn, so they swirl round the listener; the rest keep the middle.
const DrumSetPiece = Object.freeze({
  KICK: { key: 36, ring: false },
  SNARE: { key: 38, ring: false },
  CLOSED_HAT: { key: 42, ring: false },
  HIGH_TOM: { key: 50, ring: true },
  MID_TOM: { key: 47, ring: true },
  LOW_TOM: { key: 43, ring: true },
  FLOOR_TOM: { key: 41, ring: true },
  CRASH: { key: 49, ring: true },
  RIDE: { key: 51, ring: true },
});
const LatinPiece = Object.freeze({
  CLAVE: { key: 75, ring: false },
  MARACAS: { key: 70, ring: false },
  BONGO_HIGH: { key: 60, ring: false },
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

/** A tab that plays `cell` (one beat of strokes) on every beat of the bar. */
function eachBeat(cell) {
  return Array(BEATS_PER_BAR).fill(cell).join(' ');
}

/**
 * The percussion families a storm can be played on: its drum `inst`; `volume`, which evens out how loud the kits play
 * as the foreground; and `beats`, what it plays from each category up, as a drummer's tab a piece. A tab is one bar,
 * a letter a stroke (see Stroke), spaces between beats for reading; its length sets its grid, so a tab of 12 letters
 * plays triplets. `bar` is every bar; `fill`, in its place, the phrase's last bar; `opening`, on top of it, the
 * phrase's first bar.
 */
export const Kit = Object.freeze({
  // A rock kit: the hi-hat splits the beat over the kick and the snare's backbeat, the toms fall in fills, the crash
  // opens the phrase.
  DRUM_SET: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 89,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[DrumSetPiece.KICK, 'X...'], [DrumSetPiece.CLOSED_HAT, 'xxxx']] },
      {
        from: StormCategory.STORM,
        bar: [
          [DrumSetPiece.KICK, 'X. .. X. ..'],
          [DrumSetPiece.SNARE, '.. X. .. X.'],
          [DrumSetPiece.CLOSED_HAT, eachBeat('xg')],
        ],
      },
      {
        from: StormCategory.CAT1,
        bar: [
          [DrumSetPiece.KICK, 'X.. ... X.x ...'],
          [DrumSetPiece.SNARE, '... X.. ... X.g'],
          [DrumSetPiece.CLOSED_HAT, eachBeat('xgx')],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [DrumSetPiece.KICK, 'X... ..X. ..X. ....'],
          [DrumSetPiece.SNARE, '.... F... .... F..g'],
          [DrumSetPiece.CLOSED_HAT, eachBeat('xgxg')],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [DrumSetPiece.KICK, 'X..... ...... X..X.. ......'],
          [DrumSetPiece.SNARE, '...... F..... ...... F...gg'],
          [DrumSetPiece.CLOSED_HAT, eachBeat('xggxgg')],
        ],
        fill: [
          [DrumSetPiece.KICK, eachBeat('X.....')],
          [DrumSetPiece.HIGH_TOM, 'xxxxxx ...... ...... ......'],
          [DrumSetPiece.MID_TOM, '...... xxxxxx ...... ......'],
          [DrumSetPiece.LOW_TOM, '...... ...... xxxxxx ......'],
          [DrumSetPiece.FLOOR_TOM, '...... ...... ...... xxxxxX'],
        ],
      },
      {
        from: StormCategory.CAT4,
        bar: [
          [DrumSetPiece.KICK, 'X... ..X. ..X. ....'],
          [DrumSetPiece.SNARE, '........ F....... ........ F.....g.'],
          [DrumSetPiece.CLOSED_HAT, eachBeat('xgggxggg')],
          [DrumSetPiece.RIDE, 'x. x. x. x.'],
        ],
        fill: [
          [DrumSetPiece.KICK, 'XXXX'],
          [DrumSetPiece.HIGH_TOM, 'xxxxxxxx ........ ........ ........'],
          [DrumSetPiece.MID_TOM, '........ xxxxxxxx ........ ........'],
          [DrumSetPiece.LOW_TOM, '........ ........ xxxxxxxx ........'],
          [DrumSetPiece.FLOOR_TOM, '........ ........ ........ xxxxxxxX'],
        ],
        opening: [[DrumSetPiece.CRASH, 'X...'], [DrumSetPiece.KICK, 'X...']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [DrumSetPiece.KICK, 'X.x. ..X. X.x. ..X.'],
          [DrumSetPiece.SNARE, '............ D........... ............ D.......g.g.'],
          [DrumSetPiece.CLOSED_HAT, eachBeat('xgggxgggxggg')],
          [DrumSetPiece.RIDE, 'x. x. x. x.'],
        ],
        fill: [
          [DrumSetPiece.KICK, 'XXXX'],
          [DrumSetPiece.HIGH_TOM, 'xxxxxxxxxxxx ............ ............ ............'],
          [DrumSetPiece.MID_TOM, '............ xxxxxxxxxxxx ............ ............'],
          [DrumSetPiece.LOW_TOM, '............ ............ xxxxxxxxxxxx ............'],
          [DrumSetPiece.SNARE, '...r'],
        ],
        opening: [[DrumSetPiece.CRASH, 'X...'], [DrumSetPiece.KICK, 'X...']],
      },
    ],
  }),
  // A salsa section: the maracas and the bongos split the beat, the conga's tumbao and the clave over it in straight
  // time, the 12/8 bell of a bembé in triplet time, the timbales' runs in fills.
  LATIN: Object.freeze({
    inst: Instrument.STANDARD_KIT,
    volume: 127,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[LatinPiece.TUMBA, 'X...'], [LatinPiece.MARACAS, 'xxxx']] },
      {
        from: StormCategory.STORM,
        bar: [
          [LatinPiece.CLAVE, 'x. .x .. x.'],
          [LatinPiece.CONGA_MUTE, 'gg Xg gg ..'],
          [LatinPiece.CONGA_OPEN, '.. .. .. xx'],
          [LatinPiece.MARACAS, eachBeat('xg')],
        ],
      },
      {
        from: StormCategory.CAT1,
        bar: [
          [LatinPiece.COWBELL, 'X.x .xx .x. x.x'],
          [LatinPiece.CONGA_MUTE, 'g.g X.g g.g ...'],
          [LatinPiece.CONGA_OPEN, '... ... ... x.x'],
          [LatinPiece.MARACAS, eachBeat('xgg')],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [LatinPiece.CLAVE, 'X..X ..X. ..X. X...'],
          [LatinPiece.CONGA_MUTE, 'g.g. F.g. g.g. ....'],
          [LatinPiece.CONGA_OPEN, '.... .... .... x.x.'],
          [LatinPiece.BONGO_HIGH, eachBeat('xgxg')],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [LatinPiece.COWBELL, 'X...x. ..x.x. ..x... x...x.'],
          [LatinPiece.CONGA_MUTE, 'g.g X.g g.g ...'],
          [LatinPiece.TUMBA, '... ... ... X.x'],
          [LatinPiece.MARACAS, eachBeat('xggxgg')],
        ],
        fill: [
          [LatinPiece.COWBELL, 'X... .... .... ....'],
          [LatinPiece.TIMBALE_HIGH, 'xxxxxx ...... ...... ......'],
          [LatinPiece.TIMBALE_LOW, '...... xxxxxx ...... ......'],
          [LatinPiece.CONGA_OPEN, '...... ...... xxxxxx ......'],
          [LatinPiece.TUMBA, '...... ...... ...... xxxxxX'],
        ],
      },
      {
        from: StormCategory.CAT4,
        bar: [
          [LatinPiece.CLAVE, 'X..X ..X. ..X. X...'],
          [LatinPiece.COWBELL, 'X.x. X.xx X.x. X.x.'],
          [LatinPiece.CONGA_MUTE, 'g.g. F.g. g.g. ....'],
          [LatinPiece.TUMBA, '.... .... ..x. ..X.'],
          [LatinPiece.MARACAS, eachBeat('xgggxggg')],
        ],
        fill: [
          [LatinPiece.CLAVE, 'X...'],
          [LatinPiece.TIMBALE_HIGH, 'xxxxxxxx ........ ........ ........'],
          [LatinPiece.TIMBALE_LOW, '........ xxxxxxxx ........ ........'],
          [LatinPiece.CONGA_OPEN, '........ ........ xxxxxxxx ........'],
          [LatinPiece.TUMBA, '........ ........ ........ xxxxxxxX'],
        ],
        opening: [[LatinPiece.CRASH, 'X...'], [LatinPiece.TIMBALE_LOW, 'X...']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [LatinPiece.COWBELL, 'X.x .xx .x. x.x'],
          [LatinPiece.CONGA_MUTE, 'g.g X.g g.g ...'],
          [LatinPiece.TUMBA, '... ... ... X.x'],
          [LatinPiece.TIMBALE_HIGH, '... D.. ... D..'],
          [LatinPiece.MARACAS, eachBeat('xgggxgggxggg')],
        ],
        fill: [
          [LatinPiece.TIMBALE_HIGH, 'xxxxxxxxxxxx ............ ............ ............'],
          [LatinPiece.CONGA_OPEN, '............ xxxxxxxxxxxx ............ ............'],
          [LatinPiece.TUMBA, '............ ............ xxxxxxxxxxxx ............'],
          [LatinPiece.TIMBALE_LOW, '...r'],
        ],
        opening: [[LatinPiece.CRASH, 'X...'], [LatinPiece.TIMBALE_LOW, 'X...']],
      },
    ],
  }),
  // A marching drumline: the snare line splits the beat over the basses' pulse, the split basses answering it, the
  // tenors sweeping round their drums, the cymbals crashing.
  DRUMLINE: Object.freeze({
    inst: Instrument.POWER_KIT,
    volume: 71,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[DrumlinePiece.BASS, 'X...'], [DrumlinePiece.SNARE, 'xxxx']] },
      { from: StormCategory.STORM, bar: [[DrumlinePiece.BASS, 'X. .. X. ..'], [DrumlinePiece.SNARE, 'xg Xg xg Xg']] },
      {
        from: StormCategory.CAT1,
        bar: [
          [DrumlinePiece.BASS, 'X.. ... X.. ...'],
          [DrumlinePiece.BASS_HIGH, '... x.. ... ...'],
          [DrumlinePiece.BASS_LOW, '... ... ... x..'],
          [DrumlinePiece.SNARE, 'Xgg xgg Xgg xgg'],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [DrumlinePiece.BASS, 'X... .... X... ....'],
          [DrumlinePiece.BASS_HIGH, '.... ..x. .... ....'],
          [DrumlinePiece.BASS_LOW, '.... .... .... ..x.'],
          [DrumlinePiece.SNARE, 'Fgxg Xgxg Fgxg Xgxg'],
          [DrumlinePiece.TENOR_1, '.... x... .... ....'],
          [DrumlinePiece.TENOR_3, '.... .... .... x...'],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [DrumlinePiece.BASS, 'X.. ... X.. ...'],
          [DrumlinePiece.BASS_HIGH, '... x.. ... x..'],
          [DrumlinePiece.BASS_LOW, '..x ... ..x ...'],
          [DrumlinePiece.SNARE, 'Fggxgg Xggxgg Fggxgg Xggxgg'],
          [DrumlinePiece.TENOR_1, 'x.. ... x.. ...'],
          [DrumlinePiece.TENOR_2, '.x. ... .x. ...'],
          [DrumlinePiece.TENOR_3, '... x.. ... x..'],
          [DrumlinePiece.TENOR_4, '... .x. ... .x.'],
        ],
        fill: [
          [DrumlinePiece.BASS, 'XXXX'],
          [DrumlinePiece.TENOR_1, 'xxxxxx ...... ...... ......'],
          [DrumlinePiece.TENOR_2, '...... xxxxxx ...... ......'],
          [DrumlinePiece.TENOR_3, '...... ...... xxxxxx ......'],
          [DrumlinePiece.TENOR_4, '...... ...... ...... xxxxxX'],
        ],
      },
      {
        from: StormCategory.CAT4,
        bar: [
          [DrumlinePiece.BASS, 'X... .... X... ....'],
          [DrumlinePiece.BASS_HIGH, '..x. ..X. .... X...'],
          [DrumlinePiece.BASS_LOW, '.... ..X. ..X. ..X.'],
          [DrumlinePiece.SNARE, 'Fgggxggg Xgggxggg Fgggxggg Xgggxggg'],
          [DrumlinePiece.TENOR_1, 'x... .... x... ....'],
          [DrumlinePiece.TENOR_2, '..x. .... ..x. ....'],
          [DrumlinePiece.TENOR_3, '.... x... .... x...'],
          [DrumlinePiece.TENOR_4, '.... ..x. .... ..x.'],
        ],
        fill: [
          [DrumlinePiece.BASS, 'XXXX'],
          [DrumlinePiece.TENOR_1, 'xxxxxxxx ........ ........ ........'],
          [DrumlinePiece.TENOR_2, '........ xxxxxxxx ........ ........'],
          [DrumlinePiece.TENOR_3, '........ ........ xxxxxxxx ........'],
          [DrumlinePiece.TENOR_4, '........ ........ ........ xxxxxxxX'],
        ],
        opening: [[DrumlinePiece.CYMBALS, 'X...']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [DrumlinePiece.BASS, 'X... .... X... ....'],
          [DrumlinePiece.BASS_HIGH, '..x. ..X. .... X...'],
          [DrumlinePiece.BASS_LOW, '.... ..X. ..X. ..X.'],
          [DrumlinePiece.SNARE, 'Fgggxgggxggg Xgggxgggxggg Fgggxgggxggg Xgggxgggxggg'],
          [DrumlinePiece.CYMBALS, '.x.x'],
          [DrumlinePiece.TENOR_1, 'x.. ... x.. ...'],
          [DrumlinePiece.TENOR_2, '.x. ... .x. ...'],
          [DrumlinePiece.TENOR_3, '... x.. ... x..'],
          [DrumlinePiece.TENOR_4, '... .x. ... .x.'],
        ],
        fill: [
          [DrumlinePiece.BASS, 'XXXX'],
          [DrumlinePiece.TENOR_1, 'xxxxxxxxxxxx ............ ............ ............'],
          [DrumlinePiece.TENOR_2, '............ xxxxxxxxxxxx ............ ............'],
          [DrumlinePiece.TENOR_3, '............ ............ xxxxxxxxxxxx ............'],
          [DrumlinePiece.SNARE, '...r'],
          [DrumlinePiece.CYMBALS, '...X'],
        ],
        opening: [[DrumlinePiece.CYMBALS, 'X...']],
      },
    ],
  }),
  // An orchestra's timpani and snare alone: the snare splits the beat over the timpani rocking between D and A, a line
  // through D, C and A, the timpani falling D, C, A, G in fills, with G, C and D struck together to open each phrase.
  ORCHESTRA: Object.freeze({
    inst: Instrument.ORCHESTRAL_KIT,
    volume: 98,
    beats: [
      { from: StormCategory.DEPRESSION, bar: [[OrchestraPiece.TIMPANI_D, 'Xgxg']] },
      {
        from: StormCategory.STORM,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X. .. X. ..'],
          [OrchestraPiece.TIMPANI_A, '.. x. .. x.'],
          [OrchestraPiece.SNARE, eachBeat('xg')],
        ],
      },
      {
        from: StormCategory.CAT1,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X.. ... X.. ...'],
          [OrchestraPiece.TIMPANI_A, '... x.. ... x..'],
          [OrchestraPiece.SNARE, 'Xgg xgg Xgg xgg'],
        ],
      },
      {
        from: StormCategory.CAT2,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X... .... .... X...'],
          [OrchestraPiece.TIMPANI_A, '.... ..X. .... ....'],
          [OrchestraPiece.SNARE, 'Fgxg xgxg Fgxg xgxg'],
        ],
      },
      {
        from: StormCategory.CAT3,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X.. ... x.. ...'],
          [OrchestraPiece.TIMPANI_A, '... x.. ... x..'],
          [OrchestraPiece.SNARE, 'Fggxgg xggxgg Fggxgg xggxgg'],
        ],
        fill: [
          [OrchestraPiece.TIMPANI_D, 'xxxxxx ...... ...... ......'],
          [OrchestraPiece.TIMPANI_C, '...... xxxxxx ...... ......'],
          [OrchestraPiece.TIMPANI_A, '...... ...... xxxxxx ......'],
          [OrchestraPiece.TIMPANI_G, '...... ...... ...... xxxxxX'],
        ],
      },
      {
        from: StormCategory.CAT4,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X... ..x. .... x...'],
          [OrchestraPiece.TIMPANI_C, '.... .... X... ....'],
          [OrchestraPiece.TIMPANI_A, '..x. .... ..x. ..x.'],
          [OrchestraPiece.SNARE, 'Fgggxggg Xgggxggg Fgggxggg Xgggxggg'],
        ],
        fill: [
          [OrchestraPiece.SNARE, 'xxxx'],
          [OrchestraPiece.TIMPANI_D, 'xxxxxxxx ........ ........ ........'],
          [OrchestraPiece.TIMPANI_C, '........ xxxxxxxx ........ ........'],
          [OrchestraPiece.TIMPANI_A, '........ ........ xxxxxxxx ........'],
          [OrchestraPiece.TIMPANI_G, '........ ........ ........ xxxxxxxX'],
        ],
        opening: [[OrchestraPiece.TIMPANI_G, 'X...'], [OrchestraPiece.TIMPANI_C, 'X...']],
      },
      {
        from: StormCategory.CAT5,
        bar: [
          [OrchestraPiece.TIMPANI_D, 'X... ..x. .... x...'],
          [OrchestraPiece.TIMPANI_C, '.... .... X... ....'],
          [OrchestraPiece.TIMPANI_A, '..x. .... ..x. ..x.'],
          [OrchestraPiece.SNARE, 'Dgggxgggxggg xgggxgggxggg Dgggxgggxggg xgggxgggxggg'],
        ],
        fill: [
          [OrchestraPiece.TIMPANI_D, 'xxxxxxxxxxxx ............ ............ ............'],
          [OrchestraPiece.TIMPANI_C, '............ xxxxxxxxxxxx ............ ............'],
          [OrchestraPiece.TIMPANI_A, '............ ............ xxxxxxxxxxxx ............'],
          [OrchestraPiece.TIMPANI_G, '...r'],
          [OrchestraPiece.SNARE, '...r'],
        ],
        opening: [[OrchestraPiece.TIMPANI_G, 'X...'], [OrchestraPiece.TIMPANI_C, 'X...']],
      },
    ],
  }),
});

// A tab as letters only, the spaces between its beats taken out.
function lettersOf(tab) {
  return tab.replaceAll(' ', '');
}

// How many strokes a beat a tab's grid holds.
function perBeatOf(tab) {
  return lettersOf(tab).length / BEATS_PER_BAR;
}

// Every kit keeps the mapping: a beat for each category in order, each bar and fill as finely split as its category
// calls for and no finer, fills and openings from where they begin, and well-formed tabs.
for (const [name, kit] of Object.entries(Kit)) {
  if (kit.beats.length !== STORM_CATEGORIES.length || kit.beats.some((beat, i) => beat.from !== STORM_CATEGORIES[i])) {
    throw new Error(`${name}: beats must climb every category in order`);
  }
  for (const beat of kit.beats) {
    if (Boolean(beat.fill) !== atLeast(beat.from, FILL_FROM) || Boolean(beat.opening) !== atLeast(beat.from, OPENING_FROM)) {
      throw new Error(`${name}: fills and openings must begin at the same categories as every kit's`);
    }
    for (const tabs of [beat.bar, beat.fill ?? [], beat.opening ?? []]) {
      for (const [, tab] of tabs) {
        const letters = lettersOf(tab);
        if (!Number.isInteger(perBeatOf(tab)) || [...letters].some((letter) => letter !== '.' && !Stroke[letter])) {
          throw new Error(`${name}: bad drum tab ${tab}`);
        }
      }
    }
    for (const tabs of [beat.bar, beat.fill].filter(Boolean)) {
      const finest = Math.max(...tabs.map(([, tab]) => perBeatOf(tab)));
      if (finest !== SUBDIVISION.get(beat.from)) {
        throw new Error(`${name}: ${beat.from.name} must split the beat into ${SUBDIVISION.get(beat.from)}, not ${finest}`);
      }
    }
  }
}

// Each beat's tabs as the composer plays them: the letters, and how many engine steps each letter's slot lasts.
const PLAYED = new Map(
  Object.values(Kit).flatMap((kit) =>
    kit.beats.flatMap((beat) =>
      [beat.bar, beat.fill, beat.opening].filter(Boolean).map((tabs) => [
        tabs,
        tabs.map(([piece, tab]) => {
          const letters = lettersOf(tab);
          return { piece, letters, slotSteps: STEPS_PER_BAR / letters.length };
        }),
      ]),
    ),
  ),
);

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

// A landfall: the gong, left to ring for `ringBars`, and a low tonic under it, both as loud as the wind the storm comes
// ashore with, from `velocity.calm` for calm air to `velocity.full` at full scale (intensityOf).
const LANDFALL = Object.freeze({
  gong: 60,
  bass: TONIC - 36,
  ringBars: 4,
  velocity: Object.freeze({ calm: 64, full: 127 }),
});

/** The gong's (and the bass's) velocity for a landfall with a wind of `kt`. */
export function landfallVelocity(kt) {
  const { calm, full } = LANDFALL.velocity;
  return calm + (full - calm) * intensityOf(kt);
}

/**
 * @typedef {Object} StormSong
 * @property {import('../../../tracks/domain/storm-track.js').StormTrack} track
 * @property {Object} kit one of Kit
 */

export class HurricaneComposer {
  instruments = Object.freeze([KIT_MIDDLE, KIT_RING, ...new Set(PARTS.map((part) => part.inst)), Instrument.GONG]);

  stepsPerBar = STEPS_PER_BAR;
  stepSec = STEP_SEC;

  /** @param {StormSong} song */
  setSong(song) {
    this.kit = song.kit;
    this.track = song.track;
  }

  /** Back to the opening state, as the music starts. */
  reset() {
    this.kitDue = true;
    this.chordIndex = -1;
    this.chordBars = 0;
    this.chordBar = 0;
    this.chord = PROGRESSION[0];
    this.category = StormCategory.DEPRESSION;
    this.beat = this.kit.beats[0];
    this.held = new Set();
    this.spin = 0;
    this.spinRate = null;
    this.checkedUntil = null;
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
    if (step === 0) this.startBar(stepSec);
    this.spinRate = easeSpin(this.spinRate, spinOf(intensityOf(sample.windKt)), stepSec);
    this.spin += stepSec * this.spinRate;
    this.playKit(music, step, at, stepSec);
    this.playParts(music, step, at);
    this.playLandfalls(music, time, at, stepSec, stepMs);
  }

  // Moves on a bar. A chord lasts as many bars as CHORD_MIN_SEC takes.
  startBar(stepSec) {
    if (this.chordBar + 1 >= this.chordBars) {
      this.chordIndex = (this.chordIndex + 1) % PROGRESSION.length;
      this.chordBars = Math.max(1, Math.ceil(CHORD_MIN_SEC / (STEPS_PER_BAR * stepSec) - 1e-9));
      this.chordBar = 0;
    } else {
      this.chordBar++;
    }
    this.chord = PROGRESSION[this.chordIndex];
    this.phraseStarts = this.chordIndex === 0 && this.chordBar === 0;
    this.phraseEnds = this.chordIndex === PROGRESSION.length - 1 && this.chordBar === this.chordBars - 1;
    this.beat = this.kit.beats.findLast((beat) => atLeast(this.category, beat.from));
    this.held.clear();
  }

  // The kit's ringing pieces panned to the storm's turn every step, and the strokes the bar's beat writes into this
  // step, each at its place in the step on its tab's grid, its grace strokes just before it.
  playKit(music, step, at, stepSec) {
    music.control(KIT_RING, CC.PAN, Math.round(64 + 63 * Math.cos(this.spin)), at);
    const { bar, fill, opening } = this.beat;
    const tabs = [...PLAYED.get(this.phraseEnds && fill ? fill : bar), ...(this.phraseStarts && opening ? PLAYED.get(opening) : [])];
    for (const { piece, letters, slotSteps } of tabs) {
      const channel = piece.ring ? KIT_RING : KIT_MIDDLE;
      for (let k = Math.ceil(step / slotSteps - 1e-9); k * slotSteps < step + 1 - 1e-9; k++) {
        const stroke = Stroke[letters[k]];
        if (!stroke) continue;
        const when = at + (k * slotSteps - step) * stepSec;
        if (stroke.roll) {
          this.playRoll(music, channel, piece.key, k * slotSteps, when, slotSteps, stepSec);
          continue;
        }
        const steps = Math.min(1, slotSteps);
        for (let g = stroke.grace; g > 0; g--) music.note(channel, piece.key, GRACE.velocity, when - g * GRACE.sec, steps);
        music.note(channel, piece.key, stroke.velocity, when, steps);
      }
    }
  }

  // A roll through a slot `slotSteps` long starting `from` steps into the bar, at ROLL's pace, as loud as its place in
  // the bar's swell.
  playRoll(music, channel, key, from, at, slotSteps, stepSec) {
    const count = Math.max(1, Math.round(slotSteps * stepSec * ROLL.perSec));
    for (let k = 0; k < count; k++) {
      const place = (from + (k / count) * slotSteps) / STEPS_PER_BAR;
      music.note(channel, key, ROLL.from + (ROLL.to - ROLL.from) * place, at + (k / count) * slotSteps * stepSec, slotSteps / count);
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
      } else if (step % (STRING_EVERY * part.slower) === 0) {
        const every = STRING_EVERY * part.slower;
        const tones = [0, 12].flatMap((octave) => this.chord.map((tone) => tone + octave));
        const count = step / every;
        const accented = STRING_GROUPS.accents.includes(count % STRING_GROUPS.every);
        const midi = TONIC + part.circle + tones[CIRCLE[(count + part.turn) % CIRCLE.length]];
        music.note(part.inst, midi, part.velocity + (accented ? STRING_GROUPS.accent : 0), at, every);
      }
    }
  }

  // A landfall within this step sounds the moment it happens, the step lasting `stepSec` and covering `stepMs`. Each
  // step picks up where the last one's window ended, so jitter in the clock neither drops nor repeats a landfall; after
  // a jump (a seek) it starts afresh.
  playLandfalls(music, time, at, stepSec, stepMs) {
    const contiguous = this.checkedUntil !== null && Math.abs(time - this.checkedUntil) < stepMs;
    const start = contiguous ? this.checkedUntil : time;
    const end = time + stepMs;
    this.checkedUntil = end;
    const { landfalls, landfallKt } = this.track;
    for (const [i, landfall] of landfalls.entries()) {
      if (landfall < start || landfall >= end) continue;
      const when = at + (Math.max(0, landfall - time) / stepMs) * stepSec;
      const velocity = landfallVelocity(landfallKt[i]);
      music.note(Instrument.GONG, LANDFALL.gong, velocity, when, LANDFALL.ringBars * STEPS_PER_BAR);
      music.note(Instrument.DOUBLE_BASS, LANDFALL.bass, velocity, when, STEPS_PER_BAR);
    }
  }
}
