// Composer for the forest album, made to be followed by ear alone: the Earth turns once under the noon line, and every
// tree it passes is one note: it starts when the tree starts to grow on the globe and lasts as long as the tree takes to
// grow (forest-trees.js, the one list of trees the globe and the music share).
//
//   voices: north (23–52° N) on flute; tropics on the track's lead; south on cello, instruments that hold a note.
//     A tree's height sets pitch and loudness; a dense forest is many trees, so many notes at once.
//   landmarks: the sea is a wave; a bell marks each continent; a woodblock ticks every 30°.
//   legend (the first track): ten bars that explain the mappings while the line is already moving.
//
// D dorian in 3/4 at 120 beats a minute: a step is a sixteenth (noon-line.js STEP_SEC) and a degree of longitude.

import { Instrument } from '../instruments.js';
import { Band, LEGEND_STEPS, LINE_STEPS, REGIONS, STEP_SEC, bandAt, lineLonAt } from '../../../tracks/domain/noon-line.js';
import { startOffsetSec } from '../../../tracks/domain/forest-trees.js';

const STEPS_PER_BAR = 12;
const SCALE = [0, 2, 3, 5, 7, 9, 10]; // D dorian, above D

const VOICES = Object.freeze({
  [Band.NORTH]: { instrument: Instrument.FLUTE, lowNote: 74 }, // D5
  [Band.TROPICS]: { instrument: null, lowNote: 62 }, // D4 — track lead
  [Band.SOUTH]: { instrument: Instrument.CELLO, lowNote: 50 }, // D3
});
const HEIGHT_RANGE_M = Object.freeze({ low: 4, high: 24 });
const HEIGHT_DEGREES = 10;
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

/** How loud and how high a voice plays forest `heightM` tall: 0 at the low end of the range to 1 at the top. */
function heightShare(heightM) {
  return clamp((heightM - HEIGHT_RANGE_M.low) / (HEIGHT_RANGE_M.high - HEIGHT_RANGE_M.low), 0, 1);
}

const LAND_BELLS = new Map(REGIONS.filter((r) => r.land).map((region, i) => [region, BELL_NOTES[i % BELL_NOTES.length]]));
const REGION_STARTS = new Map(REGIONS.map((region) => [Math.round(lineLonAt(0) - region.fromLon), region]));

export class NoonComposer {
  instruments = Object.freeze([
    Instrument.HARP,
    Instrument.CELLO,
    Instrument.FLUTE,
    Instrument.SEASHORE,
    Instrument.TUBULAR_BELLS,
    Instrument.WOODBLOCK,
  ]);

  stepSec = STEP_SEC;
  stepsPerBar = STEPS_PER_BAR;

  /**
   * @param {{ line: import('../../../tracks/domain/noon-line.js').NoonLine, treesByStep: Map<number, Object[]>,
   *   lead: Object, legend: boolean }} song
   */
  setSong(song) {
    this.song = song;
    this.voices = { ...VOICES, [Band.TROPICS]: { ...VOICES[Band.TROPICS], instrument: song.lead } };
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
      this.playVoice(music, this.voices[tree.band], tree.metres, at + startOffsetSec(tree), tree.growSec / STEP_SEC);
    }
    const sounding = Object.keys(this.voices).some((band) => bandAt(this.song.line, band, lineStep));
    if (!sounding && lineStep % STEPS_PER_BAR === 0) music.note(Instrument.SEASHORE, SEA.note, SEA.velocity, at, STEPS_PER_BAR);
  }

  playVoice(music, voice, heightM, at, steps) {
    const share = heightShare(heightM);
    const degree = Math.round(share * HEIGHT_DEGREES);
    const velocity = VELOCITY.low + share * (VELOCITY.high - VELOCITY.low);
    music.note(voice.instrument, noteAt(voice.lowNote, degree), velocity, at, steps);
  }

  playLegend(music, step, at) {
    const lead = this.voices[Band.TROPICS];
    if (step < 30) {
      if (step % 2 === 0) this.playVoice(music, lead, HEIGHT_RANGE_M.low + ((HEIGHT_RANGE_M.high - HEIGHT_RANGE_M.low) * step) / 28, at, 2);
    } else if (step < 60) {
      const every = step < 42 ? 4 : step < 50 ? 2 : 1;
      if ((step - 30) % every === 0) this.playVoice(music, lead, 14, at, every);
    } else if (step < 90) {
      const voice = step < 70 ? this.voices[Band.NORTH] : step < 80 ? lead : this.voices[Band.SOUTH];
      if (step % 2 === 0) this.playVoice(music, voice, 6 + (step % 10), at, 2);
    } else if (step === 90) {
      music.note(Instrument.SEASHORE, SEA.note, SEA.velocity + 15, at, STEPS_PER_BAR);
    } else if (step === 100) {
      music.note(Instrument.TUBULAR_BELLS, BELL_NOTES[0], BELL_VELOCITY, at, STEPS_PER_BAR);
    } else if (step === 110) {
      music.note(Instrument.WOODBLOCK, TICK.note, TICK.loudAtStart, at, 1);
    }
  }
}
