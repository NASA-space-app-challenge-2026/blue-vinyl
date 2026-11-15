// Composer for the forest album, made to be followed by ear alone: the Earth turns once under the noon line, and every
// tree it passes is one note: it starts when the tree starts to grow on the globe and lasts as long as the tree takes to
// grow (forest-trees.js, the one list of trees the globe and the music share).
//
//   voices: a tree's kind (its height class, the colour of the tree on the globe) is its instrument, one that holds a
//     note: cello, viola, violin, flute and oboe from the lowest class up, each in a higher register. Inside its class a
//     taller tree plays a higher note; the taller the tree, the louder. A dense forest is many trees, so many notes.
//   landmarks: the sea is a wave; a bell marks each continent; a woodblock ticks every 30°.
//   legend (the first track): ten bars that explain the mappings while the line is already moving.
//
// D dorian in 3/4 at 120 beats a minute: a step is a sixteenth (noon-line.js STEP_SEC) and a degree of longitude.

import { Instrument } from '../instruments.js';
import { BANDS, LEGEND_STEPS, LINE_STEPS, REGIONS, STEP_SEC, bandAt, lineLonAt } from '../../../tracks/domain/noon-line.js';
import { TREE_KINDS, TreeKind, kindOf, startOffsetSec } from '../../../tracks/domain/forest-trees.js';

const STEPS_PER_BAR = 12;
const SCALE = [0, 2, 3, 5, 7, 9, 10]; // D dorian, above D

// Each kind of tree its instrument and the note it plays at the bottom of its class: the classes climb the scale together.
const KIND_VOICES = Object.freeze({
  [TreeKind.GREEN]: { instrument: Instrument.CELLO, lowNote: 50 }, // D3
  [TreeKind.TEAL]: { instrument: Instrument.VIOLA, lowNote: 55 }, // G3
  [TreeKind.SKY]: { instrument: Instrument.VIOLIN, lowNote: 62 }, // D4
  [TreeKind.SILVER]: { instrument: Instrument.FLUTE, lowNote: 69 }, // A4
  [TreeKind.GOLD]: { instrument: Instrument.OBOE, lowNote: 74 }, // D5
});
// Loudness follows a tree's height over this range (m); pitch follows it over its class, in this many scale steps.
const HEIGHT_RANGE_M = Object.freeze({ low: 4, high: 24 });
const KIND_DEGREES = 4;
const VELOCITY = Object.freeze({ low: 50, high: 115 });

const SEA = Object.freeze({ note: 60, velocity: 45 });
const TICK = Object.freeze({ everyDeg: 30, note: 76, velocity: 50, loudAtStart: 80 });
const BELL_NOTES = Object.freeze([62, 69, 65, 72, 67]);
const BELL_VELOCITY = 85;
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function noteAt(lowNote, degree) {
  return lowNote + 12 * Math.floor(degree / SCALE.length) + SCALE[degree % SCALE.length];
}

/** How loud a tree `heightM` tall plays: 0 at the low end of the range to 1 at the top. */
function heightShare(heightM) {
  return clamp((heightM - HEIGHT_RANGE_M.low) / (HEIGHT_RANGE_M.high - HEIGHT_RANGE_M.low), 0, 1);
}

const LAND_BELLS = new Map(REGIONS.filter((r) => r.land).map((region, i) => [region, BELL_NOTES[i % BELL_NOTES.length]]));
const REGION_STARTS = new Map(REGIONS.map((region) => [Math.round(lineLonAt(0) - region.fromLon), region]));

export class NoonComposer {
  instruments = Object.freeze([
    ...TREE_KINDS.map(({ kind }) => KIND_VOICES[kind].instrument),
    Instrument.SEASHORE,
    Instrument.TUBULAR_BELLS,
    Instrument.WOODBLOCK,
  ]);

  stepSec = STEP_SEC;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {{ line: import('../../../tracks/domain/noon-line.js').NoonLine, treesByStep: Map<number, Object[]>,
   *   legend: boolean }} song
   */
  setSong(song) {
    this.song = song;
  }

  reset() {}

  /**
   * @param {import('./flock.js').Music} music
   * @param {{ time: number, at: number }} now  `time` is the track's own time in ms (the song's data clock)
   */
  playStep(music, { time, at }) {
    const step = Math.round(time / 1000 / STEP_SEC);
    if (step < 0 || step >= LINE_STEPS) return;
    // The noon line and the globe move from step 0; the legend (if any) only explains on top.
    if (this.song.legend && step < LEGEND_STEPS) this.playLegend(music, step, at);
    this.playLine(music, step, at);
  }

  playLine(music, lineStep, at) {
    const region = REGION_STARTS.get(lineStep);
    if (region && LAND_BELLS.has(region)) music.note(Instrument.TUBULAR_BELLS, LAND_BELLS.get(region), BELL_VELOCITY, at, STEPS_PER_BAR);
    if (lineStep % TICK.everyDeg === 0) {
      music.note(Instrument.WOODBLOCK, TICK.note, lineStep === 0 ? TICK.loudAtStart : TICK.velocity, at, 1);
    }
    // Each tree that starts to grow in this step plays where it starts, for as long as it grows.
    for (const tree of this.song.treesByStep.get(lineStep) ?? []) {
      this.playTree(music, tree.metres, at + startOffsetSec(tree), tree.growSec / STEP_SEC);
    }
    const sounding = BANDS.some((band) => bandAt(this.song.line, band, lineStep));
    if (!sounding && lineStep % STEPS_PER_BAR === 0) music.note(Instrument.SEASHORE, SEA.note, SEA.velocity, at, STEPS_PER_BAR);
  }

  /** A tree `heightM` tall: its class's instrument, a note up its class with its height, held `steps` (as long as it grows). */
  playTree(music, heightM, at, steps, degreeOverride = null) {
    const { kind, fromM, toM } = kindOf(heightM);
    const voice = KIND_VOICES[kind];
    const inClass = clamp((heightM - fromM) / (toM - fromM), 0, 1);
    const degree = degreeOverride ?? Math.round(inClass * KIND_DEGREES);
    const velocity = VELOCITY.low + heightShare(heightM) * (VELOCITY.high - VELOCITY.low);
    music.note(voice.instrument, noteAt(voice.lowNote, degree), velocity, at, steps);
  }

  playLegend(music, step, at) {
    if (step < 60) {
      // The five classes in turn, twelve steps each, climbing from the bottom of the class to its top.
      const local = step % 12;
      if (local % 2 === 0) this.playTree(music, TREE_KINDS[Math.floor(step / 12)].fromM, at, 2, Math.round((local / 10) * KIND_DEGREES));
    } else if (step < 90) {
      // A forest thickening: one tree, then two, up to five growing at once.
      const count = 1 + Math.floor((step - 60) / 6);
      if (step % 2 === 0) for (let i = 0; i < count; i++) this.playTree(music, TREE_KINDS[1].fromM, at, 2, i);
    } else if (step === 90) {
      music.note(Instrument.SEASHORE, SEA.note, SEA.velocity + 15, at, STEPS_PER_BAR);
    } else if (step === 100) {
      music.note(Instrument.TUBULAR_BELLS, BELL_NOTES[0], BELL_VELOCITY, at, STEPS_PER_BAR);
    } else if (step === 110) {
      music.note(Instrument.WOODBLOCK, TICK.note, TICK.loudAtStart, at, 1);
    }
  }
}
